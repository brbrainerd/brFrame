# Gmail SMTP Setup Guide

**Use this method to send emails directly to your Pix-Star frame without Resend restrictions!**

---

## Why Use Gmail SMTP?

- ✅ **No restrictions** on recipient email addresses
- ✅ **Free** (500 emails/day limit)
- ✅ **Direct delivery** to your Pix-Star
- ✅ **No domain verification** required
- ✅ **Works immediately** after setup

---

## Step 1: Create Gmail App Password

1. **Go to Google Account Security:**
   - Visit: https://myaccount.google.com/security
   - Or go to Gmail → Settings → See all settings → Accounts → Google Account settings

2. **Enable 2-Step Verification** (if not already enabled):
   - Click "2-Step Verification"
   - Follow the prompts to enable

3. **Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Or search for "App passwords" in your Google Account
   - Click "Select app" → Choose "Mail"
   - Click "Select device" → Choose "Other (Custom name)"
   - Enter name: `brFrame Vercel`
   - Click "Generate"
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

---

## Step 2: Add to Local Environment

Update your `.env.local`:

```env
# Gmail SMTP (add these lines)
GMAIL_USER="brbrainerd@gmail.com"
GMAIL_APP_PASSWORD="abcdefghijklmnop"  # No spaces

# Keep your existing variables
FRAME_EMAIL="brbrainerd@mypixstar.com"
REDDIT_CLIENT_ID="cYcp6ZegpJYY-Njb45leAw"
REDDIT_CLIENT_SECRET="zWEivbUIEkEQbuUKvciG_BjLI9hv8g"
CRON_SECRET="gspV5zW6DE0iVo4FL4Pzwz4KWTQSBc58W8yWG3ZNsCs="
RESEND_API_KEY="re_AorH1Fn9_PnQYp8GayQSHmSAkG9PGe6Fy"
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

---

## Step 3: Add to Vercel

```powershell
# Add Gmail user
vercel env add GMAIL_USER production
# Enter: brbrainerd@gmail.com

# Add Gmail app password (remove spaces from the 16-char password)
vercel env add GMAIL_APP_PASSWORD production
# Enter: abcdefghijklmnop

# Ensure Pix-Star email is set
vercel env add FRAME_EMAIL production
# Enter: brbrainerd@mypixstar.com
```

---

## Step 4: Deploy

```powershell
vercel --prod
```

---

## Step 5: Test

```powershell
# Get your CRON_SECRET from .env.local
$secret = (Get-Content .env.local | Select-String 'CRON_SECRET=' | ForEach-Object { ($_ -replace 'CRON_SECRET="', '') -replace '"', '' }).Trim()

# Test the endpoint
curl -H "Authorization: Bearer $secret" https://br-frame-hyf49wq52-brbrainerds-projects.vercel.app/api/cron
```

Expected success response:
```json
{
  "success": true,
  "message": "Email sent: <some-message-id@gmail.com>"
}
```

---

## How It Works

The code automatically detects which email service to use:

```typescript
if (process.env.GMAIL_APP_PASSWORD) {
  // Use Gmail SMTP via Nodemailer
  // ✅ Can send to ANY email address
} else {
  // Use Resend
  // ⚠️ Free tier restrictions apply
}
```

When `GMAIL_APP_PASSWORD` is set, the system uses Gmail SMTP and bypasses all Resend restrictions!

---

## Troubleshooting

### "Invalid credentials" Error
- Make sure you copied the app password correctly (no spaces)
- Verify 2-Step Verification is enabled
- Try regenerating the app password

### "Less secure app access" Error
- Gmail no longer uses "less secure apps"
- You MUST use App Passwords (requires 2-Step Verification)

### Email not arriving at Pix-Star
- Check your Gmail Sent folder to confirm it was sent
- Check Pix-Star spam/junk folder
- Verify the Pix-Star email address is correct: `brbrainerd@mypixstar.com`
- Log into Pix-Star web interface to verify settings

---

## Comparison: Gmail vs Resend

| Feature | Gmail SMTP | Resend |
|---------|------------|--------|
| **Recipient restrictions** | None | Free tier: verified domains only |
| **Daily limit** | 500 emails/day | 3,000 emails/month |
| **Setup complexity** | Medium (app password) | Easy (API key) |
| **Deliverability** | Excellent | Excellent |
| **Cost** | Free | Free tier available |
| **Best for** | Personal projects | Production apps |

---

## Security Notes

- ✅ App passwords are safer than using your real Gmail password
- ✅ You can revoke app passwords anytime
- ✅ App passwords only work for the specific app/service
- ✅ Store app password in Vercel environment variables (encrypted)
- ❌ Never commit app password to Git

---

## Next Steps

Once Gmail SMTP is working:
1. ✅ Verify email arrives at your Pix-Star
2. ✅ Check that image displays correctly
3. ✅ Verify cron job runs daily at 2 PM EST
4. ✅ Enjoy daily historical photos!

---

**Recommended:** Use Gmail SMTP for now since it's free and has no recipient restrictions. Once you have a custom domain, you can switch to Resend for a more professional setup.
