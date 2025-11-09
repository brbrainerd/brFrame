import { vi, beforeEach } from "vitest";

// Set up OAuth credentials for all tests
process.env.REDDIT_CLIENT_ID = "test_client_id";
process.env.REDDIT_CLIENT_SECRET = "test_client_secret";
process.env.FRAME_EMAIL = "frame@test.com";
process.env.RESEND_FROM_EMAIL = "onboarding@resend.dev";
process.env.RESEND_API_KEY = "resend-test-key";
process.env.CRON_SECRET = "test_cron_secret";
process.env.CRON_LOG_LEVEL = "debug";

// 1. Mock the Resend module
// We create a mock function that we can assert against
export const mockResendSend = vi.fn();
vi.mock("resend", () => {
  // Mock the class constructor 'new Resend()'
  class Resend {
    emails = {
      send: mockResendSend,
    };
  }
  return { Resend };
});

// 2. Mock the Sharp module
export const mockSharpBuffer = Buffer.from("mock-processed-image");
export const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  composite: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  flatten: vi.fn().mockReturnThis(),
  metadata: vi
    .fn()
    .mockResolvedValue({ width: 1000, height: 800, format: "jpeg" }),
  toBuffer: vi.fn().mockResolvedValue(mockSharpBuffer),
};
export const mockSharp = vi.fn(() => mockSharpInstance);

vi.mock("sharp", () => ({
  default: mockSharp,
}));

export const mockSatori = vi.fn(() => Promise.resolve("<svg>mock svg</svg>"));

vi.mock("satori", () => ({
  default: mockSatori,
}));

// 3. Mock Satori to capture overlay rendering without real SVG generation

// 4. Mock the Nodemailer module
export const mockSendMail = vi.fn();
export const mockTransporter = {
  sendMail: mockSendMail,
};
export const mockCreateTransport = vi.fn(() => mockTransporter);

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

// 5. Mock global fetch
export const mockFetch = vi.fn();
global.fetch = mockFetch;

export const defaultFetchImplementation = (url: string | URL) => {
  const urlString = url.toString();

  const today = new Date();
  const historicalDate = new Date(today);
  historicalDate.setFullYear(today.getFullYear() - 100);
  const month = historicalDate.toLocaleString("en-US", { month: "long" });
  const day = historicalDate.getDate();
  const year = historicalDate.getFullYear();

  // OAuth token request
  if (urlString.includes("access_token")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ access_token: "mock_oauth_token_12345" }),
    } as Response);
  }

  // Reddit API request
  if (urlString.includes("oauth.reddit.com")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve(""),
      json: () =>
        Promise.resolve({
          data: {
            children: [
              {
                data: {
                  title: `[${month} ${day}, ${year}] Mocked Historical Post`,
                  url: "http://mock.com/image.jpg",
                  score: 150,
                  permalink: "/r/100yearsago/comments/test",
                  post_hint: "image",
                },
              },
            ],
          },
        }),
    } as Response);
  }

  // Font fetch for overlay rendering (Inter Regular and SemiBold)
  if (urlString.includes("fonts.gstatic.com") || urlString.includes("inter")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
    } as Response);
  }

  // Image download
  return Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
  } as Response);
};

// Helper to generate date strings in all 4 format variations
export function generateDateFormats(
  month: string,
  day: number,
  year: number,
): string[] {
  const getDaySuffix = (d: number): string => {
    if (d >= 11 && d <= 13) return "th";
    switch (d % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const dayWithSuffix = day + getDaySuffix(day);

  return [
    `[${month} ${dayWithSuffix}, ${year}]`, // With suffix and comma
    `[${month} ${day}, ${year}]`, // Without suffix, with comma
    `[${month} ${dayWithSuffix} ${year}]`, // With suffix, no comma
    `[${month} ${day} ${year}]`, // Without suffix or comma
  ];
}

// 6. Reset all mocks before each test to ensure isolation
beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockClear();

  // Reset Sharp instance mock methods
  mockSharpInstance.resize.mockReturnThis();
  mockSharpInstance.composite.mockReturnThis();
  mockSharpInstance.jpeg.mockReturnThis();
  mockSharpInstance.png.mockReturnThis();
  mockSharpInstance.flatten.mockReturnThis();
  mockSharpInstance.metadata.mockResolvedValue({
    width: 1000,
    height: 800,
    format: "jpeg",
  });
  mockSharpInstance.toBuffer.mockResolvedValue(mockSharpBuffer);
  mockSharp.mockReturnValue(mockSharpInstance);

  // No additional resets needed for SVG rendering

  // Reset Nodemailer mocks
  mockSendMail.mockResolvedValue({ messageId: "<mock-message-id@gmail.com>" });
  mockCreateTransport.mockReturnValue(mockTransporter);

  // Provide a default "happy path" mock for fetch
  mockFetch.mockImplementation(defaultFetchImplementation);

  // Provide a default "happy path" mock for Resend
  mockResendSend.mockResolvedValue({ data: { id: "resend_123" }, error: null });
});
