# Workarounds for Resend Pix-Star Email Restriction

**Problem:** Resend free tier won't send to `brbrainerd@mypixstar.com`

---

## 🥇 RECOMMENDED: Gmail SMTP (Free, No Restrictions)

**Setup time:** 5 minutes  
**Cost:** Free (500 emails/day)  
**Restriction:** None

### Quick Setup:
1. Create Gmail App Password: https://myaccount.google.com/apppasswords
2. Add to Vercel:
```powershell
vercel env add GMAIL_USER production
# brbrainerd@gmail.com

vercel env add GMAIL_APP_PASSWORD production
# (paste 16-char password, no spaces)
```
3. Deploy: `vercel --prod`

**📖 Full guide:** See `GMAIL_SMTP_SETUP.md`

---

## Option 2: Gmail Forwarding (Simplest)

**Setup time:** 2 minutes  
**Cost:** Free  
**Restriction:** Relies on Gmail being available

### Quick Setup:
1. Set recipient to your Gmail:
```powershell
vercel env add FRAME_EMAIL production
# brbrainerd@gmail.com
```
2. In Gmail: Settings → Forwarding → Add `brbrainerd@mypixstar.com`
3. Create filter: From `onboarding@resend.dev` → Forward to Pix-Star
4. Deploy: `vercel --prod`

---

## Option 3: Verify Custom Domain (Professional)

**Setup time:** 15-30 minutes (depends on DNS propagation)  
**Cost:** Free (if you own a domain)  
**Restriction:** Requires owning a domain

### Quick Setup:
1. Go to https://resend.com/domains
2. Add your domain (e.g., `brbrainerd.com`)
3. Add DNS records
4. Update sender:
```powershell
vercel env add RESEND_FROM_EMAIL production
# frame@brbrainerd.com
```
5. Deploy: `vercel --prod`

---

## Comparison Table

| Method | Setup Time | Cost | Restrictions | Reliability |
|--------|------------|------|--------------|-------------|
| **Gmail SMTP** ✅ | 5 min | Free | None | Excellent |
| Gmail Forward | 2 min | Free | Requires Gmail | Good |
| Custom Domain | 15-30 min | Free* | Need domain | Excellent |

*Assumes you already own a domain

---

## My Recommendation

**Use Gmail SMTP** because:
- ✅ No recipient restrictions
- ✅ Free forever
- ✅ 500 emails/day (way more than you need)
- ✅ Direct delivery to Pix-Star
- ✅ No forwarding delays
- ✅ Works immediately after setup

---

## Already Implemented!

The code is **already set up** to use Gmail SMTP automatically when you add the environment variables:

```typescript
// In app/api/cron/route.ts
if (process.env.GMAIL_APP_PASSWORD) {
  // Use Gmail SMTP - no restrictions!
} else {
  // Use Resend - free tier restrictions
}
```

Just add the Gmail credentials and it works! 🎉
