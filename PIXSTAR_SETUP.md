# Pix-Star Frame: Auto-Display Setup Guide

## Automatic Email-to-Display Configuration

To ensure your Pix-Star frame automatically displays new images from emails without requiring manual approval:

### Method 1: Email Settings (Recommended)

1. **Access Frame Settings**:
   - Press the settings button on your Pix-Star frame
   - Navigate to: **Settings** → **Email** → **Email Settings**

2. **Configure Auto-Import**:
   - Enable **"Auto-import from email"**
   - Set **"Approval required"** to **OFF/Disabled**
   - Set **"Add to slideshow automatically"** to **ON/Enabled**

3. **Email Filter Settings**:
   - Whitelist sender: `brbrainerd@gmail.com`
   - This ensures only your emails are auto-approved

### Method 2: Web Interface Configuration

1. **Login to Pix-Star Web Portal**:
   - Go to: https://www.pix-star.com/
   - Login with your account credentials

2. **Frame Settings**:
   - Select your frame (brbrainerd@mypixstar.com)
   - Navigate to: **Frame Settings** → **Email Settings**
   - Enable **"Auto-add photos from email"**
   - Disable **"Require approval for email photos"**

3. **Trusted Senders**:
   - Add `brbrainerd@gmail.com` to trusted senders list
   - Save settings

### Method 3: Slideshow Configuration

1. **Slideshow Settings on Frame**:
   - Press settings button
   - Navigate to: **Slideshow** → **Slideshow Settings**
   - Set **"Include recent photos"** to **ON**
   - Set **"Sort by"** to **Date (newest first)**
   - Set **"Transition"** to your preference (e.g., 5 seconds)

2. **Photo Sources**:
   - Enable **"Email photos"** as a photo source
   - Disable approval requirements

### Method 4: Email Album Configuration

1. **Create Dedicated Email Album**:
   - On frame: **Albums** → **Create New Album** → **"Daily Photo"**
   - Set email photos to auto-add to this album
   - Set slideshow to display only this album

2. **Album Settings**:
   - Set album to **"Display latest photo only"**
   - This makes each new email replace the current display

### Verification Steps

After configuration:

1. **Test Email Receipt**:
   - Trigger the cron job manually
   - Verify email arrives at `brbrainerd@mypixstar.com`

2. **Check Frame Display**:
   - Photo should appear within 5-15 minutes
   - No manual approval should be required

3. **Slideshow Behavior**:
   - Frame should automatically cycle through new photos
   - Most recent photo should appear first

### Troubleshooting

**Issue**: Photos still require approval

- **Solution**: Check frame firmware is up-to-date (Settings → About → Check for updates)

**Issue**: Photos not appearing

- **Solution**: Verify email whitelist includes sender address
- **Solution**: Check frame has active internet connection
- **Solution**: Verify frame storage isn't full (Settings → Storage)

**Issue**: Photos appear but aren't in slideshow

- **Solution**: Enable "Email photos" in slideshow sources
- **Solution**: Restart frame (Settings → Power → Restart)

### Daily Automation

Current cron schedule:

- **Time**: 8:00 AM EST daily
- **Sender**: brbrainerd@gmail.com
- **Recipient**: brbrainerd@mypixstar.com
- **Subject**: "100 Years Ago Today: [post title]"
- **Attachment**: daily-photo.jpg (1024x768, optimized JPEG)

### Frame Behavior

With auto-display enabled:

- Email arrives at frame's email address
- Frame checks email every 15 minutes (configurable)
- New photo is automatically imported
- Photo is added to slideshow queue
- No user interaction required

### Additional Resources

- Pix-Star Support: https://support.pix-star.com/
- Frame Manual: Check "Email Settings" section
- Support Contact: support@pix-star.com
