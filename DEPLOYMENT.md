# Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **Resend Account**: Sign up at https://resend.com (free tier works)
3. **Pix-Star Frame**: Ensure you have the email address for your frame

## Step 1: Local Setup

```bash
# Copy environment variables template
cp .env.local.example .env.local

# Edit .env.local with your values
# - CRON_SECRET: Generate a strong random secret
# - RESEND_API_KEY: Get from Resend dashboard
# - FRAME_EMAIL: Your Pix-Star frame email
# - RESEND_FROM_EMAIL: Must be verified domain on Resend
```

## Step 2: Test Locally

```bash
# Install dependencies (already done if you followed setup)
npm install

# Run development server
npm run dev

# Test the cron endpoint (in another terminal)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron
```

## Step 3: Deploy to Vercel

```bash
# Login to Vercel CLI
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [Select your account]
# - Link to existing project? N
# - Project name? brframe (or your choice)
# - Directory? ./
# - Override settings? N
```

## Step 4: Configure Environment Variables

After deployment, add your environment variables:

```bash
# Add each secret
vercel env add CRON_SECRET production
vercel env add RESEND_API_KEY production
vercel env add FRAME_EMAIL production
vercel env add RESEND_FROM_EMAIL production
```

Or configure them in the Vercel Dashboard:

1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add all four variables

## Step 5: Deploy with Environment Variables

```bash
# Redeploy to apply environment variables
vercel --prod
```

## Step 6: Verify Cron Job

1. Go to your project on vercel.com
2. Navigate to Settings → Cron Jobs
3. You should see one cron job: `/api/cron` running at `0 14 * * *` (2:00 PM EST daily)

## Testing the Live Endpoint

```bash
# Test the production endpoint
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-project.vercel.app/api/cron
```

## Monitoring

- Check logs in Vercel Dashboard → Logs
- Monitor cron job executions in Vercel Dashboard → Cron Jobs
- Check Resend dashboard for email delivery status

## Troubleshooting

### Cron Job Not Running

- Verify environment variables are set in production
- Check Vercel logs for errors
- Ensure CRON_SECRET matches exactly

### Email Not Sending

- Verify Resend API key is valid
- Check that "from" email domain is verified in Resend
- Confirm frame email address is correct

### Images Not Displaying

- Verify Pix-Star frame has email-to-frame enabled
- Check image size/format compatibility
- Review Vercel function logs for processing errors

## Customization

### Change Schedule

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 14 * * *" // Modify this
    }
  ]
}
```

Then redeploy:

```bash
vercel --prod
```

### Change Subreddit

Edit `app/api/cron/route.ts` and change:

```typescript
const SUBREDDIT = "your_subreddit_here";
```

## Next Steps

- Set up monitoring/alerting for cron failures
- Add health check endpoint
- Implement email notifications for failures
- Add web dashboard for viewing current/historical photos
