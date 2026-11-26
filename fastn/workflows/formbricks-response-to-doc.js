// Formbricks: add a finished survey response to the customer's Notion page or Google Doc.
//
// Runs once per `response.finished` event (same webhook trigger as the chat workflow). The
// trigger names the customer from the `x-end-org-id` header, so this run belongs to them.
//
// The customer picks Notion or Google Docs, and the page or document, in the hub (widget
// "Survey responses in Notion or Google Docs"). Those choices live on their installation as
//   { unifiedValues: { notion: { blockId }, googleDocs: { documentId } } }
// and are read with fastn.config.getByWorkflow(). The text is appended through the unified
// documents API (documents/document_content), the same call for both apps.
//
// Returns { ok, added, skipped, errors, errorDetails, results }; customer-side problems come
// back as skipped / errorDetails with a hint rather than a thrown error.

const EVENT = "response.finished";
const STATE_PREFIX = "formbricks-doc:v1:";
const MAX_ANSWER = 1000;
const MAX_CONTENT = 1900; // Notion caps one text block at 2000 characters

const errText = (e) => String((e && e.message) || e).slice(0, 400);
const str = (v) => (v === undefined || v === null ? "" : String(v));
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function tenantOf(ctx) {
  const h = ctx.headers || {};
  return ctx.endOrgId || h["x-jwt-end-org-id"] || h["x-end-org-id"] || null;
}

function chosenTargets(config) {
  const values = (config && config.unifiedValues) || {};
  const flat = {};
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith("ue_") && v && typeof v === "object") Object.assign(flat, v);
    else flat[k] = v;
  }
  const targets = [];
  if (flat.notion && flat.notion.blockId) targets.push({ provider: "notion", documentId: str(flat.notion.blockId) });
  if (flat.googleDocs && flat.googleDocs.documentId) targets.push({ provider: "googleDocs", documentId: str(flat.googleDocs.documentId) });
  return targets;
}

function validate(input) {
  if (!input || typeof input !== "object") return "no event body";
  if (input.event !== EVENT) return `not a ${EVENT} event (got ${JSON.stringify(input.event ?? null)})`;
  if (!input.response || !input.response.id) return "event has no response.id";
  if (!input.survey || !input.survey.name) return "event has no survey.name";
  return null;
}

function when(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

function entryText(input) {
  const r = input.response;
  const stamp = when(r.createdAt || input.occurredAt);
  const lines = [`${str(input.survey.name)}${stamp ? ` (${stamp})` : ""}`];
  const answers = (Array.isArray(r.answers) ? r.answers : []).filter((a) => a && str(a.question).trim() !== "");
  if (!answers.length) lines.push("No answers given.");
  for (const a of answers) lines.push(`${str(a.question).trim()}: ${clip(str(a.answer).trim(), MAX_ANSWER) || "(empty)"}`);
  if (r.contact && r.contact.email) lines.push(`From: ${r.contact.name ? `${r.contact.name} <${r.contact.email}>` : r.contact.email}`);
  if (r.url) lines.push(`Response: ${r.url}`);
  return clip(lines.join("\n"), MAX_CONTENT);
}

function hintFor(provider, message) {
  const app = provider === "notion" ? "Notion" : "Google Docs";
  if (/object_not_found|Could not find|404|not found/i.test(message) && !/UNIFIED_NO_CONNECTED_PROVIDER/.test(message)) {
    return provider === "notion"
      ? "Share the chosen page with the Fastn integration in Notion (page menu, Connections), or pick another page."
      : "The chosen document was deleted or is not shared with this Google account. Pick another document.";
  }
  if (/UNIFIED_NO_CONNECTED_PROVIDER|not connected|PROVIDER_AUTH|401|403/i.test(message)) return `Reconnect ${app} in the integration.`;
  return null;
}

export default async function (ctx) {
  const input = ctx.input || {};
  const result = { ok: true, added: 0, skipped: 0, errors: 0, errorDetails: [], results: [] };

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
    fastn.loki.info("event skipped", { reason: "no document chosen", tenant, responseId: input.response.id });
    return { ...result, skipped: 1, reason: "no page or document chosen: the customer has not finished setting up the integration" };
  }

  // Google Docs appends to the end of the body as is, so start each entry on a new paragraph.
  const text = entryText(input);
  for (const t of targets) {
    const key = `${STATE_PREFIX}${tenant}:${input.response.id}:${t.provider}`;
    if (await fastn.state.get(key)) {
      result.skipped += 1;
      result.results.push({ provider: t.provider, skipped: "already added" });
      continue;
    }
    const content = t.provider === "googleDocs" ? `\n${text}\n` : text;
    try {
      const rec = await fastn.unified.documents.document_content.create({ document_id: t.documentId, content }, { provider: t.provider });
      await fastn.state.set(key, { id: str(rec && rec.id), at: new Date().toISOString() });
      result.added += 1;
      result.results.push({ provider: t.provider, documentId: t.documentId, id: str(rec && rec.id) });
      fastn.loki.info("response added", { tenant, provider: t.provider, responseId: input.response.id });
    } catch (e) {
      const message = errText(e);
      result.errors += 1;
      result.errorDetails.push({ provider: t.provider, documentId: t.documentId, errorMessage: message, hint: hintFor(t.provider, message) });
      fastn.loki.error("append failed", { tenant, provider: t.provider, responseId: input.response.id, error: message });
    }
  }
  result.ok = result.errors === 0;
  return result;
}
