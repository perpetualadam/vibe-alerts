# Cloudflare configuration reference for VibeAlerts

Use this when Cloudflare sits in front of Vercel or Railway.

## DNS records

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
