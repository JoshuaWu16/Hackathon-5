import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { to, subject, body } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      )
    }

    // Use Resend API if available
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "HVAC Margin Rescue <onboarding@resend.dev>",
          to: [to],
          subject,
          text: body,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        console.error("[Email] Resend error:", err)
        return NextResponse.json(
          { error: "Failed to send email via Resend" },
          { status: 500 }
        )
      }

      const data = await response.json()
      return NextResponse.json({ success: true, id: data.id })
    }

    // Fallback: log the email content (no email provider configured)
    console.log("[Email] No RESEND_API_KEY configured. Email logged:")
    console.log(`[Email] To: ${to}`)
    console.log(`[Email] Subject: ${subject}`)
    console.log(`[Email] Body: ${body.substring(0, 200)}...`)

    return NextResponse.json({
      success: true,
      message: "Email logged (no email provider configured). Set RESEND_API_KEY for live delivery.",
    })
  } catch (error) {
    console.error("[Email] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
