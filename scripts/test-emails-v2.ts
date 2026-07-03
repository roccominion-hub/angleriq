import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'hello@getangleriq.com'

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin: 0; padding: 0; background: #f8fafc; font-family: Arial, sans-serif; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .header { background: #1e3a5f; padding: 24px 32px; }
  .header table { border-collapse: collapse; }
  .header img { display: block; border-radius: 50%; }
  .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .header p { margin: 4px 0 0; color: #93c5fd; font-size: 13px; }
  .body { padding: 32px; color: #334155; font-size: 15px; line-height: 1.7; }
  .body p { margin: 0 0 16px; }
  .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 8px 0 20px; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  .footer { padding: 0 32px 28px; color: #94a3b8; font-size: 12px; line-height: 1.6; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right: 12px;"><img src="https://getangleriq.com/email-icon.png" width="40" height="40" alt="AnglerIQ" /></td>
        <td>
          <h1>AnglerIQ</h1>
          <p>Tournament-proven fishing intelligence</p>
        </td>
      </tr>
    </table>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <hr class="divider" />
    <p>AnglerIQ · getangleriq.com<br />
    Questions? Reply to this email and we'll get back to you.</p>
  </div>
</div>
</body>
</html>`
}

async function main() {
  const to = 'roccominion@gmail.com'
  const firstName = 'Rocco'

  const welcomeHtml = baseTemplate(`
    <p>Hey ${firstName},</p>
    <p>Welcome to AnglerIQ — you're in. Your 7-day free trial starts now.</p>
    <p>AnglerIQ gives you tournament-proven techniques, top baits, and AI-generated intel for any lake in our database — all filtered to your conditions.</p>
    <p>Here's how to get the most out of it:</p>
    <p>
      <strong>1. Search your home lake</strong> — start with the water you know best and see what the data shows.<br />
      <strong>2. Set your date</strong> — planning a trip? Pick a future date and we'll auto-fill season and forecast conditions.<br />
      <strong>3. Expand the filters</strong> — dial in by bait type, structure, depth, and more.<br />
      <strong>4. Ask AnglerIQ</strong> — tap the chat button anytime to ask our AI fishing assistant where to go, what to throw, or how to adjust for today's conditions. It knows the techniques, the baits, and the lakes — just ask.
    </p>
    <a href="https://getangleriq.com/search" class="btn">Run Your First Report →</a>
    <p>Your trial runs for 7 days. After that, Pro access is $2.99/month — less than a pack of hooks.</p>
    <p>Good luck out there,<br /><strong>The AnglerIQ Team</strong></p>
  `)

  const upgradeHtml = baseTemplate(`
    <p>Hey ${firstName},</p>
    <p>You're now a Pro member — full access, no limits.</p>
    <p>Your $2.99/month subscription is active and you can run as many reports as you need.</p>
    <a href="https://getangleriq.com/search" class="btn">Start Fishing Smarter →</a>
    <p>We're constantly adding new lakes, tournament data, and features, so check back often — the intel (and the app) gets better every week.</p>
    <p>Tight lines,<br /><strong>The AnglerIQ Team</strong></p>
  `)

  const r1 = await resend.emails.send({
    from: FROM,
    to,
    subject: '[TEST v2] Welcome to AnglerIQ 🎣',
    html: welcomeHtml,
  })
  console.log('welcome:', JSON.stringify(r1))

  const r2 = await resend.emails.send({
    from: FROM,
    to,
    subject: "[TEST v2] You're a Pro — AnglerIQ subscription confirmed ✅",
    html: upgradeHtml,
  })
  console.log('upgrade:', JSON.stringify(r2))
}

main().catch(e => { console.error(e); process.exit(1) })
