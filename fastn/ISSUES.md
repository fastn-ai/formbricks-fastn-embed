# Issues log: embedding fastn v2 into Formbricks

Every problem hit while embedding fastn into an existing open-source product, recorded as it happened. The point of the exercise (Khalid, launch-readiness sync, 25 Nov 2026) is to find what a new user would trip over and fix it before launch.

The log has two parts:
- **[Part 1: fastn issues](#part-1-fastn-issues)** (20): the platform, the hub and embed SDK, the MCP and its skills, the onboarding prompt and docs. **This is the part to act on.**
- **[Part 2: not fastn](#part-2-not-fastn-host-app-and-accounts)** (4): running Formbricks locally (mostly on Windows) and a Microsoft account limit. Kept for anyone repeating the exercise.

Issue numbers are in the order the issues were found and don't change, so links from other files (`FASTN_EMBED.md`, `PLAN.md`, `VERIFICATION.md`, `demo-script.md`) still work.

**Severity:** `blocker` stops the build · `high` costs real time, or a new user would likely give up · `medium` slows you down, but there is a workaround · `low` is polish.
**Area:** `platform` (fastn's API, workflows, triggers and the hosted hub), `embed-sdk`, `mcp` (the fastn MCP server and its connections), `docs` (docs and skills), `onboarding-prompt`, `formbricks` (the host app), `third-party`.

---

# Part 1: fastn issues

20 issues: 1 blocker, 3 high, 12 medium, 4 low. 15 are still open or to verify. Most severe first:

| # | Severity | Area | Step | Summary | Status |
|---|---|---|---|---|---|
| 10 | blocker | mcp | Build | After `/mcp` sign-in, every fastn platform call (even `whoami`) fails 403 "not a member of org personal_waqas-shah-fastn": the connection uses a shared credential, not the signed-in person | open |
| 14 | high | platform | Build | A unified widget's settings form can't supply a required field: `channel_id` is validated before the customer's saved channel is merged in, and reading the saved values needs the undocumented `fastn.config.getByWorkflow()` | worked around |
| 17 | high | platform | Build | Every app on a unified widget is required unless marked `optional`, so "Slack or Teams" asked for both; the skills never mention `optional` | fixed here |
| 23 | high | platform | Demo | The hosted hub never shows a unified integration's settings form: a customer can connect Slack or Google Docs but can't pick the channel or document, so the integration activates and then does nothing | worked around |
| 1 | medium | docs | Plan | "App event trigger" sounds like *my app's* events, but it means events from third-party apps; a product's own events go to a webhook trigger | open |
| 3 | medium | onboarding-prompt | Plan | "Connect your product" is required before go-live even for a one-way push (product → fastn → Slack) | to verify |
| 4 | medium | mcp | Setup | With several fastn connections in Claude, it is easy to build in the wrong workspace or as the wrong person | open |
| 5 | medium | platform | Plan | A widget holds 2 connectors on **every** plan (unified providers count one each), so "any app in the category" means two apps per widget, and the CRM needs a widget of its own | confirmed |
| 6 | medium | onboarding-prompt | Setup | Connecting Claude Code to fastn needs a new session, so the fit-check conversation is lost at the hand-off to the build | open |
| 8 | medium | docs | Build | Docs and the embed SDK recommend different token setups (HMAC + two keys vs one key with auto-registration) | open |
| 11 | medium | platform | Build | A second product in the same fastn workspace shares one hub: every widget shows to every customer (a Formbricks customer set up Beacon's integration by mistake), and `whoami` tells the agent to treat the first product ("Beacon") as fact | worked around |
| 15 | medium | platform | Build | Unified API calls are not mocked in `mockMode`, so a unified workflow can't be tested for apps you haven't connected (here Teams, Notion, Google Docs) | open |
| 18 | medium | platform | Build | `x-end-org-id` takes the partner's own customer id on the webhook URL, but workflow test calls answer 404 for it (they need `x-end-org-ref`), and `executeWorkflow` can't name a customer at all | open |
| 19 | medium | docs | Build | The build skill has no pattern for "one webhook URL for all customers, customer named in a header": its attach-trigger-to-widget and MULTI_TENANT steps don't fit it | open |
| 20 | medium | onboarding-prompt | Build | An unattended (overnight) build stalls on steps only a person can do: approval pages, OAuth connects, an API key that only the dashboard creates | open |
| 24 | medium | platform | Demo | The hub names connections "default" / "connection-1", never the account or workspace, so Acme's Slack went into the wrong (work) Slack workspace without anyone noticing | open |
| 2 | low | onboarding-prompt | Plan | The pinned onboarding link loads its skills from `main`, so the pinned prompt can run with different skill text | open |
| 13 | low | docs | Build | The `unified-api` skill names tools that don't exist in the MCP (`list_unified_categories`, `create_widget`…); the real ones are `fastnPlatform__listUnifiedCategories`, `fastnPlatform__createWidget`… | open |
| 16 | low | platform | Build | fastn's Slack app has no `channels:history` scope, so a test can't read a posted message back (only `chat.getPermalink` proves it exists) | open |
| 21 | low | platform | Build | With a tenant resolver, an event for a customer who set up only one of the two integrations is recorded as a failed dispatch (`no_installation`) for the other | open |

**Where to start:** #10 (the MCP can't act as the signed-in person), then the three that stop a customer finishing a unified integration on their own: #23 (the hub never shows the settings form), #14 (saved settings can't fill a required field) and #17 (every provider is required unless marked optional).

## Details

## 1. "App event trigger" is the wrong name for a product's own events
- **Step:** planning the "send an event" half of the embed.
- **What happened:** Khalid's model is "the product sends an event and fastn decides what to do". The natural thing to look for is something like "app events", and fastn has **App event triggers**. Those are for events *from* connected third-party apps (a HubSpot deal changed, a Cin7 order created). Events the host product sends must go to a **webhook trigger**: `POST https://webhooks.fastn.dev/prod/triggers/<org>/webhooks/<id>` with an `fsk_` key.
- **Expected:** the word a new user reaches for ("send my app's events to fastn") leads to the right piece.
- **Workaround:** use a webhook trigger. The embed onboarding doc has a "Send your product's events" section.
- **Suggested fix:** in the dashboard and docs, call the webhook trigger "Events from your product" (or similar), and add a "looking for your own product's events?" pointer on the App event trigger page.

## 2. Pinned onboarding prompt, unpinned skills
- **Step:** opening the link the engineer shared, `claude.ai/new?q=Fetch and follow … fastn-claude-plugins/636efc6…/agent-setup/prompt.md`.
- **What happened:** the prompt itself is pinned to commit `636efc6`, but it tells the agent to fetch the solution-architect skill and every reference from `…/main/…`. So a run today and a run next week use different skill text behind the same "pinned" link.
- **Expected:** the prompt and the files it loads come from the same version, or the link is unpinned.
- **Suggested fix:** use `main` everywhere, or pin everything to one commit.

## 3. "Connect your product" before go-live, even for a one-way flow
- **Step:** planning.
- **What happened:** the onboarding prompt says your product's connection "is needed before go-live". In this demo, data only flows *out* of Formbricks (survey response → Slack/Teams/CRM). Nothing writes back into Formbricks. Registering Formbricks as a connector means describing its API and auth in fastn, which is real extra work.
- **Expected:** a clear rule for when the product connector is needed (reading or writing the product's data) and when it isn't (the product only pushes events).
- **Status:** to verify during the build. If the go-live check really requires it, that is extra work for every push-only integration.
- **Build, 25 Nov:** both widgets were activated with no product connector, and the platform did not object. Nothing was deployed to Live or put through a release review, so the go-live check itself is still untested.

## 4. Several fastn connections in Claude: easy to build in the wrong place
- **Step:** connecting the AI tool to fastn.
- **What happened:** the Claude account used for this has three fastn connections. The "default" one is signed in as another team member with platform-admin rights on fastn's own platform org, not a customer workspace. Building there would create the demo in the wrong org, under someone else's name. The onboarding prompt does say to ask which workspace to use, but nothing in the tools shows who a connection is signed in as until you call `whoami`.
- **Expected:** each connection's name shows the workspace and the person behind it.
- **Workaround:** a fresh fastn account connected on its own, which is also what a real new user has.
- **Note:** mostly an internal-setup problem, but a partner whose team shares one Claude account would hit the same thing.

## 5. Two connectors per widget, on every plan
- **Step:** planning the widget.
- **What happened:** the Launch (free) plan reports `connectorsPerWidget: 2`. The obvious demo is "Slack *or* Teams, plus the customer's CRM", which needs at least 3 connectors in the widget (Slack, Teams, HubSpot).
- **Confirmed (build, 25 Nov):** `whoami` on the build account (Scale plan) returns `connectorsPerWidget: 2`, and the `integration_builder` skill (v36) says the limit is 2 on **every** plan (Launch, Growth, Scale, Enterprise) and "is not a pricing limit: paying more does not put more apps in one widget". It counts each provider of a unified entity separately. So a paid plan does not help, and the agent is told to split the work into one widget per integration without asking.
- **Why it matters for this exercise:** Khalid's point is "embed once, and it works for any app in a category". With unified messaging, one widget can offer Slack *and* Teams, which is exactly two. Adding Google Chat or Webex as a third choice would be refused (`403 quota_exceeded`, `dimension: "connectors_per_widget"`). The cap makes "any app in the category" mean "any two apps".
- **Plan for the demo:** widget 1 "Send survey responses to chat" with unified messaging (Slack + Teams). The CRM step, if built, is its own widget (HubSpot), with its own workflow on the same event.
- **Suggested fix:** count a unified entity as one connector on the widget (the customer still connects only one of them), or say in the docs why it is two and what to do for a category with more providers.

## 6. Connecting Claude Code to fastn breaks the conversation in two
- **Step:** Part 3.2 of the onboarding prompt ("Connect this AI tool to fastn").
- **What happened:** for Claude Code the prompt runs `claude mcp add … fastn https://mcp.fastn.dev/fastn-workspace`, then tells the user to *start a new Claude Code session*, type `/mcp` and authenticate. MCP tools only load at session start, so the new session has none of the fit-check conversation. The use case, the verdict and the build steps are all gone, and the user has to explain the product again.
- **Also:** the prompt adds the server at `--scope user` (every project). For someone who already has fastn connected elsewhere, that adds another fastn workspace to every session, and the agent then has to ask which one to use (issue 4). This build used `--scope local` (this project only).
- **Expected:** the build picks up where the fit check left off.
- **Workaround:** keep the plan in a file (the guide, `FASTN_EMBED.md`) so the new session can read it.
- **Suggested fix:** before the restart, have the prompt write the agreed design to a file in the project (for example `FASTN_PLAN.md`) and tell the new session to read it first. Suggest `--scope local` or `project` when a fastn server already exists.

## 8. Two different "recommended" ways to mint embed tokens
- **Step:** writing the Formbricks token route.
- **What happened:** the onboarding doc ("Embed the widget", parts 1 to 3) says to create an **Embed backend** key with **Verify caller identity (HMAC)** on, keep an identity secret, register every customer first with a *second* **Admin** key (`POST /api/v1/orgs`), and send `x-org-id`, `x-user-id` and `x-identity-hmac` when minting. The `@fastn-ai/embed/server` helper (`mintEmbedToken({ customerId, customerName })`) goes the other way: one key without HMAC, the customer named in the body, and the customer registered on first use (`createIfMissing`). Both are fine on their own, but an agent reading the docs and an agent reading the SDK README build different things, and the docs path needs two keys plus a secret before anything shows on screen.
- **Also:** npm has `@fastn-ai/embed` **0.8.0**, while the repo is at 0.9.0, so the README an agent finds on GitHub can be ahead of what `npm install` gives you.
- **Choice here:** the SDK path (one key, auto-registration). It's what an agent following the SDK takes, and it needs the fewest secrets. HMAC is a production hardening step.
- **Suggested fix:** one recommended path in both places: start simple (SDK, one key), then a clearly separate "harden for production" section (HMAC, Admin key for tiers and limits).

## 10. The fastn MCP connection can't act as the signed-in person
- **Step:** start of the fastn build. `integration_builder` (v36) says to call `whoami` first.
- **What happened:** `/mcp` → `fastn` (`https://mcp.fastn.dev/fastn-workspace`, local scope) → Authenticate reported "Signed in and connected". The gateway skill loaded fine. But every Fastn Workspace call on the default account fails, `whoami` included:
  > `403: You are not a member of org personal_waqas-shah-fastn. Name an org you belong to, or drop the x-fastn-target-org header to use your own. … so reconnecting won't help.`
  `connection list` shows why: in this gateway, "Fastn Workspace" is a **shared** connection whose default account "follows the fastn dashboard selection", next to two other shared accounts for other orgs ("Katana Customer", "Belami prod"). Skill download links name the gateway as `fastn-ai:katana`, fastn's own internal gateway. Most likely the sign-in picked up the fastn.ai account the browser was already signed in to (not verified: `whoami` is what would tell us). The calls then run with a shared credential, aimed at the signed-in person's selected org, which that credential isn't a member of.
- **Why it's a blocker:** `whoami` is the skill's Step 0 and it fails, so the agent cannot tell who it is, which org it would build in, or what plan applies. The other two accounts on the list belong to other orgs, so "just pick another `_connection`" would build in the wrong place (issue 4 again).
- **Also:** the error says "reconnecting won't help" and gives no other way out. And nothing after sign-in says which fastn account or org the connection is using.
- **Reported:** fastn feedback `FPI-ABKHY6H62Y`.
- **Workaround:** sign in to the fastn MCP as a separate (non-fastn.ai) account: sign out of app.fastn.dev first, or open the `/mcp` sign-in link in a private window.
- **Suggested fix:** the default account should act as the signed-in person in their own org; at the least, `whoami` should always answer and name the credential and org. Show the account and org on the sign-in page, with a "use another account" option.

## 11. Two products in one fastn workspace share one hub
- **Step:** start of the fastn build, after re-signing in to the MCP.
- **What happened:** the account the MCP signed in to was not fresh. It was an earlier hackathon workspace holding a full build for another product, "Beacon" (19 workflows, 7 active widgets, one installed customer). `whoami` returns that product as `product: { name: "Beacon", … }` with the hint "Use it as fact: do not ask for it again, do not research the product again". An agent that follows the hint literally builds for Beacon, not for Formbricks.
- **Why it matters:** a fastn workspace is one product. Widgets default to `allowedEndOrgIds: null` (every customer), so building Formbricks here means Acme's hub in Formbricks also lists Beacon's 7 integrations, and Beacon's customer sees the Formbricks ones. The only way apart is restricting widgets per customer, which means editing the other product's live widgets.
- **Decision:** with the user's OK, built next to Beacon with new slugs and changed nothing of Beacon's. The mixed hub is accepted for the demo.
- **What it led to (26 Nov):** opening the hub in Formbricks as Acme showed 9 integrations, 7 of them Beacon's. The user connected Notion and Google Docs in Beacon's *Postmortems* card ("Connect Google Docs or Notion…"), not in *Survey responses in Notion or Google Docs*. Survey responses would never have reached those apps, and nothing in the hub said it was the wrong integration.
- **Workaround (user's OK):** removed that Postmortems setup (its connections stay with Acme) and set `allowedEndOrgIds` on Beacon's 7 widgets to Beacon's one customer. Formbricks' Acme now sees only the two survey integrations; Beacon's customer still sees everything. The catch: `allowedEndOrgIds` is an **allowlist**, so a new Beacon customer won't see Beacon's integrations until it is added (or the list is set back to `null`).
- **No lever in the embed:** `@fastn-ai/embed` 0.8.0 can open one integration (`view: "app"` with `widgetId`) but has no option to show a chosen set, so the host app can't scope the hub to its own integrations.
- **Also:** Beacon's installed customer is called "Acme" (slug `acme`). When Formbricks registers its own Acme on first hub open, fastn gives it a random slug suffix (`provisionEndOrg`, `org.ts`), so the workspace ends up with two customers named "Acme", told apart only by their ids.
- **Suggested fix:** let one account hold several products (or make "new product" create a new workspace), and have `whoami` say when the request doesn't match the stored product instead of telling the agent to treat it as fact.

## 13. The unified-api skill uses tool names the MCP doesn't have
- **Step:** reading the `unified_api` skill (v3) before building a unified widget.
- **What happened:** the skill's tool table lists `list_unified_categories`, `get_unified_entity`, `list_unified_providers`, `query_unified`, `create_widget`, `update_widget`. The fastn MCP exposes `fastnPlatform__listUnifiedCategories`, `fastnPlatform__getUnifiedCatalogEntity`, `fastnPlatform__listUnifiedEntityProviders`, `fastnPlatform__createWidget`… An agent searching for the skill's names finds nothing.
- **Suggested fix:** use the MCP tool names in the skill, as `integration_builder` does.

## 14. A unified widget's settings form can't fill a required field
- **Step:** building the chat workflow on the unified `messaging/channel_message` entity, with the channel chosen per customer in the widget's settings form (`configForm`, key `channel` for Slack).
- **What happened:** the `unified-api` skill says the saved values "merge into the provider action input" when the run has an installation. Tested with a self-install whose settings hold `{ unifiedValues: { slack: { channel: "C…" } } }`:
  - `fastn.unified.messaging.channel_message.create({ text }, { provider: "slack", widgetId })` → `UNIFIED_VALIDATION_FAILED: Field "channel_id" is required`. The canonical body is validated **before** the saved values are merged, so a required canonical field can never come from the customer's settings.
  - Passing a placeholder `channel_id` → Slack `channel_not_found`. The saved value does not override what the code passes either.
- **What works:** `fastn.config.getByWorkflow()` (no argument) returns the run's installation settings, `{ unifiedValues: { slack: { channel: "C…" } } }`, so the workflow reads the channel itself and passes `channel_id` explicitly. This function is not in the skill's sandbox contract (only `get` and `getByTemplate` are); `fastn.config.getByInstallation(id)` returned `null` for the same installation.
- **Why it matters:** "pick a channel in the hub, and the unified call uses it" is the obvious way to build a per-customer chat integration, and it fails on the first required field. An agent following the skill would either hard-code the channel or give up.
- **Suggested fix:** merge the saved values before validating (mapping each connector field back to its canonical field), or document `fastn.config.getByWorkflow()` as the way to read a customer's settings in workflow code.

## 15. Unified API calls aren't mocked, so unconnected providers can't be tested
- **Step:** test cases for the two workflows, which write through `fastn.unified.*`.
- **What happened:** in a `mockMode` run, `fastn.unified.messaging.channel_message.create` and `fastn.unified.documents.document_content.create` refuse to run: "does not run in a mock-mode test run: unified calls are not mocked, so it would write to the provider. Run the test live to exercise it." Only `fastn.connector.*` calls have mock stubs.
- **Why it matters:** the point of the unified API is "one workflow, any provider", but each provider path can only be tested live, with a real connection to that app. Here that leaves the Teams, Notion and Google Docs paths untested until someone connects those apps. Only the paths that never reach the unified call (wrong event, no channel chosen) run in mock.
- **Suggested fix:** mock unified calls from the provider action's stubs (they already exist for `fastn.connector.*`), so each provider's mapping can be exercised without an account.

## 16. The Slack app can't read back what it posted
- **Step:** live test of the chat workflow: post, then read the message back to check the text.
- **What happened:** `conversations.history` fails with `missing_scope`, needed `channels:history`. fastn's Slack app has `chat:write`, `channels:read`, `im:history` and a few more, but not `channels:history`. `chat.getPermalink` works, so a test can prove the message exists but not what it says.
- **Workaround:** prove the message with its permalink, and check the text in the run's trace (the exact body sent).
- **Suggested fix:** add `channels:history` to fastn's Slack app, or document that tests can't read channel messages.

## 17. A unified widget asks for every provider unless each is marked optional
- **Step:** activating the two widgets ("Survey responses in Slack or Teams", "… in Notion or Google Docs").
- **What happened:** attaching a unified entity puts all its providers on the widget as `connectorRefs` with no `optional` flag. In the embed, an app without the flag is required (`packages/embed/src/headless/domain/requirements.ts`: "Unset means required"). So a customer with only Slack could not finish setting up "Slack or Teams". Beacon's existing unified "Postmortems" widget shows the effect in real data: its one customer connected **both** Google Docs and Notion.
- **Fix applied:** `updateWidget` with `connector_refs` setting `optional: true` on both apps of both widgets ("with every app optional, connecting any one is enough"). Unified refs and settings forms stayed intact.
- **Also:** the server's own activation check (`requiredConnectors` in `services/api/src/lib/widget-activation.ts`) ignores `optional`, so the dashboard may still call a customer with one app "configured" rather than "active". Read in source, not observed.
- **Suggested fix:** default a unified entity's providers to optional (the customer picks one), and mention `optional` in the `unified_api` and `integration_builder` skills.

## 18. Naming the customer: three headers, three behaviours
- **Step:** testing a run as a customer, the way the webhook trigger dispatches it.
- **What happened:**
  - Webhook URL: `x-end-org-id: <partner's own id for the customer>` is accepted and swapped for fastn's org id before dispatch (`services/event/src/routes/webhook-trigger.ts:900`, KAT-8587). This is what Formbricks sends.
  - `testSavedWorkflow` with the same header: `404 No customer found for x-end-org-id "fastn-probe-test-customer"`. It wants fastn's org id, or the partner's id in `x-end-org-ref`.
  - `executeWorkflow` (MCP): no header parameter at all, so a real execution can't be run as a customer from the agent.
- **Why it matters:** the same header means different things on different endpoints, and the 404 sends an agent hunting. An agent that tests with the id Formbricks actually sends would conclude the contract is broken.
- **Suggested fix:** accept the external ref in `x-end-org-id` everywhere (as the webhook does), and let `executeWorkflow` take the customer.

## 19. "One webhook URL for every customer" isn't a pattern in the build skill
- **Step:** binding the trigger and finishing the widgets.
- **What happened:** the skill says to flip per-customer connectors to `MULTI_TENANT` and to attach each trigger to the widget. For this design neither applies:
  - A workflow that only calls `fastn.unified.*` has an **empty connector manifest**, so there is nothing to flip. The customer's account is still used correctly (verified: a run as a test customer could not reach the partner's Slack).
  - Attaching the webhook trigger to the widgets would, as far as the code shows, give each customer's installation its own trigger instance, which is a different URL per customer. Formbricks needs one URL. The trigger stays at partner level, with a route `tenantResolver` on `x-end-org-id` that finds each customer's widget installation (`getInstallationByTargetAndTenant`, `services/event/src/store/db.ts:460`).
- **Also:** the way a workflow reads a customer's settings (`fastn.config.getByWorkflow()`, issue 14) only came out of trying things.
- **Suggested fix:** add "product events → one webhook, customer in a header" as a named pattern in the skill: trigger at partner level with a `tenantResolver`, widgets carry the workflows, the workflow reads settings with `getByWorkflow()`.

## 20. An unattended build stops wherever a person is needed
- **Step:** the user asked for the build to be finished overnight with the agent making its own decisions.
- **What happened:** the build itself went through, but every gate the platform puts in front of a human stayed shut:
  - **Test-case approval** is a browser page (`createTestCaseDraft` → review URL). The agent submitted the set and built on it, marked as unapproved, instead of waiting.
  - **Connecting apps** is OAuth in a browser (preview link or hub). Notion, Google Docs and Teams were never connected, so their write paths are untested.
  - **The `fsk_` API key** can only be created in the dashboard; no MCP tool does it. Without it the webhook can't be called, so the trigger's positive path is untested.
  - Turning off the trigger's API-key check for a few minutes of testing was **blocked by Claude Code's auto-mode safety check** ("Undermining Oversight"). The right call, but it leaves no way to test a key-protected trigger without a key.
- **Suggested fix:** an MCP tool to create a test API key, and a way to fire a webhook trigger from the MCP as the partner (as `sendTestAppEvent` does for app events).

## 21. A customer without one of the integrations shows failed deliveries
- **Step:** design of the shared trigger (one event, two workflows).
- **What happened (source read, not observed):** with a `tenantResolver`, dispatch looks up the customer's installation per route. When there is none, it skips the route and records the dispatch as `failed` with reason `no_installation` (`services/event/src/pipeline/dispatch-queue.ts:957`). A customer who turned on only the Slack integration will show a failed docs delivery for every survey response.
- **Suggested fix:** record "customer hasn't set this up" as skipped, not failed, or let a route say it applies only to customers with an installation.

## 23. The hub has no screen for a unified integration's settings
- **Step:** setting Acme up in Formbricks' hub (26 Nov), in the browser.
- **What happened:**
  - Clicking **Connect** on the Slack card opens "Connect Survey responses in Slack or Teams": a name, the accounts (Slack optional, Teams optional) and an Active switch. **Connect** activates the setup straight away.
  - The settings form saved on the widget (Slack channel, Teams team and channel, Notion page, Google Doc) never appears. It isn't shown after connecting or in the setup's edit dialog, and the Installations tab says "Configuration: Not configured" with nothing to click. It still says so after the values were saved through the API.
  - The hub also shows one card per **app** (Microsoft Teams, Slack, Google Docs, Notion), not per integration. Connecting Slack turned the Teams card into "Manage" as well.
- **In source:** the hosted hub's API client has `saveInstallationUnifiedValues` and `fetchUnifiedConfigOptions` (`apps/embed/src/api.ts`, around lines 1140–1160, fastn-platform checkout `1a716e58c` of 25 Nov), but no screen calls them.
- **Why it matters:** a unified integration that needs a choice can't be finished by a real customer. It activates as "healthy" and then skips every event (the workflow answers "no channel chosen"). Together with #14, a unified integration can't work for a customer without the partner's help.
- **Workaround:** set each customer's choice over MCP. `loadUnifiedConfigFieldOptions` runs the widget's options code against the customer's own connection to list the choices; `updateInstallationUnifiedValues` saves one. For Acme: the Google Doc "Acme survey log", itself created through Acme's own Google Docs connection.
- **Suggested fix:** show the unified settings form after connecting (and in the setup's edit dialog), using the endpoints that already exist. Treat a setup with a required setting missing as "needs setup", not active.

## 24. You can't tell which account a connection is
- **Step:** connecting Slack as Acme in the hub (26 Nov).
- **What happened:**
  - Slack's sign-in uses whichever Slack workspace is active in the browser. The Chrome profile used was signed in to the company's own Slack, so Acme's "Slack" connection went there. The only sign was the channel list it returned: 87 channels such as #general and #prod-incidents, not the hackathon workspace's #acme-alerts.
  - The hub labels connections "default" and "connection-1", never the Slack workspace, Google email or Notion workspace.
  - A second sign-in from another Chrome profile closed straight away ("The OAuth window closed without creating a connection — the user likely canceled or denied access"). The cause wasn't found.
  - The first Notion connection ("default") expired an hour after it was made (`needs_reauth`); the second ("connection-1") refreshes normally. The cause wasn't checked.
- **Why it matters:** a customer can send its data to the wrong workspace or account and not notice. For Slack, that means posts in a company channel.
- **Handling:** nothing was posted there. The setup and the connection were removed. Slack was then connected again from the Hackathon Chrome profile, and its channel list (#acme-alerts, #incidents, #social…) confirmed the hackathon workspace before the channel was set.
- **Suggested fix:** name each connection after its account (Slack team name, Google email, Notion workspace), and show that name in the accounts dropdown and on the Installations tab.

---

# Part 2: not fastn (host app and accounts)

Problems with Formbricks itself, Windows, or a third-party account. None of them needs a fastn change, except the small ask in #12.

| # | Severity | Area | Step | Summary | Status |
|---|---|---|---|---|---|
| 7 | medium | formbricks | Setup | Formbricks `main` (v6) needs Node 26 and ~15 dev containers (SpiceDB, Hub, vLLM…); pinned to 4.9.7 (4 containers) | worked around |
| 9 | low | formbricks | Setup | Formbricks 4.9.7's pinned MinIO image can no longer be pulled from Docker Hub; ran without it (uploads off) | worked around |
| 12 | high | third-party | Build | Microsoft Teams could not be connected without a work or school Microsoft 365 account. fastn ask: say so in the connect step; unified messaging has only Slack and Teams | worked around |
| 22 | medium | formbricks | Demo | Self-hosted Formbricks only lets the first admin sign up; everyone after that needs an invite (`/auth/signup` is a 404) | worked around |

## Details

## 7. Formbricks `main` is too heavy for a laptop demo (host app, not fastn)
- **Step:** running the chosen open-source app locally.
- **What happened:** Formbricks `main` (v6.x, Nov 2026) needs Node 26, pnpm 11 and a dev stack of ~15 containers (Postgres, SpiceDB permissions, an S3 store, Valkey, their "Hub" and its worker, a taxonomy service, Cube, and a vLLM server with a Qwen model). Too much for a 16 GB laptop, and none of it matters for embedding fastn. The first clone of `main` was also very slow.
- **Workaround:** pinned to release **4.9.7** (22 May 2026): Node 20+, pnpm 10, and four containers (Postgres, Mailhog, Valkey, MinIO). It has the same four built-in integrations (Slack, Notion, Google Sheets, Airtable), webhooks and the response pipeline we hook into. Cloned shallow and sparse (no `docs/`).
- **Lesson for picking a project:** check the dev stack (`docker-compose.dev.yml`, `engines`) of the version you clone, not just the README. A recent tag that is a few months old is often much lighter than `main`.

## 9. Formbricks 4.9.7's MinIO image is gone from Docker Hub (host app, not fastn)
- **Step:** `docker compose -f docker-compose.dev.yml up -d`.
- **What happened:** `minio/minio:RELEASE.2025-09-07T16-13-09Z` fails with "pull access denied … repository does not exist". Compose then cancels the other pulls, so nothing starts.
- **Workaround:** start only the services the demo needs: `docker compose -f docker-compose.dev.yml up -d postgres mailhog valkey`. MinIO is only for file uploads, and `.env` leaves the `S3_*` settings empty.
- **Also hit:** a sparse checkout that leaves out the top-level `patches/` folder breaks `pnpm install` (`ENOENT … patches/next-auth@4.24.13.patch`). Include `patches` in the sparse set. And on Windows, Git's system-wide `core.autocrlf=true` checks the bash scripts out with CRLF; set `core.autocrlf false` in the clone *before* checking out.
- **Windows, more generally:** Formbricks' package scripts use Unix shell syntax (`env X=… node`, `sh -c "pnpm …"`). pnpm runs scripts through `cmd.exe` by default, so they fail. They also call `pnpm` by name, so `corepack pnpm` alone isn't enough. It works with `npm_config_script_shell` pointing at Git Bash and a pnpm shim on PATH (`corepack enable --install-directory <dir> pnpm`). Also, `turbo run db:migrate:dev` does not build `@formbricks/logger` first; run Formbricks' own `go` task (`turbo run go`), which builds the packages and runs `db:setup`.
- **Windows, migrations:** Formbricks' migration runner (`packages/database/src/scripts/migration-runner.ts`) loads data migrations with `import("D:\…")`, which Node rejects on Windows (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). One-line fix: `import(pathToFileURL(modulePath).href)`. It is kept as its own commit on the `fastn-embed` branch, separate from the fastn changes.
- **Windows, migrations again:** the same runner empties a folder with `rm -rf <dir>/*` through `exec`, which fails on Windows paths. Replaced with `fs.rm` + `fs.mkdir` (same commit). After both fixes, all 158 migrations ran (~6.5 min).
- **Windows, `.env`:** `apps/web/.env` is a git **symlink** to `../../.env`. With `core.symlinks=false` (the Windows default) it checks out as a 10-byte text file, so Next.js starts with no `DATABASE_URL`, `ENCRYPTION_KEY` or `REDIS_URL` ("Invalid environment variables"). Creating a real symlink needs admin or Developer Mode; a hard link works: `cmd /c mklink /H apps\web\.env ..\..\.env` (after deleting the stub). Then `git update-index --assume-unchanged apps/web/.env`.
- **Take-away for the exercise:** on Windows, a fair share of the time went into making the *host app* run, not into fastn. For a demo, an app that runs with `docker compose up` (or developing inside WSL) saves an hour.

## 12. Microsoft Teams can't be connected without a work or school Microsoft 365 account (Microsoft, not fastn)
- **Step:** connecting the apps for the chat widget (Slack or Teams).
- **What happened:** the user could not connect Microsoft Teams. Posting to a Teams channel goes through Microsoft Graph, which generally needs a work or school (Entra ID) account; a personal Microsoft or Gmail sign-in can't post to channels. The exact error was not captured.
- **Why it matters:** the unified messaging category has exactly two providers, Slack and Teams. Without a Microsoft 365 tenant, the "switch from Slack to Teams with no code change" demo can't be shown, and a partner testing on personal accounts hits this first.
- **Workaround:** the chat widget still offers Slack and Teams (a customer with Teams can use it with no code change), but only Slack is tested. The "switch apps" moment moved to a second widget, **Notion or Google Docs** (unified documents, `document_content`), where both apps work with a personal account.
- **Suggested fix:** say in the connect step (and docs) that Teams needs a work or school account, and point to a test tenant option. More providers in unified messaging (Google Chat, Discord) would also help.

## 22. Only the first Formbricks admin can sign up; everyone else needs an invite (host app, not fastn)
- **Step:** someone else trying the local demo (26 Nov).
- **What happened:** after the first-run setup (`/setup/intro`, which creates the first admin and organization), `/auth/signup` answers **404**. Formbricks 4.9.7 shows the sign-up form only when `SIGNUP_ENABLED` (true in development) **and** multi-organization mode are on, and multi-organization is an enterprise-licence feature (`getIsMultiOrgEnabled`). Without a licence, sign-up works only with an invite link. There is no default or seeded user.
- **Workaround:**
  - log in as the admin created on the first visit (setup).
  - or, as that admin, invite yourself: **Organization settings → Members → Invite**. The invite email lands in Mailhog at http://localhost:8025; open the link to sign up.
- **For the demo:** the "customer" in the demo is the Formbricks *organization* (Acme), so one admin account is enough. Invite a second person only to show that a teammate sees the same connections (organization-level scope).
