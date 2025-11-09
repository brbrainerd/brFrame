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

  console.log(`\n🔄 Manually triggering cron job at: ${url}\n`)

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

    console.log('📋 --- Trigger Response ---')
    console.log(JSON.stringify(json, null, 2))
    console.log('---------------------------\n')

    if (json.success) {
      console.log('✅ Success! Check your frame/email.')
      console.log(`📧 Email sent to: ${process.env.FRAME_EMAIL}`)
      console.log('🔗 Resend Dashboard: https://resend.com/emails')
      console.log('📱 Check your Pix-Star frame for the new image!\n')
    } else {
      console.warn(`⚠️  Job finished with non-success: ${json.message}\n`)
    }
  } catch (error) {
    console.error('❌ Trigger failed:', error)
    process.exit(1)
  }
}

triggerCron()

