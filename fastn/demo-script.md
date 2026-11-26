# Demo script: Formbricks × fastn

About 4 minutes. It shows a Formbricks customer (Acme) sending every completed survey response to its own Slack channel **and** its own Google Doc, set up inside Formbricks, while Formbricks itself only sends one event.

**Rehearsed end to end on 26 Nov 2026:** one response submitted in Formbricks appeared in Slack #acme-alerts and in the Google Doc "Acme survey log" about 12 seconds later.

**At a glance**
1. Formbricks' Integrations page: a separate hand-built integration for each app.
2. "Integrations by fastn" opens fastn's hub inside Formbricks.
3. Acme's two integrations: Slack → #acme-alerts, Google Docs → "Acme survey log".
4. Submit a survey response; it appears in Slack and in the doc.
5. The runs, as seen from inside Formbricks.
6. The whole Formbricks change is 10 files.

The three points to land:
- Acme picks and connects its own apps inside Formbricks. Formbricks has no Slack, Google Docs or Notion code for this.
- Formbricks sends **one** event per completed response; fastn delivers it to every app Acme turned on.
- Adding an app is a change in fastn, not a Formbricks release.

---

## Links

Open these in the **Hackathon** Chrome profile. The Google Doc and the Slack workspace belong to the hackathon account, so they won't open in your work profile.

| What | Link |
|---|---|
| Formbricks login (your admin account) | http://localhost:3000/auth/login |
| Formbricks Integrations page | http://localhost:3000/environments/cmwwfkufd000cx2fgyaf7a6ia/workspace/integrations |
| fastn hub inside Formbricks | http://localhost:3000/environments/cmwwfkufd000cx2fgyaf7a6ia/workspace/integrations/fastn |
| The survey, as respondents see it | http://localhost:3000/s/cmwxfwcf2000mx2fgxonzw3mi |
| The survey's responses in Formbricks | http://localhost:3000/environments/cmwwfkufd000cx2fgyaf7a6ia/surveys/cmwxfwcf2000mx2fgxonzw3mi/responses |
| Slack #acme-alerts (hackathon workspace) | https://app.slack.com/client/T0CDPNCF5ED/C0CDP18DQ74 |
| Google Doc "Acme survey log" | https://docs.google.com/document/d/1G33_NNUOz4pdrQRqBjot0OA8OC6sYvvFfHICORQ4K_k/edit |
| fastn dashboard (optional) | https://app.fastn.dev |

---

## Before you start

Allow 10 minutes.

- [ ] Formbricks is running: the login link above loads. If it doesn't, start it (FASTN_EMBED.md, section 1, step 5).
- [ ] You're logged in as the demo admin, in the Hackathon Chrome profile.
- [ ] The Integrations page shows the **Integrations by fastn** card as *Set up in the hub*. If it says *Not configured*, restart Formbricks.
- [ ] Open these tabs, left to right: Integrations page, Slack #acme-alerts, the Google Doc, and a terminal (Git Bash) in the project folder.
- [ ] Submit one **warm-up response** (scene 4's steps). The first run after Formbricks starts takes ~25 s while Next.js compiles; after that it's ~12 s.
- [ ] *(optional)* Delete the rehearsal messages in Slack and the old entries in the doc, so the new ones stand out.
- [ ] Mute Slack notifications. Use a new **private window** (Ctrl+Shift+N) for each survey response.

**What's already set up for Acme** (done on 26 Nov):

| Piece | State |
|---|---|
| Survey "Product feedback" | Published link survey from the *Net Promoter Score (NPS)* template: a 0–10 rating and "What made you give that rating?" |
| Integration "Survey responses in Slack or Teams" | Active. Slack (hackathon workspace) connected. Posts to **#acme-alerts** (the Fastn bot is already a member) |
| Integration "Survey responses in Notion or Google Docs" | Active. Google Docs (hackathon account) and Notion connected. Writes to the Google Doc **"Acme survey log"** |

---

## The script

### 1. The problem (0:00–0:30)
**Open:** the Integrations page.

**Say:** "This is Formbricks, an open-source survey tool. Each integration on this page (Slack, Notion, Google Sheets, Airtable) is code Formbricks wrote and has to maintain: its own OAuth app, its own API client, its own settings screen. Every new app a customer asks for means another one."

### 2. One card instead (0:30–1:00)
**Click:** **Manage** on the *Integrations by fastn* card. (Or open the hub link directly.)

**Show:** fastn's hub inside the Formbricks page. *Show: Connected* lists **Microsoft Teams**, **Slack**, **Google Docs** and **Notion**. (Teams shows because it shares the chat integration with Slack; Acme hasn't connected Teams.)

**Say:** "This card is the whole Formbricks side. Formbricks' server mints a short-lived token for this organization, and fastn's hub loads inside the page. Everything in this frame (the apps, the sign-ins, the settings) is fastn's. Acme is the customer here, and it has connected its own Slack, Google Docs and Notion."

