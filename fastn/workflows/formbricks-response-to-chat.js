// Formbricks: post a finished survey response to the customer's chat (Slack or Microsoft Teams).
//
// Runs once per `response.finished` event that Formbricks sends to the webhook trigger
// "Formbricks response finished". The trigger names the customer from the `x-end-org-id`
// header (the Formbricks organization id), so this run belongs to that customer.
//
// The customer picks the app and the channel in the hub (widget "Survey responses in Slack or
// Teams"). Those choices live on their installation as
//   { unifiedValues: { slack: { channel }, microsoftTeams: { teamId, channelId } } }
// and are read with fastn.config.getByWorkflow(). The message goes out through the unified
// messaging API (messaging/channel_message), the same call for Slack and Teams.
//
// Returns { ok, posted, skipped, errors, errorDetails, results } and never throws for a
// customer-side problem (no channel chosen, bot not in the channel): those come back as
// skipped / errorDetails with a hint.

const EVENT = "response.finished";
const STATE_PREFIX = "formbricks-chat:v1:";
const MAX_ANSWER = 1000; // characters per answer in the message
const MAX_MESSAGE = 3500; // characters per message

const errText = (e) => String((e && e.message) || e).slice(0, 400);
const str = (v) => (v === undefined || v === null ? "" : String(v));
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const slackEscape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tenantOf(ctx) {
  const h = ctx.headers || {};
  return ctx.endOrgId || h["x-jwt-end-org-id"] || h["x-end-org-id"] || null;
}

// The customer's choices, per provider. Accepts the flat shape and the legacy
// entity-nested one ({ [entityId]: { [slug]: {...} } }).
function chosenTargets(config) {
  const values = (config && config.unifiedValues) || {};
  const flat = {};
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith("ue_") && v && typeof v === "object") Object.assign(flat, v);
    else flat[k] = v;
  }
  const targets = [];
  const slack = flat.slack || {};
  if (slack.channel) targets.push({ provider: "slack", body: { channel_id: str(slack.channel) } });
  const teams = flat.microsoftTeams || {};
  if (teams.teamId && teams.channelId) {
    targets.push({ provider: "microsoftTeams", body: { team_id: str(teams.teamId), channel_id: str(teams.channelId) } });
  }
  return targets;
}

function validate(input) {
  if (!input || typeof input !== "object") return "no event body";
  if (input.event !== EVENT) return `not a ${EVENT} event (got ${JSON.stringify(input.event ?? null)})`;
  if (!input.response || !input.response.id) return "event has no response.id";
  if (!input.survey || !input.survey.name) return "event has no survey.name";
  return null;
}

function answersOf(input) {
  const list = Array.isArray(input.response.answers) ? input.response.answers : [];
  return list
    .filter((a) => a && str(a.question).trim() !== "")
    .map((a) => ({ question: str(a.question).trim(), answer: clip(str(a.answer).trim(), MAX_ANSWER) }));
}

function slackText(input) {
  const r = input.response;
  const lines = [`:memo: New response to *${slackEscape(str(input.survey.name))}*`];
  const answers = answersOf(input);
  if (!answers.length) lines.push("_No answers given._");
  for (const a of answers) lines.push(`*${slackEscape(a.question)}*`, slackEscape(a.answer) || "_(empty)_");
  if (r.contact && r.contact.email) {
    const who = r.contact.name ? `${slackEscape(str(r.contact.name))} (${slackEscape(str(r.contact.email))})` : slackEscape(str(r.contact.email));
    lines.push(`From ${who}`);
  }
  if (r.url) lines.push(`<${str(r.url)}|Open in Formbricks>`);
  return clip(lines.join("\n"), MAX_MESSAGE);
}

function plainText(input) {
  const r = input.response;
  const lines = [`New response to "${str(input.survey.name)}"`];
  const answers = answersOf(input);
  if (!answers.length) lines.push("No answers given.");
  for (const a of answers) lines.push(`${a.question}: ${a.answer || "(empty)"}`);
  if (r.contact && r.contact.email) lines.push(`From ${r.contact.name ? `${r.contact.name} <${r.contact.email}>` : r.contact.email}`);
  if (r.url) lines.push(`Open in Formbricks: ${r.url}`);
  return clip(lines.join("\n"), MAX_MESSAGE);
}

function hintFor(provider, message) {
  if (/not_in_channel/.test(message)) return "Invite the Fastn app to the channel (/invite @Fastn), then send again.";
  if (/channel_not_found/.test(message)) return "The chosen channel no longer exists or is private. Pick another channel in the integration's settings.";
  if (/UNIFIED_NO_CONNECTED_PROVIDER|not connected|PROVIDER_AUTH/i.test(message)) return `Reconnect ${provider === "slack" ? "Slack" : "Microsoft Teams"} in the integration.`;
  return null;
}

export default async function (ctx) {
  const input = ctx.input || {};
  const result = { ok: true, posted: 0, skipped: 0, errors: 0, errorDetails: [], results: [] };

  const invalid = validate(input);
  if (invalid) {
    fastn.loki.warn("event skipped", { reason: invalid });
    return { ...result, skipped: 1, reason: invalid };
  }
  const tenant = tenantOf(ctx);
  if (!tenant) {
    fastn.loki.warn("event skipped", { reason: "no customer", responseId: input.response.id });
    return { ...result, skipped: 1, reason: "no customer on the event (x-end-org-id)" };
  }

  const config = await fastn.config.getByWorkflow();
  const targets = chosenTargets(config);
  if (!targets.length) {
    fastn.loki.info("event skipped", { reason: "no channel chosen", tenant, responseId: input.response.id });
    return { ...result, skipped: 1, reason: "no channel chosen: the customer has not finished setting up the integration" };
  }

  for (const t of targets) {
    const key = `${STATE_PREFIX}${tenant}:${input.response.id}:${t.provider}`;
    if (await fastn.state.get(key)) {
      result.skipped += 1;
      result.results.push({ provider: t.provider, skipped: "already posted" });
      continue;
    }
    const text = t.provider === "slack" ? slackText(input) : plainText(input);
    try {
      const msg = await fastn.unified.messaging.channel_message.create({ ...t.body, text }, { provider: t.provider });
      await fastn.state.set(key, { messageId: str(msg && msg.id), at: new Date().toISOString() });
      result.posted += 1;
      result.results.push({ provider: t.provider, channelId: t.body.channel_id, messageId: str(msg && msg.id) });
      fastn.loki.info("response posted", { tenant, provider: t.provider, responseId: input.response.id });
    } catch (e) {
      const message = errText(e);
      result.errors += 1;
      result.errorDetails.push({ provider: t.provider, channelId: t.body.channel_id, errorMessage: message, hint: hintFor(t.provider, message) });
      fastn.loki.error("post failed", { tenant, provider: t.provider, responseId: input.response.id, error: message });
    }
  }
  result.ok = result.errors === 0;
  return result;
}
