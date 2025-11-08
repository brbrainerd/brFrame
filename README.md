# brFrame - Historical Photo Digital Frame

A Next.js 16 serverless application that delivers daily historical photos from Reddit's r/100yearsagotoday to your Pix-Star digital frame via email.

## Features

- **Daily Updates**: Automated cron job runs at 2:00 PM EST every day
- **Reddit Integration**: Fetches top-rated historical images from r/100yearsagotoday
- **Image Processing**: Resizes and adds text overlays using Jimp
- **Email Delivery**: Sends processed images via Resend to your Pix-Star frame email
- **Serverless**: Runs entirely on Vercel's infrastructure with zero maintenance

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Vercel Cron Jobs**
- **Resend** for email delivery
- **Jimp** for image processing

## Getting Started

### 1. Install Dependencies
``bash
npm install
``
