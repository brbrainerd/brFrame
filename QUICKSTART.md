# brFrame Quick Start

## What You Have

Your brFrame repository is ready! Here's what has been set up:

### ✅ Installed Tools
- Node.js v24.5.0
- Git v2.50.1
- Jujutsu (jj) v0.35.0
- Vercel CLI v48.9.0
- All npm dependencies

### ✅ Project Structure
```
brFrame/
├── app/
│   ├── api/cron/route.ts    # Main serverless function
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Status page
│   └── globals.css          # Tailwind styles
├── .env.local.example       # Template for your secrets
├── vercel.json              # Cron job config (2 PM EST daily)
├── package.json             # Next.js 16, React 19 dependencies
└── DEPLOYMENT.md            # Full deployment guide
```

### ✅ Version Control
- Git repository initialized
- Jujutsu colocated repository initialized
- Initial commit completed

### ✅ Build Verified
- `npm run build` completed successfully
- TypeScript configuration validated
- All dependencies installed

## Next Steps

### 1. Configure Your Environment (Required Before Use)

```bash
# Copy the template
cp .env.local.example .env.local

# Edit with your editor and add:
# - CRON_SECRET: Generate random string (e.g., openssl rand -base64 32)
# - RESEND_API_KEY: From resend.com dashboard
# - FRAME_EMAIL: Your frame's email (e.g., xxxxx@mypixstar.com)
# - RESEND_FROM_EMAIL: Verified domain email on Resend
```

### 2. Test Locally

```bash
# Start development server
npm run dev

# In another terminal, test the cron endpoint
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron
```

### 3. Deploy to Vercel

```bash
# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add CRON_SECRET production
vercel env add RESEND_API_KEY production
vercel env add FRAME_EMAIL production
vercel env add RESEND_FROM_EMAIL production

# Deploy to production
vercel --prod
```

See `DEPLOYMENT.md` for detailed instructions!

## Project Features

- **Daily Automation**: Cron job runs at 2:00 PM EST
- **Reddit Integration**: Fetches from r/100yearsagotoday
- **Image Processing**: Resizes to 1024x768 with text overlay
- **Email Delivery**: Sends via Resend to your Pix-Star frame
- **Next.js 16**: Latest with App Router and Turbopack
- **TypeScript**: Fully typed for safety
- **Tailwind CSS**: For any UI customization

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Version Control
git status               # Check Git status
git commit -am "msg"     # Commit with message
jj status                # Check Jujutsu status
jj describe -m "msg"     # Set commit message
jj git push              # Push to remote

# Deployment
vercel                   # Deploy to preview
vercel --prod            # Deploy to production
vercel logs              # View deployment logs
```

## Resources

- **Next.js 16 Docs**: https://nextjs.org/docs
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs
- **Resend Docs**: https://resend.com/docs
- **Jimp Docs**: https://github.com/jimp-dev/jimp
- **Jujutsu Docs**: https://jj-vcs.github.io/jj/

## Support

If you run into issues:
1. Check `DEPLOYMENT.md` for troubleshooting
2. Review Vercel logs: `vercel logs`
3. Check Resend dashboard for email delivery status
4. Verify environment variables are set correctly

---

**You're all set!** Follow the Next Steps above to configure and deploy your frame project. 🖼️
