# fastn embedded in Formbricks

This repository is [Formbricks](https://github.com/formbricks/formbricks) **4.9.7**, an open-source survey tool, with fastn v2 embedded. It was built the way a new fastn customer would do it: starting from fastn's onboarding prompt and building with an AI agent (Claude Code with the fastn MCP), not by hand.

How the repository is laid out:

- **`main`** is Formbricks 4.9.7 exactly as released (upstream tag `4.9.7`), in one commit.
- **Branch `fastn-embed`**, opened as a pull request against `main`, adds the integration in two commits:
  1. **Embed fastn.** The whole Formbricks side: 10 files, about 390 added lines. See it with `git show --stat ':/Embed fastn'`.
  2. **Guide.** This file and the [`fastn/`](fastn/) folder: the fastn side, the test report, the issues log and the demo script.
- **Branch `windows-dev-fixes`**, a separate pull request, fixes Formbricks' migration runner on Windows. It isn't part of the integration; you only need it to run Formbricks locally on Windows.

## Why this exists
At the launch-readiness sync on 25 Nov 2026, Khalid asked each of us to take an existing open-source SaaS app, embed fastn into it using the agents, and write down every hurdle. When he tried this himself, the agent treated fastn as a sign-in layer and called connector actions directly. The correct shape:

- The product **sends an event** ("a survey response came in"). fastn decides what happens next.
- The product's customer picks and sets up their apps **inside the product**, through the embedded fastn hub.
- Embed once, and it works for any app in a category. Turning on Teams instead of Slack needs no new code in the product.

Problems found along the way are in **[fastn/ISSUES.md](fastn/ISSUES.md)**. Part 1 lists the fastn issues, most severe first.

## What the demo shows
A Formbricks customer (say, Acme) opens **Configuration → Integrations → Integrations by fastn** in Formbricks, connects their own Slack *or* Microsoft Teams and picks a channel, and, separately, their Notion *or* Google Docs and picks a page. From then on, each survey response:

1. Formbricks sends one `response.finished` event to fastn. This is the only integration code in Formbricks.
2. A fastn workflow posts the response to Acme's channel through the **unified messaging** API, the same call for Slack and Teams.
3. A second workflow appends the same response to the Notion page or Google Doc Acme picked, through the **unified documents** API. Same event, no extra Formbricks code.

```
 Formbricks (host app)                         fastn                              Acme's apps
┌───────────────────────────┐   embed token   ┌──────────────────────────┐
│ Settings → Integrations   │◄────────────────│ Hub (iframe, @fastn-ai/  │
│   └─ fastn hub (iframe)   │  (minted by FB  │ embed): Acme connects    │
│                           │   backend)      │ Slack/Teams, picks a     │
│                           │                 │ channel                  │
│ Response pipeline         │  POST event     │ Webhook trigger          │     ┌──────────────┐
│   response.finished ──────┼────────────────►│   └─ workflow ───────────┼────►│ Slack / Teams│
│                           │  (fsk_ key,     │       unified messaging  │     └──────────────┘
│                           │   customer id)  │       unified documents  ├────►│ Notion/G Docs│
└───────────────────────────┘                 └──────────────────────────┘     └──────────────┘
```

Formbricks today ships separate, hand-built Slack, Notion, Google Sheets and Airtable integrations. This demo shows those replaced by one embed and one event.

## What's where
| Path | What it is |
|------|------------|
| `FASTN_EMBED.md` | This file: goal, design, setup, demo |
| `apps/web/modules/fastn/` | The Formbricks code: config, token action, hub panel, event builder |
| `fastn/ISSUES.md` | Every problem hit along the way, with severity and suggested fix. Part 1 is fastn issues (most severe first), Part 2 the host app and accounts |
| `fastn/PLAN.md` | The fastn side: what was built, how an event reaches the customer's app, and the event contract |
| `fastn/VERIFICATION.md` | What was tested in fastn, and what is still open |
| `fastn/workflows/` | Copies of the two fastn workflows (chat; Notion or Google Docs) |
| `fastn/send-test-event.sh` | Sends a Formbricks-shaped event to the fastn trigger, for testing without Formbricks |
| `fastn/demo-script.md` | The demo, scene by scene: what to click, what to say, and what to do if something breaks |
| `fastn/screenshots/` | What the integration looks like in Formbricks |

## Status
- [x] Formbricks 4.9.7 running locally (Postgres, Mailhog and Valkey in Docker; `turbo run go`), test organization "Acme"
- [x] Formbricks side: token action, "Integrations by fastn" card and page, `response.finished` event from the response pipeline ([screenshots](fastn/screenshots/))
- [x] fastn side built and tested: two unified widgets (Slack or Teams; Notion or Google Docs), two workflows, one webhook trigger ([fastn/PLAN.md](fastn/PLAN.md), [fastn/VERIFICATION.md](fastn/VERIFICATION.md))
- [x] As Acme: Slack, Google Docs and Notion connected; both integrations on, posting to #acme-alerts and writing to the Google Doc "Acme survey log". The channel and doc had to be set through the API ([#23](fastn/ISSUES.md)); the first Slack connection went to the wrong workspace ([#24](fastn/ISSUES.md))
- [x] End-to-end test (26 Nov): one "Product feedback" response submitted in Formbricks appeared in Slack #acme-alerts and in Acme's Google Doc about 12 s later
- [x] Demo script ([fastn/demo-script.md](fastn/demo-script.md)) and a narrated 1:23 demo video
- [ ] Onboarding prompt: run the "does fastn fit" check as a new user and record the answer
- [ ] Microsoft Teams (needs a work Microsoft 365 account, [#12](fastn/ISSUES.md)); Notion delivery not yet tested live

## Setup

### Prerequisites
- Node 22, pnpm (through `corepack enable`), Docker Desktop, git
- A fastn account (free Launch plan at https://app.fastn.dev/?signup=1) with the **Developer** role or higher
- A Slack workspace and/or a Microsoft Teams tenant, and a Notion or Google account, to test with

### 1. Run Formbricks locally
Commands are for Git Bash; on macOS or Linux drop the Windows-only lines. Formbricks 4.9.7 needs four containers; `main` (v6) is far heavier to run ([#7](fastn/ISSUES.md)).

```bash
# Windows only: keep LF line endings, or Formbricks' bash scripts break (#9)
git config --global core.autocrlf false

# 1. Clone, on the branch with the integration
git clone --branch fastn-embed https://github.com/fastn-ai/formbricks-fastn-embed.git
cd formbricks-fastn-embed
# Windows only: Formbricks' migration runner fails on Windows paths (#9); add the fix
git pull --no-rebase origin windows-dev-fixes

# 2. Dependencies (pnpm 10.32.1 through corepack)
corepack enable                                 # or: corepack enable --install-directory <dir on PATH> pnpm
pnpm install                                    # ~7 min

# 3. .env with generated secrets, then add the fastn settings (section 3 below)
pnpm dev:setup

# 4. Dev services. MinIO's pinned image is no longer on Docker Hub, so skip it (uploads off)
docker compose -f docker-compose.dev.yml up -d postgres mailhog valkey

# Windows only: apps/web/.env is a git symlink to ../../.env and checks out as a text stub.
#   Replace it with a hard link (no admin needed), then hide it from git:
rm apps/web/.env && cmd //c "mklink /H apps\web\.env .env" && git update-index --assume-unchanged apps/web/.env

# 5. Build the shared packages, run migrations, start Next.js on http://localhost:3000
#    (pnpm go also runs db:up, which fails on MinIO, so call turbo directly)
# Windows only: Formbricks' scripts use Unix shell syntax
export npm_config_script_shell="C:/Program Files/Git/bin/bash.exe"
pnpm exec turbo run go --concurrency 20
```

Then open http://localhost:3000. **The very first visit** runs Formbricks' setup, which creates the first admin and an organization. That organization is the fastn *customer*. **After that there is no public sign-up** (`/auth/signup` is a 404 without an enterprise licence, [#22](fastn/ISSUES.md)): log in at http://localhost:3000/auth/login → **Login with Email** with the admin you created, and invite anyone else under **Organization settings → Members** (the invite email lands in Mailhog at http://localhost:8025).

### 2. Set up fastn
Built with Claude Code through the fastn MCP, following fastn's `integration_builder` skill. Everything is listed with its ids in [fastn/PLAN.md](fastn/PLAN.md):

1. Connect Claude Code to fastn: `claude mcp add --transport http --scope local fastn https://mcp.fastn.dev/fastn-workspace`, then `/mcp` → `fastn` → Authenticate. Check `whoami` before building, and sign in from a browser that isn't already signed in to another fastn account ([#10](fastn/ISSUES.md)).
2. Two **unified** widgets, one per integration (a widget holds two apps, [#5](fastn/ISSUES.md)): *Survey responses in Slack or Teams* (messaging) and *Survey responses in Notion or Google Docs* (documents). Mark each app `optional` so a customer needs only one ([#17](fastn/ISSUES.md)). Each has a settings form where the customer picks the channel, page or document.
3. Two workflows, one per widget, that read the customer's choice with `fastn.config.getByWorkflow()` and send through the unified API ([#14](fastn/ISSUES.md)). Code: [fastn/workflows/](fastn/workflows/).
4. One webhook trigger, *Formbricks response finished*: API-key auth, dedup on `response.id`, a route to each workflow that finds the customer from the `x-end-org-id` header.
5. An API key (`fsk_…`) from the dashboard (Embed → API keys). There is no MCP tool for it ([#20](fastn/ISSUES.md)).

### 3. Wire fastn into Formbricks
Add to `.env` (server only; the key never reaches the browser):

```bash
FASTN_API_KEY=fsk_...                 # from fastn: Embed → API keys (mints embed tokens, calls the trigger)
FASTN_BASE_URL=https://api.fastn.dev  # default
FASTN_WEBHOOK_URL=https://webhooks.fastn.dev/prod/triggers/<workspace>/webhooks/<id>   # trigger → Copy URL
```

Restart `turbo run go` after editing `.env`.

**What changed in Formbricks** (commit "Embed fastn"; 3 edited files and 5 new ones under `apps/web`, plus the lockfile):

| File (under `apps/web`) | Change |
|------|--------|
| `modules/fastn/lib/config.ts` | *new*: reads the three settings above |
| `modules/fastn/actions.ts` | *new*: server action `getFastnEmbedTokenAction`. Checks the user may manage integrations, then `mintEmbedToken({ customerId: <organization id>, customerName, userId })`. fastn registers the customer the first time |
| `modules/fastn/components/fastn-hub-panel.tsx` | *new*: `<FastnHub getToken=…>` from `@fastn-ai/embed/react` |
| `app/(app)/environments/[environmentId]/workspace/integrations/fastn/page.tsx` | *new*: the "Integrations by fastn" page |
| `modules/fastn/lib/events.ts` | *new*: builds the `response.finished` event (contract in [fastn/PLAN.md](fastn/PLAN.md)) and POSTs it to the trigger with `x-api-key` and `x-end-org-id` |
| `images/fastn.svg` | *new*: card icon |
| `app/api/(internal)/pipeline/route.ts` | *edited*: one call, `sendFastnEvent(buildResponseFinishedEvent(…))`, next to Formbricks' own integrations when a response finishes |
| `app/(app)/environments/[environmentId]/workspace/integrations/page.tsx` | *edited*: the "Integrations by fastn" card |
| `package.json` | *edited*: `@fastn-ai/embed` 0.8.0 |

That is the whole integration on the Formbricks side. Slack, Teams, Notion and Google Docs are all handled in fastn.

## Demo (~4 min)
Full script, with every link to click, the setup checklist and fallbacks: **[fastn/demo-script.md](fastn/demo-script.md)**. Rehearsed end to end on 26 Nov.

1. **Before:** Formbricks' Integrations page, with a separate hand-built integration for each app.
2. **The embed:** the *Integrations by fastn* card opens fastn's hub inside Formbricks: Slack, Google Docs and Notion connected.
3. **Customer setup:** Acme's two integrations, active: Slack → #acme-alerts, Google Docs → "Acme survey log".
4. **Event:** submit a survey response; it appears in Slack and in the Google Doc within seconds.
5. **Visibility:** the runs show up in the hub's activity log, inside Formbricks.
6. **Wrap-up:** the whole Formbricks change is one commit of 10 files. Not shown: Teams (needs a work Microsoft 365 account, [#12](fastn/ISSUES.md)) and a CRM step (a third integration, [#5](fastn/ISSUES.md)).

## References
- fastn onboarding prompt (what a new user pastes into Claude): `fastn-ai/fastn-claude-plugins` → `agent-setup/prompt.md`
- fastn docs: https://docs.fastn.ai (embed: Build → Widget and embedding; triggers: Build → Triggers → Webhooks)
- Embed SDK: `@fastn-ai/embed` (React `FastnHub`, server helper `mintEmbedToken`)
