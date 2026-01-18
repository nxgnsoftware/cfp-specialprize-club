# cfp-specialprize-club

**Organization:** nxgnsoftware
**Environment:** production
**Domain:** specialprize.club

---

## Project Overview

Security awareness training website that demonstrates social engineering tactics used in phishing and scam attempts. Features a rickroll as the "prize" to educate users about the dangers of clicking suspicious links.

---

## Security Requirements - MANDATORY

**These rules apply to ALL code changes:**

### Code Sanitization (CRITICAL)
- NO console.log or console.debug in production code
- NO hardcoded secrets, API keys, or passwords
- NO sensitive information in error messages
- NO sensitive comments or TODOs

### Error Handling Pattern
```javascript
try {
  // operation
} catch (error) {
  console.error('Operation failed'); // Generic message only
  return new Response(JSON.stringify({
    error: 'An internal error occurred'
  }), { status: 500 });
}
```

---

## Technical Stack

- **Hosting:** Cloudflare Pages
- **Database:** Cloudflare D1 (cfp-specialprize-club-d1)
- **Functions:** Cloudflare Pages Functions
- **Type:** Static HTML site with server-side tracking

---

## Project Structure

```
cfp-specialprize-club/
├── functions/
│   ├── _middleware.js     # Domain redirects + visit tracking
│   └── api/
│       ├── visits.js      # Visit data API
│       └── beacon.js      # Beacon endpoint
├── index.html             # Main page
├── settings.html          # Admin settings page
├── qr.html               # QR code display
├── rickroll.gif          # Hero image
├── _redirects            # Edge redirects
├── _headers              # Security headers
├── wrangler.toml         # Cloudflare config
└── CLAUDE.md             # This file
```

---

## Key Features

1. **Visit Tracking:** Server-side tracking via middleware (no client JS)
2. **Domain Redirect:** All pages.dev traffic redirects to specialprize.club
3. **Security Headers:** X-Frame-Options, CSP, XSS protection
4. **D1 Database:** Stores visit data with geo information

---

## D1 Database

**Binding:** `cfp_specialprize_club_d1`
**Database ID:** `721d34a7-9de4-4926-863e-f7446f48f837`

### Schema
```sql
CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  timestamp TEXT,
  user_agent TEXT,
  referrer TEXT,
  url TEXT,
  uri TEXT,
  path TEXT,
  query TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT,
  latitude TEXT,
  longitude TEXT,
  asn TEXT,
  colo TEXT,
  protocol TEXT,
  language TEXT,
  http_version TEXT
);
```

---

## Deployment

```bash
git add .
git commit -m "Description"
git push
```

Cloudflare Pages auto-deploys from main branch.

---

## API Endpoints

- `GET /api/visits` - Query visit data (with filters)
- `POST /api/beacon` - Beacon data collection

---

## Important Notes

1. **No _routes.json** - Using Functions Mode for complete pages.dev blocking
2. **Middleware first** - Domain redirect happens BEFORE static files
3. **Server-side tracking** - No client-side JavaScript for tracking
4. **Security headers** - Applied via _headers file

---

## Git Workflow

- `main` - Production branch (auto-deploys)
- Do NOT include "Co-Authored-By: Claude" in commits

---

**Last Updated:** 2026-01-17
**Organization:** nxgnsoftware
