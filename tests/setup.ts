import { vi, beforeEach } from 'vitest'

// Set up OAuth credentials for all tests
process.env.REDDIT_CLIENT_ID = 'test_client_id'
process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'

// 1. Mock the Resend module
// We create a mock function that we can assert against
export const mockResendSend = vi.fn()
vi.mock('resend', () => {
  // Mock the class constructor 'new Resend()'
  class Resend {
    emails = {
      send: mockResendSend,
    }
  }
  return { Resend }
})

// 2. Mock the Sharp module
export const mockSharpBuffer = Buffer.from('mock-processed-image')
export const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  composite: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  flatten: vi.fn().mockReturnThis(),
  metadata: vi.fn().mockResolvedValue({ width: 1000, height: 800, format: 'jpeg' }),
  toBuffer: vi.fn().mockResolvedValue(mockSharpBuffer),
}
export const mockSharp = vi.fn(() => mockSharpInstance)

vi.mock('sharp', () => ({
  default: mockSharp,
}))

// 3. Mock the Satori module
export const mockSatori = vi.fn(() => Promise.resolve('<svg>mock svg</svg>'))

vi.mock('satori', () => ({
  default: mockSatori,
}))

// 4. Mock the Nodemailer module
export const mockSendMail = vi.fn()
export const mockTransporter = {
  sendMail: mockSendMail,
}
export const mockCreateTransport = vi.fn(() => mockTransporter)

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}))

// 5. Mock global fetch
export const mockFetch = vi.fn()
global.fetch = mockFetch

// 6. Reset all mocks before each test to ensure isolation
beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockClear()

  // Reset Sharp instance mock methods
  mockSharpInstance.resize.mockReturnThis()
  mockSharpInstance.composite.mockReturnThis()
  mockSharpInstance.jpeg.mockReturnThis()
  mockSharpInstance.png.mockReturnThis()
  mockSharpInstance.flatten.mockReturnThis()
  mockSharpInstance.metadata.mockResolvedValue({ width: 1000, height: 800, format: 'jpeg' })
  mockSharpInstance.toBuffer.mockResolvedValue(mockSharpBuffer)
  mockSharp.mockReturnValue(mockSharpInstance)
  
  // Reset Satori mocks
  mockSatori.mockResolvedValue('<svg>mock svg</svg>')

  // Reset Nodemailer mocks
  mockSendMail.mockResolvedValue({ messageId: '<mock-message-id@gmail.com>' })
  mockCreateTransport.mockReturnValue(mockTransporter)

  // Provide a default "happy path" mock for fetch
  // Generate today's historical date (100 years ago) for the title
  const today = new Date()
  const historicalDate = new Date(today)
  historicalDate.setFullYear(today.getFullYear() - 100)
  const month = historicalDate.toLocaleString('en-US', { month: 'long' })
  const day = historicalDate.getDate()
  const year = historicalDate.getFullYear()
  
  // Default fetch mock: OAuth → Reddit API → Image download
  // Tests can override this with their own mockFetch setup
  mockFetch.mockImplementation((url: string | URL) => {
    const urlString = url.toString()
    
    // OAuth token request
    if (urlString.includes('access_token')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ access_token: 'mock_oauth_token_12345' }),
      } as Response)
    }
    
    // Reddit API request
    if (urlString.includes('oauth.reddit.com')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () =>
          Promise.resolve({
            data: {
              children: [
                {
                  data: {
                    title: `[${month} ${day}, ${year}] Mocked Historical Post`,
                    url: 'http://mock.com/image.jpg',
                    score: 150,
                    permalink: '/r/100yearsago/comments/test',
                    post_hint: 'image',
                  },
                },
              ],
            },
          }),
      } as Response)
    }
    
    // Image download
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    } as Response)
  })

  // Provide a default "happy path" mock for Resend
  mockResendSend.mockResolvedValue({ data: { id: 'resend_123' }, error: null })
})

