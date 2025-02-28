# CFP Special Prize Club

A warning site for phishing awareness that demonstrates the tactics used by scammers with "free prize" claims.

## Overview

This project serves as an educational tool for cybersecurity training. It displays a warning message when users scan QR codes or follow links promising fake prizes or rewards, helping to raise awareness about common phishing tactics.

## Features

- Warning message for users who follow deceptive links
- Rick roll animation for visual impact
- QR code generation for training materials
- Visitor tracking and analytics via Cloudflare D1 database
- New Relic instrumentation for performance monitoring

## Technology Stack

- Cloudflare Pages for hosting
- Cloudflare Workers for serverless functions
- Cloudflare D1 for database storage
- New Relic for monitoring and analytics

## Development

### Prerequisites

- Node.js (v18 or higher)
- Wrangler CLI tool (`npm install -g wrangler`)
- Cloudflare account

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up New Relic:
   ```bash
   wrangler secret put NEW_RELIC_LICENSE_KEY
   ```
   Or use the .env file for local development
   
4. Start development server:
   ```bash
   npm run dev
   ```

### Deployment

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

## License

This project is intended for educational purposes only. Use for security awareness training.