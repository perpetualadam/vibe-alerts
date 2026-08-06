# Mobile dashboard & PWA

## Features

- Responsive dashboard shell with safe-area padding
- Mobile bottom tab navigation (phones); chip nav on `md+`
- Web App Manifest + service worker (`public/sw.js`)
- Offline fallback page (`/offline`) and cached dashboard shell
- Notification history cached via Cache API (SW) + IndexedDB (client)
- Web Push (VAPID) for lead alerts on installed / subscribed devices

## Setup

1. Run migration `009_push_subscriptions.sql`
2. Generate keys: `npx web-push generate-vapid-keys`
3. Set env:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@yourdomain.com
```

4. Deploy over HTTPS
5. Open Dashboard → Notifications → **Enable on this device**

Local SW registration is disabled in `next dev` unless `NEXT_PUBLIC_PWA_DEV=1`.

## Key files

| Path | Role |
|------|------|
| `app/manifest.js` | Installable app metadata |
| `public/sw.js` | Precache, logs cache, push handlers |
| `components/dashboard/DashboardShell.js` | Shared chrome + PWA register |
| `components/dashboard/MobileBottomNav.js` | Phone tab bar |
| `components/dashboard/PushNotificationsCard.js` | Subscribe UI |
| `lib/push/*` | VAPID + send/subscribe |
| `lib/pwa/offline-logs.js` | IndexedDB log cache |
