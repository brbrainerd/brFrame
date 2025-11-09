# brFrame - Historical Photo Digital Frame

A Next.js 16 serverless application that delivers daily historical photos from Reddit's r/100yearsago to a Pix-Star digital frame.

## Features

- **Daily Updates**: Automated cron job runs at 8:00 AM EST every day
- **Reddit Integration**: Fetches top-rated historical images from r/100yearsagotoday
- **Image Processing**: Resizes and adds text overlays using Sharp + Satori
- **Email Delivery**: Sends processed images via Resend to your Pix-Star frame email
- **Serverless**: Runs entirely on Vercel's infrastructure with zero maintenance

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Vercel Cron Jobs**
- **Resend** for email delivery
- **Sharp** for image compositing
- **Satori** for text rendering

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
CRON_SECRET="your-secure-random-string"
RESEND_API_KEY="re_your_resend_api_key"
FRAME_EMAIL="your_frame@mypixstar.com"
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

## Testing

This project uses a **two-layered testing strategy** for comprehensive coverage:

### Layer 1: Unit Tests (95%+ Coverage)

Fast, reliable tests with mocked dependencies that test all code paths including error scenarios.

```bash
# Run unit tests in watch mode
npm test

# Run unit tests once
npm run test:unit

# Run tests with coverage report
npm run test:coverage

# Open visual test UI
npm run test:ui
```

**What's tested:**

- ✅ Authorization (valid/invalid CRON_SECRET)
- ✅ Reddit API integration (success, failure, no images)
- ✅ Image processing with Sharp + Satori (success, corrupt overlay)
- ✅ Email delivery via Resend (success, API errors)
- ✅ All error paths and edge cases

### Layer 2: E2E Smoke Tests

Real integration tests with **zero mocks** - hits the actual Reddit API, processes real images, and sends real emails.

```bash
# Run E2E tests (requires valid environment variables)
npm run test:e2e
```

**What's verified:**

- 🌐 Live Reddit API connectivity
- 🖼️ Real image download and processing
- 📧 Actual email delivery to your Pix-Star frame
- ✅ End-to-end integration

**Note:** E2E tests send real emails. Check your Pix-Star frame or [Resend Dashboard](https://resend.com/emails) to verify delivery.

### Manual Testing

Trigger the cron job manually (useful for testing without running the full suite):

```bash
# Trigger on localhost (requires dev server running)
npm run test:manual

# Or with production URL
VERCEL_URL=your-app.vercel.app npm run test:manual
```

### Testing Architecture

**Why Two Layers?**

1. **Unit tests** provide fast feedback (<1s) and test error paths that are impossible to simulate with real APIs
2. **E2E tests** verify production integration and credentials work correctly
3. Together they provide both speed and confidence without flakiness

**Coverage Goals:**

- Lines: 95%
- Functions: 95%
- Branches: 95%
