# Quick Production Verification Script
# Run this anytime to verify brFrame is working

Write-Host "🔍 Verifying brFrame Production Status..." -ForegroundColor Cyan
Write-Host ""

# Get credentials
$secret = (Get-Content .env.local | Select-String 'CRON_SECRET=' | ForEach-Object { ($_ -replace 'CRON_SECRET="', '') -replace '"', '' }).Trim()
$url = "https://br-frame-nam7aigvn-brbrainerds-projects.vercel.app"

# 1. Test cron endpoint
Write-Host "1️⃣  Testing cron endpoint..." -ForegroundColor Yellow
$response = curl -s -H "Authorization: Bearer $secret" "$url/api/cron"
$json = $response | ConvertFrom-Json

if ($json.success) {
    Write-Host "   ✅ Success! Email sent: $($json.message)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed: $($json.error)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Check environment variables
Write-Host "2️⃣  Checking environment variables..." -ForegroundColor Yellow
$envResponse = curl -s -H "Authorization: Bearer $secret" "$url/api/debug-env"
$envJson = $envResponse | ConvertFrom-Json

$checks = @(
    @{ Name = "GMAIL_USER"; Value = $envJson.GMAIL_USER },
    @{ Name = "GMAIL_APP_PASSWORD"; Value = $envJson.GMAIL_APP_PASSWORD },
    @{ Name = "FRAME_EMAIL"; Value = $envJson.FRAME_EMAIL },
    @{ Name = "REDDIT_CLIENT_ID"; Value = $envJson.REDDIT_CLIENT_ID }
)

foreach ($check in $checks) {
    if ($check.Value.exists) {
        $len = $check.Value.length
        Write-Host "   [OK] $($check.Name) set ($len chars)" -ForegroundColor Green
    } else {
        Write-Host "   [MISSING] $($check.Name) missing!" -ForegroundColor Red
    }
}

Write-Host ""

# 3. Summary
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Production URL: $url" -ForegroundColor White
Write-Host "   Node Version: $($envJson.nodeVersion)" -ForegroundColor White
Write-Host "   Platform: $($envJson.platform)" -ForegroundColor White
Write-Host ""
Write-Host "✨ brFrame is operational! Check your Pix-Star for the photo." -ForegroundColor Green
Write-Host "   Emails are sent to: brbrainerd@mypixstar.com" -ForegroundColor White
Write-Host "   Next automatic run: Tomorrow at 2 PM EST" -ForegroundColor White
Write-Host ""
