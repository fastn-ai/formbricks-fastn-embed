# fastn side: plan, contract and what was built

What runs in fastn so Formbricks can embed it. Written before the build as the hand-off between sessions ([ISSUES.md #6](ISSUES.md)), and updated with what was actually built on 25 Nov 2026.

> **Status (26 Nov):** works end to end: one survey response submitted in Formbricks appears in Acme's Slack #acme-alerts and in its Google Doc. The hub can't save a customer's channel or document choice, so it was set through the API ([ISSUES.md #23](ISSUES.md)). Demo: [demo-script.md](demo-script.md). Checklist and evidence: **[VERIFICATION.md](VERIFICATION.md)**.

## Who is who
| fastn term | In this demo |
|---|---|
| Organization (you, the SaaS company) | The fastn workspace `personal_601e7f1e285fecabd8e4` (a separate hackathon account). It also holds an earlier product, "Beacon" ([ISSUES.md #11](ISSUES.md)). Beacon's 7 widgets are limited to Beacon's own customer (`allowedEndOrgIds`), so Formbricks' customers see only the two survey integrations |
| Customer (end org) | One Formbricks **organization**, e.g. "Acme" (`cmwwfi7c60003x2fg4nxijspf`). fastn stores that id as the customer's external ref and creates the customer the first time someone from it opens the hub |
| User | The Formbricks user who opens the hub |

## What was built
| Piece | fastn id | Notes |
|---|---|---|
| Widget "Survey responses in Slack or Teams" | `wgt_2b5669170dc0` | Unified **messaging / channel_message**. Slack and Teams both `optional` (either is enough). Settings form: Slack channel, or Teams team + channel. Active |
| Widget "Survey responses in Notion or Google Docs" | `wgt_28c9bdb5b332` | Unified **documents / document_content**. Notion and Google Docs both `optional`. Settings form: Notion page, or Google Doc. Active |
| Workflow `formbricks-response-to-chat` | `wf_3c75c90301a9` | Posts the response to the chosen channel. Code: [workflows/formbricks-response-to-chat.js](workflows/formbricks-response-to-chat.js) |
| Workflow `formbricks-response-to-doc` | `wf_295dddf387cb` | Appends the response to the chosen page or doc. Code: [workflows/formbricks-response-to-doc.js](workflows/formbricks-response-to-doc.js) |
| Webhook trigger "Formbricks response finished" | `33beaaf5-ff12-4801-820d-ca3090f361fc` | API-key auth; dedup on `response.id`; routes to both workflows, each with `tenantResolver: header x-end-org-id`. URL in `.env` as `FASTN_WEBHOOK_URL` |
| API key | (dashboard) | Created by hand in the dashboard; no MCP tool ([ISSUES.md #20](ISSUES.md)). In `.env` |
| Product connector (P5) | not built | Nothing writes back into Formbricks. Activation did not ask for it ([ISSUES.md #3](ISSUES.md)) |

### How a response gets to the customer's app
1. Formbricks POSTs the event (below) to the trigger URL with `x-api-key` and `x-end-org-id: <Formbricks organization id>`.
2. The trigger swaps the Formbricks id for fastn's customer id (it accepts the partner's own id here), dedups on the customer + `response.id`, and dispatches each route.
3. Each route's tenant resolver finds that customer's installation of the widget that carries the workflow. A customer without that integration is skipped for that route ([ISSUES.md #21](ISSUES.md)).
4. The workflow reads the customer's choices with `fastn.config.getByWorkflow()` → `{ unifiedValues: { slack: { channel } } }` (or `microsoftTeams: { teamId, channelId }`, `notion: { blockId }`, `googleDocs: { documentId }`), formats the text, and calls `fastn.unified.messaging.channel_message.create` / `fastn.unified.documents.document_content.create` with that provider. The call runs on the customer's own connection.
5. A per-customer, per-response state key stops a repeat post if the same event arrives twice.

### Changes from the original plan
- **Teams can't be tested** (no work or school Microsoft 365 account, [ISSUES.md #12](ISSUES.md)). The chat widget still offers Teams, but the "same embed, other app" demo moved to a second widget, **Notion or Google Docs**.
- **CRM step not built.** A widget holds 2 apps on every plan ([ISSUES.md #5](ISSUES.md)), so it would be a third widget. Left out to keep the demo to two integrations.
- **Instant tier, not Standard.** Each run makes one or two API calls (~1–2 s). Webhook dispatch is asynchronous anyway, so nobody waits on it.
- **The workflow reads the channel itself.** The plan assumed the hub's channel choice would flow into the unified call. It doesn't for a required field ([ISSUES.md #14](ISSUES.md)).
- **Test cases were not approved by a person before building** (the user asked for an unattended overnight build). They are on the review page `tcr_075c28e636e0` and attached to the workflows.

## The event Formbricks sends
`POST $FASTN_WEBHOOK_URL`

Headers:
```
content-type: application/json
x-api-key:     $FASTN_API_KEY
x-end-org-id:  <Formbricks organization id>       # fastn accepts our own id for the customer here
```

Body (`response.finished`, sent once per completed response):
```json
{
  "event": "response.finished",
  "occurredAt": "2026-11-25T17:00:00.000Z",
  "customer": { "id": "clx…orgId", "name": "Acme" },
  "survey":   { "id": "clx…surveyId", "name": "Product feedback", "type": "link" },
  "response": {
    "id": "clx…responseId",
    "createdAt": "2026-11-25T16:59:40.000Z",
    "url": "http://localhost:3000/environments/<envId>/surveys/<surveyId>/responses",
    "answers": [
      { "question": "How likely are you to recommend us?", "answer": "9" },
      { "question": "What should we improve?", "answer": "Faster exports" }
    ],
    "contact": { "email": "jane@acme.test", "name": "Jane Doe" }
  }
}
```
`contact` is `null` for anonymous link-survey responses.

Answers from fastn's trigger, as Formbricks' `sendFastnEvent` handles them: `2xx` accepted; `400 … is not a customer of this organization` when nobody from that Formbricks organization has opened the hub yet (logged at info level); `401` without a key.

## Formbricks environment variables
| Variable | What |
|---|---|
| `FASTN_API_KEY` | An `fsk_…` key from the fastn dashboard (a test key is fine). Server only, never sent to the browser. Set |
| `FASTN_BASE_URL` | `https://api.fastn.dev` |
| `FASTN_WEBHOOK_URL` | The trigger URL above (set) |

## Testing the trigger without Formbricks
[send-test-event.sh](send-test-event.sh) posts a Formbricks-shaped event with the key from `.env`:
```bash
NO_KEY=1 fastn/send-test-event.sh x                    # 401
fastn/send-test-event.sh not-a-customer                # 400 "is not a customer"
fastn/send-test-event.sh cmwwfi7c60003x2fg4nxijspf     # after Acme set up Slack in the hub: a message in its channel
```
