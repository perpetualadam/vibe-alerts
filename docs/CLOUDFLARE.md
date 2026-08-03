# Cloudflare configuration reference for VibeAlerts

Use this when Cloudflare sits in front of Vercel or Railway.

## Migrating from name.com direct DNS (current vibe-alerts.com setup)

You currently point **name.com** directly at Vercel:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

To move DNS to Cloudflare **without breaking the site**:

### 1. Add site in Cloudflare

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Add a site** → `vibe-alerts.com`
2. Choose the **Free** plan
3. Cloudflare scans existing records — confirm they match the table above

### 2. Set DNS records in Cloudflare

Delete the old A record and use CNAME flattening for apex (recommended with Vercel):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `cname.vercel-dns.com` | Proxied ☁️ |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied ☁️ |

Keep **www → apex redirect** configured in Vercel (already set).

### 3. Switch nameservers at name.com

Cloudflare gives you **two** nameservers (e.g. `coraline.ns.cloudflare.com` **and** a second `*.ns.cloudflare.com`). In name.com:

1. Domain → **Nameservers** → Custom
2. Replace **all** registrar nameservers with **both** Cloudflare NS records
3. Save — propagation usually takes 5–30 minutes (up to 48h)

⚠️ **Do not mix nameservers.** A partial cutover like one Cloudflare NS + one `name.com` NS breaks authoritative DNS consistency. Email Routing MX/SPF will not publish reliably until **both** registrar NS values are Cloudflare's pair.

### 4. Verify before hardening

```bash
curl -I https://vibe-alerts.com/
curl https://vibe-alerts.com/api/health
```

Confirm `vibe-alerts.com` still resolves and Vercel shows the domain as **Valid**.

### 5. Apply SSL + cache rules below

Only enable Bot Fight Mode / aggressive WAF **after** webhook smoke tests pass.

---

## DNS records (reference)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `cname.vercel-dns.com` (or Railway URL) | Proxied ☁️ |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied ☁️ |

---

## Email Routing (inbound) + Resend (outbound alerts)

VibeAlerts uses **two** email systems on the same domain:

| Direction | System | Purpose |
|-----------|--------|---------|
| Inbound | Cloudflare Email Routing | Forward `support@yourdomain` (and aliases) to your real inbox |
| Outbound | Resend (`RESEND_API_KEY` / `RESEND_FROM_EMAIL`) | Send lead-alert emails from the Email notification channel |

They share the root domain DNS. Enabling Email Routing often **overwrites** the root SPF TXT to only Cloudflare, which makes Resend alerts fail SPF and look like “emails stopped arriving.”

### Fix checklist (current vibe-alerts.com failure mode)

Live DNS has shown:

1. **Mixed nameservers** (`*.ns.cloudflare.com` + `*.name.com`) — finish the cutover (section 3 above)
2. **No MX records** — inbound `@vibe-alerts.com` cannot be delivered
3. **No merged SPF / Resend DKIM** — outbound alerts are not authenticated

### 1. Finish Cloudflare DNS authority

At the registrar, set **only** the two Cloudflare nameservers from the zone Overview. Then confirm:

```bash
dig NS vibe-alerts.com +short
# Expect two *.ns.cloudflare.com hosts — no name.com leftovers
```

### 2. Enable Email Routing

1. Cloudflare Dashboard → **Email** → **Email Routing**
2. Enable Email Routing for `vibe-alerts.com` (Cloudflare adds MX + routing SPF/DKIM)
3. **Destination addresses** → add your personal inbox (e.g. Gmail) → verify the confirmation email
4. **Routing rules** → create at least:
   - `support` → your verified destination (matches `NEXT_PUBLIC_SUPPORT_EMAIL`)
   - Optional catch-all → same destination

MX should look like:

```bash
dig MX vibe-alerts.com +short
# *.mx.cloudflare.net
```

### 3. Merge SPF so Resend still works

