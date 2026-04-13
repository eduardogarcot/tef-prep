import { Resend } from 'resend'

interface EvaluationNotificationParams {
  toEmail: string
  section: string
  title: string
  globalScore: number
  nclcLevel: string
  estimatedTefScore?: number
  exerciseId: string
}

/**
 * Sends an email notification when a TEF evaluation is complete.
 * Uses Resend free tier (3,000 emails/month).
 * Errors are non-fatal — caller should catch and log.
 */
export async function sendEvaluationNotification({
  toEmail,
  section,
  title,
  globalScore,
  nclcLevel,
  estimatedTefScore,
  exerciseId,
}: EvaluationNotificationParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email notification')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const reviewUrl = `${appUrl}/exercise/${exerciseId}`

  const scoreColor = globalScore >= 9 ? '#15803d' : globalScore >= 6 ? '#b45309' : '#b91c1c'
  const tefInfo = estimatedTefScore !== undefined
    ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Estimated TEF score: <strong>${estimatedTefScore}/699</strong></p>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#2563eb;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">TEF Prep</p>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Your evaluation is ready ✅</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Section ${section}</p>
            <p style="margin:0 0 24px;color:#0f172a;font-size:16px;font-weight:600;">${title}</p>

            <!-- Score block -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td align="center" style="padding:20px;">
                  <p style="margin:0;color:#64748b;font-size:13px;">Global score</p>
                  <p style="margin:4px 0 0;font-size:40px;font-weight:800;color:${scoreColor};">${globalScore}<span style="font-size:20px;font-weight:400;color:#94a3b8;">/12</span></p>
                  <p style="margin:6px 0 0;color:#2563eb;font-size:15px;font-weight:600;">${nclcLevel}</p>
                  ${tefInfo}
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${reviewUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                    View full evaluation →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
              You're receiving this because you submitted a TEF practice exercise.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'TEF Prep <onboarding@resend.dev>'

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: toEmail,
    subject: `✅ TEF evaluation ready — Section ${section} · ${globalScore}/12 (${nclcLevel})`,
    html,
  })

  if (error) {
    // Surface the full Resend error so it's visible in server logs / Vercel function logs
    throw new Error(`Resend error: ${JSON.stringify(error)}`)
  }

  console.log(`Email sent successfully — id: ${data?.id} → ${toEmail}`)
}
