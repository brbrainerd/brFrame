# Reddit App Creation - Quick Visual Guide

**The Reddit apps page should now be open in your browser.**

---

## Step-by-Step Instructions

### 1. On the Reddit Apps Page

Look for a button at the bottom that says either:

- **"Create App"** (if you have no apps yet), OR
- **"Create Another App"** (if you already have apps)

Click it!

---

### 2. Fill in the Form

You'll see a form with these fields:

```
┌─────────────────────────────────────────┐
│ Name:                                   │
│ [brFrame Historical Photos]             │  ← Type this
│                                         │
│ App type:                               │
│ ○ web app                               │
│ ○ installed app                         │
│ ● script                                │  ← SELECT THIS ONE
│                                         │
│ Description:                            │
│ [Fetches historical photos from        │  ← Type this
│  r/100yearsago for digital frame]       │
│                                         │
│ About URL: (optional)                   │
│ [leave blank]                           │  ← Leave empty
│                                         │
│ Redirect URI:                           │
│ [http://localhost]                      │  ← Type this (required)
│                                         │
│ [Create app]                            │  ← Click this button
└─────────────────────────────────────────┘
```

**Important:** Make sure you select "script" as the app type!

---

### 3. Find Your Credentials

After clicking "Create app", you'll see your new app listed. It will look like this:

```
┌─────────────────────────────────────────────────────┐
│ [icon] brFrame Historical Photos                    │
│                                                      │
│ personal use script                                 │
│ AbCdEf12GhIjKl3MnOpQ                               │  ← THIS IS YOUR CLIENT_ID
│                                                      │
│ secret: ********************************            │
│                                                      │
│ [edit] [delete]                                     │
└─────────────────────────────────────────────────────┘
```

**To get your credentials:**

1. **CLIENT_ID:** Copy the string directly under "personal use script"
   - It's usually 20-22 characters
   - Example: `AbCdEf12GhIjKl3MnOpQ`

2. **CLIENT_SECRET:**
   - Click the **[edit]** button
   - Scroll down to where it says "secret:"
   - Copy the long string (usually 27 characters)
   - Example: `1234567890abcdefghijklmnopqrstuvwxyz`

---

### 4. Add Credentials Using the Script

Once you have both credentials copied, run this command in PowerShell:

```powershell
.\add-reddit-credentials.ps1
```

The script will:

1. Ask for your CLIENT_ID → paste it
2. Ask for your CLIENT_SECRET → paste it (it will be hidden as you type)
3. Add them to `.env.local`
4. Ask if you want to add to Vercel → type `y`
5. Add them to Vercel production

---

## Example Values

Here's what the credentials look like (these are fake examples):

```bash
REDDIT_CLIENT_ID="AbCdEf12GhIjKl3MnO"
REDDIT_CLIENT_SECRET="1a2b3c4d5e6f7g8h9i0j1k2l3m4"
```

---

## Quick Copy-Paste Reference

If you prefer to add manually, add these lines to `.env.local`:

```bash
REDDIT_CLIENT_ID="paste-your-client-id-here"
REDDIT_CLIENT_SECRET="paste-your-client-secret-here"
```

Then add to Vercel:

```powershell
vercel env add REDDIT_CLIENT_ID production
# Paste CLIENT_ID when prompted

vercel env add REDDIT_CLIENT_SECRET production
# Paste CLIENT_SECRET when prompted
```

---

## Troubleshooting

### Can't find "Create App" button?

- Scroll to the very bottom of the page
- You must be logged into Reddit
- Your account must be at least 30 days old (Reddit requirement)

### Client ID not showing?

- Make sure you clicked "Create app"
- Refresh the page
- The Client ID appears directly under "personal use script"

### Can't see Client Secret?

- Click the **[edit]** button on your app
- Scroll down to the "secret:" field
- The secret is hidden by default - it's there, just copy it

### Script won't run?

- Make sure you're in the `brFrame` directory
- Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
- Then run: `.\add-reddit-credentials.ps1`

---

## Verification

After adding credentials, verify they're set:

```powershell
# Check local
Get-Content .env.local | Select-String "REDDIT"

# Should show:
# REDDIT_CLIENT_ID="..."
# REDDIT_CLIENT_SECRET="..."
```

---

**Ready?** Create the app in your browser, get the credentials, then run `.\add-reddit-credentials.ps1`!
