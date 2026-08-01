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

Cloudflare gives you two nameservers (e.g. `ada.ns.cloudflare.com`). In name.com:

1. Domain → **Nameservers** → Custom
2. Replace with Cloudflare's NS records
3. Save — propagation usually takes 5–30 minutes (up to 48h)

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
