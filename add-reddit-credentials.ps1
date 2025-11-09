# Reddit OAuth Credentials Setup Script
# Run this after you've created your Reddit app

Write-Host "`n=== Reddit OAuth Credentials Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local not found!" -ForegroundColor Red
    Write-Host "Please run this script from the brFrame directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "Please enter your Reddit app credentials:" -ForegroundColor Green
Write-Host ""

# Get CLIENT_ID
Write-Host "REDDIT_CLIENT_ID (the string under 'personal use script'):" -ForegroundColor Yellow
$clientId = Read-Host

# Get CLIENT_SECRET
Write-Host ""
Write-Host "REDDIT_CLIENT_SECRET (click 'edit' to reveal):" -ForegroundColor Yellow
$clientSecret = Read-Host -AsSecureString
$clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
)

# Validate inputs
if ([string]::IsNullOrWhiteSpace($clientId) -or [string]::IsNullOrWhiteSpace($clientSecretPlain)) {
    Write-Host ""
    Write-Host "ERROR: Both credentials are required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Adding credentials to .env.local..." -ForegroundColor Cyan

# Check if credentials already exist
$envContent = Get-Content ".env.local" -Raw

if ($envContent -match "REDDIT_CLIENT_ID") {
    Write-Host "Updating existing REDDIT_CLIENT_ID..." -ForegroundColor Yellow
    $envContent = $envContent -replace 'REDDIT_CLIENT_ID="[^"]*"', "REDDIT_CLIENT_ID=`"$clientId`""
} else {
    Write-Host "Adding REDDIT_CLIENT_ID..." -ForegroundColor Green
    $envContent += "`nREDDIT_CLIENT_ID=`"$clientId`""
}

if ($envContent -match "REDDIT_CLIENT_SECRET") {
    Write-Host "Updating existing REDDIT_CLIENT_SECRET..." -ForegroundColor Yellow
    $envContent = $envContent -replace 'REDDIT_CLIENT_SECRET="[^"]*"', "REDDIT_CLIENT_SECRET=`"$clientSecretPlain`""
} else {
    Write-Host "Adding REDDIT_CLIENT_SECRET..." -ForegroundColor Green
    $envContent += "`nREDDIT_CLIENT_SECRET=`"$clientSecretPlain`""
}

# Write back to file
$envContent | Set-Content ".env.local" -NoNewline

Write-Host ""
Write-Host "✅ Credentials added to .env.local" -ForegroundColor Green

# Ask about Vercel
Write-Host ""
Write-Host "Do you want to add these credentials to Vercel production? (y/n)" -ForegroundColor Cyan
$addToVercel = Read-Host

if ($addToVercel -eq "y" -or $addToVercel -eq "Y") {
    Write-Host ""
    Write-Host "Adding to Vercel production..." -ForegroundColor Cyan
    
    # Add CLIENT_ID
    Write-Host ""
    Write-Host "Adding REDDIT_CLIENT_ID..."
    Write-Output $clientId | vercel env add REDDIT_CLIENT_ID production
    
    # Add CLIENT_SECRET
    Write-Host ""
    Write-Host "Adding REDDIT_CLIENT_SECRET..."
    Write-Output $clientSecretPlain | vercel env add REDDIT_CLIENT_SECRET production
    
    Write-Host ""
    Write-Host "✅ Credentials added to Vercel production" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Test locally: npm run test:e2e" -ForegroundColor White
Write-Host "2. Build: npm run build" -ForegroundColor White
Write-Host "3. Deploy: vercel --prod" -ForegroundColor White
Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
