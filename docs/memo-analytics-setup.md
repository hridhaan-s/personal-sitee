# Memo analytics setup

Memo analytics are stored in the connected Supabase project in the isolated
`public.memo_analytics_events` table. The table has RLS enabled and no
client-facing policies; only the server-side service role can read or write it.

## Vercel environment

Add this variable to the **Production** environment (and Preview if you want
analytics on preview deployments):

- `SUPABASE_SERVICE_ROLE_KEY`: the server-only service-role/secret key from
  Supabase Project Settings → API Keys.

The project URL is already configured as the default in `api/memo-analytics.js`.
Do not add the service-role key to frontend code, commit it, or paste it into
chat. Redeploy after adding the variable.

## What is collected

- Article slug and event type
- Random first-party visitor and session identifiers, hashed server-side
- Referring website hostname (not the full URL)
- Coarse device category
- Reading milestones (25%, 50%, 75%, 100%) and time spent

No IP address, raw user-agent string, full referrer URL, name, email, or account
identity is stored by this analytics feature. The dashboard is inside the
existing password-protected Memo admin.
