# Connecting Your Muse to COLORgenius

**What this is:** a one-time setup (~2 minutes) that lets your personal Muse
assistant work with your COLORgenius account — guided consultations, processing
reminders, and transformation posts.

**What this is not:** COLORgenius does not see your Muse conversations. Your Muse
connects to COLORgenius; COLORgenius never connects to your Muse.

---

## Step 1 — Get your API token

Your API token is what proves to COLORgenius that it's really you.

- **Pilot:** your token is issued by the COLORgenius team and shared with you
  securely. Keep it somewhere safe — like a password.
- **Later:** you'll be able to issue and revoke your own tokens from the
  COLORgenius dashboard (Settings → API tokens).

One token per stylist. Never share yours — it's tied to your account, your
formulations, and your clients.

## Step 2 — Ask Muse to connect

Open Muse (phone app or muse.ai) and send this message:

> Build a custom connector to COLORgenius using this API spec:
> https://YOUR_DEPLOYMENT_URL/openapi.json
> Then save it as a skill called "COLORgenius".

Muse will read the spec, build the connector, and test it — right in the chat.

## Step 3 — Enter your token securely

When Muse needs your credentials, it will show a **secure credential prompt**
(a system dialog, not the chat box).

- Paste your API token there and confirm.
- **Never paste your token into the chat itself.** Anything typed in chat stays
  in your conversation history. The credential prompt stores it in Muse's
  secure vault, where the agent itself can't even see the raw value.

## Step 4 — Set your approval policy

In Muse's Settings → Connectors → COLORgenius, set the approval policy:

| What | Policy | Why |
|---|---|---|
| Reading (consultations, transformations, photos) | **Allow** | No risk — it's your own data |
| Enriching drafts, recording consent | **Require approval** | You confirm each time |
| Publishing posts | **Require approval** | Public output — always your call |

For anything that publishes or posts publicly, keep approval ON. That's the
rule, not a suggestion.

---

## What your Muse can now do

- **Consultation:** "Start a consultation for my 2pm client." Muse asks the
  questions in order — current color, history, target, condition — and nothing
  gets skipped.
- **Processing:** "Set my processing reminders." Muse alerts you at each
  check-in (mids, ends, pull) and keeps alerting until you acknowledge.
- **Content:** "Make a transformation post from today's color." Muse pulls the
  before/after photos, assembles the post — and asks for the client's consent
  before anything publishes.

## Revoking access

Lost your phone, or just want to disconnect? Your token can be revoked from the
COLORgenius side at any time (contact the team during pilot; self-service
revocation ships with the dashboard UI). Revoking the token immediately cuts
your Muse's access — no other changes needed.

## Troubleshooting

- **"Unauthorized" errors:** your token may be expired or revoked. Get a fresh one.
- **Muse can't find the spec:** check the URL — it must be the live deployment,
  not localhost.
- **Publishing fails with CONSENT_REQUIRED:** that's working as designed. Record
  the client's consent first, then publish.
