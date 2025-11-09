# Reddit API Blocking Issue

## Problem Summary

Reddit is actively blocking requests from Vercel's serverless infrastructure with **403 Forbidden** responses. This is a known issue where Reddit blocks cloud provider IP ranges (AWS, Vercel, etc.) to prevent scraping and abuse.

## What Was Fixed

✅ **Correct Subreddit**: Changed from `100yearsagotoday` → `100yearsago`  
✅ **Enhanced Image Detection**: Added support for `.jpeg`, `.png`, `.jpg`, `.gif`, and gallery posts  
✅ **Date Matching Logic**: Filters posts to match today's historical date (100 years ago)  
✅ **Better Logging**: Comprehensive debugging output for troubleshooting  
✅ **Highest Upvoted Selection**: Automatically selects the most upvoted valid post

## Current Block Status

```
[Reddit API] Response status: 403 Blocked
[Reddit API] Error response body: <body class=theme-beta>...
```

Reddit returns an HTML blocked page instead of JSON, indicating Cloudflare-style bot protection.

## Solutions (In Order of Recommendation)

### Option 1: Use Reddit Official API with OAuth (Recommended)

Reddit provides an official API that requires OAuth authentication but has much higher rate limits and won't be blocked.

**Steps:**

1. Create a Reddit app at https://www.reddit.com/prefs/apps
2. Get your `client_id` and `client_secret`
3. Use OAuth2 flow to get an access token
4. Use `oauth.reddit.com` endpoints with the token

**Implementation:**

```typescript
// Get OAuth token
const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
const tokenResponse = await fetch(
  "https://www.reddit.com/api/v1/access_token",
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "brFrame/1.0.0",
    },
    body: "grant_type=client_credentials",
  },
);

const { access_token } = await tokenResponse.json();

// Use the token
const response = await fetch(
  "https://oauth.reddit.com/r/100yearsago/hot?limit=50",
  {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "brFrame/1.0.0",
    },
  },
);
```

### Option 2: Use a Proxy Service

Use a proxy service to route requests through residential IPs that aren't blocked.

**Options:**

- **Bright Data** (formerly Luminati)
- **ScraperAPI** (https://www.scraperapi.com/)
- **ProxyCrawl**

**Pros:** Simple integration, just change the fetch URL  
**Cons:** Monthly cost ($10-50/month)

### Option 3: Use Reddit API Wrappers/Services

Services that provide Reddit data without scraping:

- **Pushshift.io** (Reddit archive, may be outdated)
- **Reddit RSS Feeds** - Use `https://www.reddit.com/r/100yearsago/hot.rss`

**RSS Feed Implementation:**

```typescript
const response = await fetch("https://www.reddit.com/r/100yearsago/hot.rss");
const rssText = await response.text();
// Parse RSS XML to extract posts
```

### Option 4: Host a Separate Proxy Server

Deploy a small Node.js server on a different platform (not Vercel/AWS Lambda) that Reddit doesn't block:

- **DigitalOcean Droplet** ($6/month)
- **Linode** ($5/month)
- **Heroku** (may also be blocked)

The proxy fetches from Reddit and your Vercel function fetches from your proxy.

### Option 5: Try Different Times/Endpoints

Reddit's blocking may vary by:

- Time of day
- Endpoint (`/hot` vs `/top` vs `/new`)
- Geographic region of Vercel deployment

**Worth trying:**

```typescript
// Try .rss endpoint (less blocked)
`https://www.reddit.com/r/100yearsago/hot.rss`
// Try different sorting
`https://old.reddit.com/r/100yearsago/new.json`;
```

## Immediate Workaround

For testing purposes, you can temporarily use the RSS feed which is less likely to be blocked:

```typescript
const response = await fetch("https://www.reddit.com/r/100yearsago/hot.rss", {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});

if (response.ok) {
  const rssText = await response.text();
  // Parse RSS with a library like 'rss-parser'
  const parser = new (require("rss-parser"))();
  const feed = await parser.parseString(rssText);
  // feed.items contains the posts
}
```

## Next Steps

1. **Test RSS endpoint** - Quickest workaround
2. **Set up Reddit OAuth** - Best long-term solution (free)
3. **Monitor for changes** - Reddit's blocking policy may change

## Additional Resources

- [Reddit API Documentation](https://www.reddit.com/dev/api)
- [Reddit OAuth2 Quick Start](https://github.com/reddit-archive/reddit/wiki/OAuth2-Quick-Start-Example)
- [Snoowrap (Reddit API Wrapper for Node.js)](https://github.com/not-an-aardvark/snoowrap)