Unlock or edit the **single** root SPF TXT so it includes **both** Cloudflare and Resend (never create two `v=spf1` records):

```txt
v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all
```

Keep Resend domain verification records (`resend._domainkey` / provider DKIM + any `send` CNAME/TXT from the Resend dashboard). Cloudflare Routing DKIM (`cf2024-1._domainkey`) is separate and must also remain.

### 4. App env

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=alerts@vibe-alerts.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@vibe-alerts.com
```

`RESEND_FROM_EMAIL` must be on a Resend-verified domain. Support replies use `NEXT_PUBLIC_SUPPORT_EMAIL` as `reply_to` on alert emails.

### 5. Verify

```bash
node scripts/verify-email-dns.mjs vibe-alerts.com
```

Or manually:

```bash
dig NS vibe-alerts.com +short
dig MX vibe-alerts.com +short
dig TXT vibe-alerts.com +short | grep spf
dig TXT cf2024-1._domainkey.vibe-alerts.com +short
dig TXT resend._domainkey.vibe-alerts.com +short
```

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Mail to `support@` never arrives | Missing MX / Email Routing off / destination unverified | Enable routing, verify destination, confirm MX → `*.mx.cloudflare.net` |
| Lead alerts stop after enabling routing | SPF overwritten to Cloudflare-only | Merge SPF with `include:resend.com` |
| SPF permerror | Two `v=spf1` TXT records on `@` | Keep one merged record |
| Intermittent DNS / mail | Mixed registrar NS | Use both Cloudflare nameservers only |
| Resend “domain not verified” | DKIM removed during routing setup | Re-add Resend DNS records from Resend → Domains |

## SSL/TLS

- **Encryption mode:** Full (strict)
- **Always Use HTTPS:** On
- **Minimum TLS Version:** 1.2
- **Automatic HTTPS Rewrites:** On

## Cache rules (required)

Create a rule to **bypass cache** for API routes:

```
Rule name: Bypass API cache
When: URI Path starts with "/api/"
Then: Cache eligibility → Bypass cache
```

Public marketing pages (`/`, `/llms.txt`, `/sitemap.xml`) can be cached at edge.

## WAF

Recommended managed rulesets:
- Cloudflare OWASP Core Ruleset (Medium sensitivity)
- Cloudflare Exposed Credentials Check

**Custom WAF exception for webhooks** (if false positives occur):

```
When: URI Path starts with "/api/v1/webhook/"
Then: Skip → All remaining custom rules
```

## Rate limiting (optional edge layer)

```
When: URI Path starts with "/api/v1/webhook/"
Then: Rate limit → 100 requests per minute per IP
```

This adds protection beyond app-level Upstash rate limiting.

## Bot management

| Setting | Recommendation |
|---------|----------------|
| Bot Fight Mode | **Off** initially — test webhooks first |
| Super Bot Fight Mode | Off (paid) |
| AI Labyrinth | Off |

Form POST webhooks from WordPress/Wix servers can look like bot traffic. Monitor Cloudflare Security Events before enabling aggressive bot blocking.

## Page Rules (legacy) alternative

If not using Cache Rules:
- `*yourdomain.com/api/*` → Cache Level: Bypass

## Headers Cloudflare adds

Cloudflare passes `CF-Connecting-IP` to origin. Vercel provides `x-forwarded-for` which the app already uses.

## LLMO / SEO notes

- Allow crawlers to access `/llms.txt` and `/llms-full.txt` (default allow)
- Do not block Googlebot, Bingbot, or GPTBot if you want AI discoverability
- To block AI crawlers selectively: Cloudflare → Scrape Shield → configure per bot policy

## Verify setup

```bash
curl -I https://yourdomain.com/
curl https://yourdomain.com/api/health
curl https://yourdomain.com/llms.txt
curl https://yourdomain.com/sitemap.xml
```

Check response headers for `cf-cache-status: BYPASS` on `/api/health`.
