# Reddit OAuth Setup Guide

This guide walks you through creating a Reddit app and configuring OAuth credentials for brFrame.

## Step 1: Create a Reddit App

1. **Go to Reddit App Preferences**
   - Visit: https://www.reddit.com/prefs/apps
   - Log in with your Reddit account

2. **Click "Create App" or "Create Another App"** (at the bottom)

3. **Fill in the Application Details:**

   ```
   Name: brFrame Historical Photos
   App type: [Select "script"]
   Description: Fetches historical photos from r/100yearsago for digital frame
   About URL: (leave blank or add your GitHub repo)
   Redirect URI: http://localhost (required but not used for script apps)
   ```

4. **Click "Create app"**

5. **Copy Your Credentials:**
   After creation, you'll see your app listed. Note these values:

   ```
   [App Icon] brFrame Historical Photos

   personal use script
   <--- THIS IS YOUR CLIENT_ID (under "personal use script")

   secret: <--- Click "edit" to see your CLIENT_SECRET
   ```

## Step 2: Add Credentials to Environment Variables

### Local Development (.env.local)

Create or update `.env.local`:

```bash
# Existing variables
CRON_SECRET="your-existing-secret"
RESEND_API_KEY="your-existing-key"
FRAME_EMAIL="your-existing-email"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# NEW: Reddit OAuth credentials
REDDIT_CLIENT_ID="your-client-id-from-step-1"
REDDIT_CLIENT_SECRET="your-client-secret-from-step-1"
```

### Vercel Production

Add the credentials to Vercel:

```bash
# Method 1: Using Vercel CLI
vercel env add REDDIT_CLIENT_ID production
# Paste your client ID when prompted

vercel env add REDDIT_CLIENT_SECRET production
# Paste your client secret when prompted

# Method 2: Via Vercel Dashboard
# 1. Go to https://vercel.com/your-project/settings/environment-variables
# 2. Click "Add New"
# 3. Add REDDIT_CLIENT_ID with your value
# 4. Add REDDIT_CLIENT_SECRET with your value
# 5. Select "Production" environment
```

## Step 3: Test Locally

```bash
# Run the E2E test to verify OAuth works
npm run test:e2e

# Or run the dev server and test manually
npm run dev

# In another terminal:
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron
```

Expected output:

```
[Reddit OAuth] Requesting access token...
[Reddit OAuth] Access token obtained successfully
[Reddit API] Fetching posts from r/100yearsago
[Reddit API] Response status: 200 OK
...
Email sent successfully!
```

## Step 4: Deploy to Production

```bash
# Deploy with new environment variables
vercel --prod

# Test the production endpoint
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-project.vercel.app/api/cron
```

## Verification Checklist

- [ ] Reddit app created at reddit.com/prefs/apps
- [ ] CLIENT_ID copied (under "personal use script")
- [ ] CLIENT_SECRET copied (click "edit" to reveal)
- [ ] Both credentials added to `.env.local`
- [ ] Both credentials added to Vercel production
- [ ] Local E2E test passes
- [ ] Production deployment successful
- [ ] Production endpoint returns 200 (not 403)

## Troubleshooting

### Error: "Reddit OAuth credentials not configured"

- **Cause:** Environment variables not set
- **Fix:** Verify `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are in your env files

### Error: "Reddit OAuth failed: 401 Unauthorized"

- **Cause:** Invalid credentials
- **Fix:**
  1. Go back to https://www.reddit.com/prefs/apps
  2. Click "edit" on your app
  3. Regenerate the secret if needed
  4. Update your environment variables

### Error: "Reddit OAuth failed: 403 Forbidden"

- **Cause:** App might be suspended or rate limited
- **Fix:**
  1. Check your Reddit app status at reddit.com/prefs/apps
  2. Ensure you're not making too many requests (rate limit: 60 requests/minute)

### Still Getting "Blocked" Error

- **Cause:** You might still be using old.reddit.com endpoint
- **Fix:** Verify the code uses `oauth.reddit.com` endpoint (should be automatic after update)

## Rate Limits

Reddit OAuth API limits:

- **60 requests per minute** for authenticated apps
- **10 requests per minute** for unauthenticated requests

Your cron job runs once per day, well within limits.

## Security Best Practices

1. **Never commit credentials to Git**
   - `.env.local` is in `.gitignore`
   - Only store in Vercel environment variables

2. **Regenerate secrets if exposed**
   - Go to reddit.com/prefs/apps
   - Click "edit" on your app
   - Click "regenerate secret"
   - Update your environment variables

3. **Monitor usage**
   - Check Vercel logs: `vercel logs`
   - Check Reddit app traffic (visible in app settings)

## Additional Resources

- [Reddit API Documentation](https://www.reddit.com/dev/api)
- [Reddit OAuth2 Quick Start](https://github.com/reddit-archive/reddit/wiki/OAuth2)
- [Reddit API Rules](https://www.reddit.com/wiki/api)

---

**Need Help?**

- Check `REDDIT_API_ISSUE.md` for alternative solutions
- Review `TEST_RESULTS.md` for test status
- Check Vercel logs: `vercel logs https://your-deployment-url.vercel.app`
