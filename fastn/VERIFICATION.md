# Verification report: Formbricks × fastn (fastn side)

**Verdict: PASS WITH BLOCKERS.** Posting a Formbricks survey response to the customer's Slack channel works end to end inside fastn: real messages landed in Slack and were cleaned up, a customer's chosen channel is read from their own setup, and one customer can't reach another's Slack. What isn't proven yet needs things only you can do: an API key for the webhook, and connecting Slack (and Notion or Google Docs) as Acme in the hub.

**Environment:** test (latest published versions; nothing deployed to Live) · **Verified:** 2026-11-25 19:38 UTC · **Workspace:** `personal_601e7f1e285fecabd8e4` (the hackathon account, next to Beacon) · **Workflows:** 2 · **Triggers:** 1 · **Widgets:** 2

## What's running

| Surface | Status | Evidence |
|---|---|---|
| Workflow `formbricks-response-to-chat` (`wf_3c75c90301a9`, v1 published) | PASS (Slack) | 10 of 12 cases pass; 4 live posts to #acme-alerts proved by permalink, then deleted. Teams cases blocked (no Microsoft 365 account) |
| Workflow `formbricks-response-to-doc` (`wf_295dddf387cb`, v1 published) | PASS (Google Docs) | Live end to end from Formbricks on 26 Nov: two survey responses appended to Acme's Google Doc "Acme survey log" (`exec_cfbba5281deb`, `exec_3d8715e2de06`, about 1.3 s each). Notion append not run live |
| Webhook trigger "Formbricks response finished" (`33beaaf5-…`) | PARTIAL | readback ACTIVE, 2 routes with `tenantResolver: header x-end-org-id`, dedup on `response.id`; no-key POST → **401** (TC-T04); unknown customer → **400** "is not a customer" (TC-T03); Acme → **202** accepted (TC-T01 ingest, 26 Nov). Delivery to Acme's apps waits on Acme's setup in the hub |
| Widget "Survey responses in Slack or Teams" (`wgt_2b5669170dc0`) | PASS | `active`, `UNIFIED` (messaging/channel_message), workflow attached, Slack + Teams both `optional` (either is enough), channel pickers saved; Slack picker run live against the workspace |
| Widget "Survey responses in Notion or Google Docs" (`wgt_28c9bdb5b332`) | PASS (config) | `active`, `UNIFIED` (documents/document_content), workflow attached, Notion + Google Docs both `optional`, page/document pickers saved (not run: no connection) |
| Per-customer settings | PASS | `fastn.config.getByWorkflow()` returns the run's installation `unifiedValues`; a run as a test customer (`x-end-org-ref` and `x-end-org-id` = fastn id) read *that* customer's channel |
| Customer isolation | PASS | the test customer had no Slack: the post failed `UNIFIED_NO_CONNECTED_PROVIDER` rather than going out through the partner's Slack; an installation pinning the partner's connection for a customer was refused (400) |

## Data parity: Formbricks event → Slack message

- **Message content (TC-C01, C08, C09):** the exact text sent is in the run trace: survey name in bold, each question in bold with its answer, `From Jane Doe (jane@acme.test)` when known, `<url|Open in Formbricks>`; `& < >` escaped; "No answers given." for an empty response.
- **Limits (TC-C10):** one answer cut to 1,000 characters ending in `…`; whole message capped at 3,500.
- **Duplicates (TC-C07):** a second delivery of the same `response.id` posts nothing (`skipped: "already posted"`). The trigger also dedups on `response.id` per customer (read in source, not yet exercised).
- **Read-back limit:** fastn's Slack app has no `channels:history`, so messages were proven by `chat.getPermalink`, not re-read (ISSUES #16).

## Failures

None open. Fixed during the build: both widgets required **every** provider (Slack *and* Teams); now each is `optional` (ISSUES #17).

## Blockers: needs you

- [x] **Create a fastn API key** and set `FASTN_API_KEY` in `.env` (done 26 Nov).
- [x] **Trigger tests:** no key → 401, `not-a-customer` → 400, Acme → 202 (26 Nov).
- [x] **As Acme in Formbricks:** Google Docs and Notion connected, and the docs integration (`inst_d017b908581f`) is active, writing to "Acme survey log". The hub has no settings screen, so that choice was set through the API (ISSUES #23). The first attempt went into Beacon's *Postmortems* card and was removed (ISSUES #11).
- [x] **End to end (Google Docs):** survey "Product feedback" published; a response appeared in the doc about 23 s later (the first run after start, mostly Formbricks compiling its pipeline route).
- [x] **Slack end to end:** after a first connection to the wrong workspace was removed (ISSUES #24), Acme connected the hackathon Slack (`inst_32358bf5ef18`, channel #acme-alerts set through the API). One Formbricks response then posted to #acme-alerts (`exec_00cc3fcf57ef`, `posted: 1`) and was added to the doc (`exec_f8fce16a7597`), about 12 s after Finish.
- [ ] **Review the test cases** at the review page (`tcr_075c28e636e0`); I built on them without your approval, as you asked.
- [ ] Optional: Teams needs a work or school Microsoft 365 account (TC-C02, C03).

## Coverage

| Flow | Cases | Pass | Blocked |
|---|---|---|---|
| Chat | 12 | 10 | 2 (Teams) |
| Documents | 8 | 4 (incl. Google Docs append, live from Formbricks) | 4 (Notion append and the limits not run live) |
| Trigger | 4 | 3 (TC-T01 ingest, T03, T04) | 1 (TC-T02: needs Acme's Slack setup) |

Verification note: unified calls can't run in mock mode (ISSUES #15), so every send/append case is live.

## Cleanup

- Deleted: all 5 test Slack messages in #acme-alerts (permalinks now `message_not_found`), every `formbricks-chat:v1:…` state key the tests set, the throwaway customer `fastn-probe-test customer` and its installation.
- **Kept on purpose** (test fixtures in your own org, so the suite can be replayed; delete with `deleteInstallation` when done): `inst_b0632c663700` (chat widget, #acme-alerts), `inst_f04c7204894e` (no channel), `inst_20035c2fed79` (#social, bot not a member), `inst_bef0ad7f15a9` (Teams chosen, not connected), `inst_ed03207370dc` (Notion page chosen, not connected).
- Nothing deployed to Live; no release review created (not needed for the demo).

## Next steps

Do the blockers above in order. After the first real Formbricks response, check the run under Activity → Executions (the chat run should show `posted: 1` for Acme).
