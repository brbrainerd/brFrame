import 'dotenv/config'

async function triggerCron() {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw new Error('CRON_SECRET is not set in .env.local')
  }

  // Use production URL if available, otherwise default to localhost
  const vercelUrl = process.env.VERCEL_URL
  const url = vercelUrl
    ? `https://${vercelUrl}/api/cron`
    : 'http://localhost:3000/api/cron'

  console.log(`\n[Trigger] Manually triggering cron job at: ${url}\n`)

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    })

    const json = await response.json()

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${JSON.stringify(json)}`
      )
    }

    const logs = Array.isArray(json.logs) ? json.logs : []

    console.log('[Response] Summary')
    console.log(
      JSON.stringify(
        {
          success: json.success,
          message: json.message ?? json.error,
          error: json.error,
        },
        null,
        2
      )
    )
    console.log('---------------------------\n')

    if (json.chosenPost) {
      const { title, imageUrl, score, permalink } = json.chosenPost
      console.log('[Chosen Post]')
      console.log(`Title     : ${title}`)
      console.log(`Score     : ${score}`)
      console.log(`Image URL : ${imageUrl}`)
      console.log(`Permalink : ${permalink}`)
      console.log('---------------------------\n')
    }

    if (logs.length > 0) {
      const levelIcons: Record<string, string> = {
        info: 'INFO ',
        warn: 'WARN ',
        error: 'ERR  ',
        debug: 'DBG  ',
      }

      console.log('[Logs] Captured output')
      for (const entry of logs) {
        const timestamp = entry.timestamp
          ? new Date(entry.timestamp).toISOString()
          : new Date().toISOString()
        const level = (entry.level ?? 'info').toLowerCase()
        const icon = levelIcons[level] ?? levelIcons.info
        const message =
          entry.message ??
          (Array.isArray(entry.fragments) ? entry.fragments.join(' ') : '')

        console.log(`${icon}[${timestamp}] [${level.toUpperCase()}] ${message}`)
      }
      console.log('---------------------------\n')
    }

    if (json.success) {
      console.log('OK   Success! Check your frame/email.')
      console.log(`Email sent to: ${process.env.FRAME_EMAIL}`)
      console.log('Link : https://resend.com/emails')
      console.log('Frame: Check your Pix-Star frame for the new image!\n')
    } else {
      const message = json.error ?? json.message ?? 'Unknown error'
      console.warn(`WARN  Job finished with non-success: ${message}\n`)
    }
  } catch (error) {
    console.error('ERR   Trigger failed:', error)
    process.exit(1)
  }
}

triggerCron()