### 3. Acme's integrations (1:00–1:30)
**Click:** **Manage** on the **Slack** card, then the **Installations** tab. Then **Back to list**, **Manage** on **Google Docs**, **Installations**.

**Show:** each setup **Active**: *Survey responses in Slack or Teams setup* with Slack under Connections; *Survey responses in Notion or Google Docs setup* with Notion and Google Docs.

**Say:** "Acme connected its own accounts, so messages and entries go out with Acme's permissions, into Acme's workspace: the #acme-alerts channel and the 'Acme survey log' doc."

*Don't click the pencil or "Not configured" on stage. The hub has no screen for choosing the channel or document yet; those choices were saved through fastn's API ([ISSUES.md #23](ISSUES.md)).*

### 4. A response lands in Slack and the doc (1:30–2:40)
**Do:**
1. Open a private window (Ctrl+Shift+N) and go to http://localhost:3000/s/cmwxfwcf2000mx2fgxonzw3mi
2. Click **9**, then **Next**.
3. Type "Faster exports would make my week" and click **Finish**. You see "Thank you!".
4. Switch to the Slack tab.

**Show:** after about 10–15 seconds, a message from the **Fastn** app in #acme-alerts:
- 📝 New response to **Product feedback**
- **How likely are you to recommend Acme App to a friend or colleague?** 9
- **What made you give that rating?** Faster exports would make my week
- **Open in Formbricks** (a link to the survey's responses)

Then switch to the Google Doc: the same response has been added:
```
Product feedback (2026-11-26 11:25 UTC)
How likely are you to recommend Acme App to a friend or colleague?: 9
What made you give that rating?: Faster exports would make my week
Response: http://localhost:3000/environments/…/surveys/cmwxfwcf2000mx2fgxonzw3mi/responses
```

**Say:** "When a response is completed, Formbricks sends one event to fastn: which organization, which survey, and the answers. fastn knows that's Acme and that Acme turned on Slack and Google Docs, so it posts to Acme's channel and writes to Acme's doc, each with Acme's own connection."

*(optional)* Click **Open in Formbricks** in Slack to land on the response.

### 5. What happened, from inside Formbricks (2:40–3:10)
**Click:** back on the hub, **Manage** on **Slack** (or **Google Docs**), **Workflows** tab.

**Show:** **Runs** went up by one, and the **Activity log** has a new **Succeeded** run: *Formbricks: post survey response to chat* (or *… add survey response to a Notion page or Google Doc*).

**Say:** "Acme can see every delivery right here: what ran, when, and whether it worked. Formbricks didn't build this screen either. Formbricks posts every customer's events to one fastn URL; fastn works out the customer, runs each integration that customer turned on, and ignores a repeat of the same response."

### 6. Wrap-up (3:10–3:40)
**Do:** in Git Bash: `git show --stat ':/Embed fastn'`

**Show:** 10 files and about 390 added lines. Most of it is the event builder and the lockfile; the hub page is under 50 lines.

**Say:** "That's the whole Formbricks change: a server action for the token, a page with the hub, and one event from the response pipeline. Slack, Google Docs, Notion and Teams didn't need any of it to change. Not shown today: Teams, which needs a work Microsoft 365 account, and a CRM step, which would be a third integration."

---

## If something goes wrong

| What you see | Likely cause | On stage |
|---|---|---|
| The card says *Not configured*, or **Manage** is greyed out | Formbricks didn't load `FASTN_API_KEY` | Restart Formbricks (a minute or two) |
| The hub shows "The integrations hub could not load" | Wrong API key, or no network | Click **Try again**; check the key in `.env` |
| Nothing in Slack or the doc after ~30 s | Formbricks only sends **finished** responses | Make sure you reached "Thank you!". Then check the hub's Activity log: a failed run shows its error |
| Still nothing | Formbricks didn't reach fastn | Run `fastn/send-test-event.sh cmwwfi7c60003x2fg4nxijspf` in Git Bash (prints `HTTP 202`); its message and entry are titled "Test: product feedback". Afterwards look for `fastn event accepted` in Formbricks' terminal |
| The doc entry arrives, the Slack message doesn't | The bot was removed from the channel | In #acme-alerts, type `/invite @Fastn` |
| The doc or Slack says you need access | You're in the work Chrome profile | Use the Hackathon profile |
| A run failed with "Reconnect Slack" / "Reconnect Google Docs" | Acme's sign-in expired | In the hub: the app → Manage → Installations → pencil → **+ Add** next to the app, sign in again (in Slack, pick the **hackathon** workspace top right), Save |

---

## After the demo

- Delete the demo messages in #acme-alerts and the entries in the Google Doc by hand.
- Responses stay in Formbricks; that's fine. Each new response is sent once.
- If Slack ever needs connecting again: sign-in uses whichever Slack workspace the browser is in, and the hub only names the account "default". Do it from the Hackathon profile and check the channel list afterwards ([ISSUES.md #24](ISSUES.md)). The channel is then set through the API ([ISSUES.md #23](ISSUES.md)).
