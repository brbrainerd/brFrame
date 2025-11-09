import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/cron/route'
import {
  mockFetch,
  mockResendSend,
  mockSharp,
  mockSharpInstance,
  mockSharpBuffer,
  mockSendMail,
  mockCreateTransport,
  mockSatori,
} from '../setup'
import { NextRequest } from 'next/server'
import 'dotenv/config'

// Helper to create a valid mock request
const createMockRequest = () => {
  return new NextRequest('http://localhost/api/cron', {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  })
}

describe('Unit Test: /api/cron GET Handler', () => {
  it('should fail with 401 if CRON_SECRET is missing', async () => {
    const req = new NextRequest('http://localhost/api/cron')
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('should fail with 401 if CRON_SECRET is invalid', async () => {
    const req = new NextRequest('http://localhost/api/cron', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('should run the full happy path successfully', async () => {
    // Set up environment for Gmail SMTP (no GMAIL_APP_PASSWORD = use Resend)
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD  // Force Resend path
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    // 1. Check OAuth token fetch was called first
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://www.reddit.com/api/v1/access_token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Basic'),
          'User-Agent': 'brFrame/1.0.0'
        }),
        body: 'grant_type=client_credentials'
      })
    )
    
    // 2. Check Reddit API fetch with OAuth token
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://oauth.reddit.com/r/100yearsago/hot?limit=50',
      expect.objectContaining({ 
        cache: 'no-store',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock_oauth_token_12345',
          'User-Agent': 'brFrame/1.0.0'
        })
      })
    )

    // 3. Check image download
    expect(mockFetch).toHaveBeenNthCalledWith(3, 'http://mock.com/image.jpg')

    // 4. Check Sharp processing
    expect(mockSharp).toHaveBeenCalledWith(expect.any(Buffer))
    expect(mockSharpInstance.resize).toHaveBeenCalledWith(1024, 768, { 
      fit: 'contain',
      background: { r: 0, g: 0, b: 0 }
    })
    expect(mockSharpInstance.composite).toHaveBeenCalled()
    expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 })
    expect(mockSharpInstance.toBuffer).toHaveBeenCalled()

    // 5. Check Resend email (since GMAIL_APP_PASSWORD not set)
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.arrayContaining([expect.any(String)]),
        subject: expect.stringContaining('Mocked Historical Post'),
        attachments: [
          {
            filename: 'daily-photo.jpg',
            content: mockSharpBuffer,
          },
        ],
      })
    )

    // 6. Check final response
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toContain('resend_123')
  })

  it('should return 500 if no posts match today\'s historical date with images', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    
    // Mock OAuth token fetch, then posts that don't have today's historical date
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock_oauth_token' }),
      })
      .mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { 
              children: [
                { 
                  data: { 
                    title: '[January 1, 1900] Wrong Date Post',
                    url: 'http://mock.com/image.jpg',
                    score: 100,
                    post_hint: 'image' 
                  } 
                }
              ] 
            },
          }),
      })
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toContain('No posts found')
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('should return 500 if Reddit API returns non-OK response', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    
    // Mock successful OAuth, then failed Reddit API call
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock_oauth_token' }),
      })
      .mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('<html>Error page</html>')
      })
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toContain('Reddit API failed')
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('should return 500 if Reddit fetch fails', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    
    // Mock OAuth success, then Reddit API network error
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock_oauth_token' }),
      })
      .mockRejectedValue(new Error('Reddit is down'))
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Reddit is down')
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('should return 500 if Sharp processing fails', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    mockSharpInstance.toBuffer.mockRejectedValue(new Error('Image processing failed'))
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toContain('Image processing failed')
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('should handle gallery posts with media_metadata', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    // Generate today's historical date
    const today = new Date()
    const historicalDate = new Date(today)
    historicalDate.setFullYear(today.getFullYear() - 100)
    const month = historicalDate.toLocaleString('en-US', { month: 'long' })
    const day = historicalDate.getDate()
    const year = historicalDate.getFullYear()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock_oauth_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              children: [
                {
                  data: {
                    title: `[${month} ${day}, ${year}] Gallery Post`,
                    is_gallery: true,
                    media_metadata: {
                      'image1': {
                        s: {
                          u: 'http://mock.com/gallery-image.jpg&amp;test=1'
                        }
                      }
                    },
                    score: 200,
                    permalink: '/r/100yearsago/comments/gallery',
                    post_hint: 'gallery',
                  },
                },
              ],
            },
          }),
      })
      .mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      })
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    // Verify HTML entity was decoded and image was downloaded
    expect(mockFetch).toHaveBeenCalledWith('http://mock.com/gallery-image.jpg&test=1')
  })

  it('should handle posts with preview images as fallback', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    // Generate today's historical date
    const today = new Date()
    const historicalDate = new Date(today)
    historicalDate.setFullYear(today.getFullYear() - 100)
    const month = historicalDate.toLocaleString('en-US', { month: 'long' })
    const day = historicalDate.getDate()
    const year = historicalDate.getFullYear()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock_oauth_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              children: [
                {
                  data: {
                    title: `[${month} ${day}, ${year}] Preview Post`,
                    url: 'http://reddit.com/something',
                    preview: {
                      images: [{
                        source: {
                          url: 'http://mock.com/preview-image.jpg&amp;preview=true'
                        }
                      }]
                    },
                    score: 180,
                    permalink: '/r/100yearsago/comments/preview',
                  },
                },
              ],
            },
          }),
      })
      .mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      })
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    // Verify HTML entity was decoded in preview URL and image was downloaded
    expect(mockFetch).toHaveBeenCalledWith('http://mock.com/preview-image.jpg&preview=true')
  })

  it('should return 500 if Resend email fails', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD  // Force Resend path
    
    mockResendSend.mockResolvedValue({
      data: null,
      error: { message: 'Invalid API Key' },
    })
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toContain('Invalid API Key')
  })

  it('should use Gmail SMTP when GMAIL_APP_PASSWORD is set', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    process.env.GMAIL_APP_PASSWORD = 'test_password'
    process.env.GMAIL_USER = 'test@gmail.com'
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()

    // Should use Nodemailer instead of Resend
    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: 'test@gmail.com',
        pass: 'test_password'
      }
    })
    expect(mockSendMail).toHaveBeenCalled()
    expect(mockResendSend).not.toHaveBeenCalled()
    
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toContain('mock-message-id@gmail.com')
  })

  it('should create dynamic overlay using Satori for serverless rendering', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    const req = createMockRequest()
    const response = await GET(req)
    
    // Verify Satori was called for text overlay
    expect(mockSatori).toHaveBeenCalled()
    const satoriCall = mockSatori.mock.calls[0]
    expect(satoriCall[0]).toHaveProperty('type', 'div')
    expect(satoriCall[1]).toHaveProperty('width', 1024)
    
    expect(response.status).toBe(200)
  })

  it('should handle fuzzy date matching (±3 days)', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    // Generate a date 2 days before today's historical date
    const today = new Date()
    const historicalDate = new Date(today)
    historicalDate.setFullYear(today.getFullYear() - 100)
    historicalDate.setDate(historicalDate.getDate() - 2)
    const month = historicalDate.toLocaleString('en-US', { month: 'long' })
    const day = historicalDate.getDate()
    const year = historicalDate.getFullYear()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock_oauth_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              children: [
                {
                  data: {
                    title: `[${month} ${day}, ${year}] Nearby Date Post`,
                    url: 'http://mock.com/nearby-image.jpg',
                    score: 160,
                    permalink: '/r/100yearsago/comments/nearby',
                  },
                },
              ],
            },
          }),
      })
      .mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      })
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()
    
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('should verify Sharp metadata call for aspect ratio calculation', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    const req = createMockRequest()
    const response = await GET(req)
    
    // Verify metadata() was called to determine image dimensions
    expect(mockSharpInstance.metadata).toHaveBeenCalled()
    expect(mockSharpInstance.flatten).toHaveBeenCalledWith({ background: { r: 0, g: 0, b: 0 } })
    
    expect(response.status).toBe(200)
  })

  it('should handle OAuth failure gracefully', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Invalid credentials')
    })
    
    const req = createMockRequest()
    const response = await GET(req)
    const json = await response.json()
    
    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toContain('Reddit OAuth failed')
  })

  it('should handle long titles with truncation', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    const today = new Date()
    const historicalDate = new Date(today)
    historicalDate.setFullYear(today.getFullYear() - 100)
    const month = historicalDate.toLocaleString('en-US', { month: 'long' })
    const day = historicalDate.getDate()
    const year = historicalDate.getFullYear()
    
    const longTitle = `[${month} ${day}, ${year}] This is an extremely long title that should definitely be truncated when it exceeds the maximum character limit to ensure readability on the display`
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock_oauth_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              children: [
                {
                  data: {
                    title: longTitle,
                    url: 'http://mock.com/long-title.jpg',
                    score: 190,
                    permalink: '/r/100yearsago/comments/longtitle',
                  },
                },
              ],
            },
          }),
      })
      .mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      })
    
    const req = createMockRequest()
    const response = await GET(req)
    
    // Verify Satori was called for text rendering
    expect(mockSatori).toHaveBeenCalled()
    
    expect(response.status).toBe(200)
  })

  it('should include proper email branding and attribution', async () => {
    process.env.REDDIT_CLIENT_ID = 'test_client_id'
    process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
    delete process.env.GMAIL_APP_PASSWORD
    
    const req = createMockRequest()
    const response = await GET(req)
    
    // Check email content includes branding
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('100 Years Ago Today'),
        html: expect.stringContaining('Built by Bertrand Reyna-Brainerd'),
      })
    )
    
    expect(response.status).toBe(200)
  })
})

