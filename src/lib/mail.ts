import nodemailer from "nodemailer";

export interface ContactNotificationData {
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt?: Date;
}

/**
 * Creates and returns a nodemailer transporter based on environment variables.
 * Supports standard Gmail App Passwords (service: 'gmail') or custom SMTP servers.
 */
function getTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!user || !pass) {
    return null;
  }

  // If a specific custom SMTP host is defined, use standard SMTP configuration
  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Default to standard Gmail service
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/**
 * Dispatches an email notification to the designated admin email
 * (default: rishabhloomba860@gmail.com) whenever someone submits the Contact Us form.
 */
export async function sendContactNotificationEmail(
  data: ContactNotificationData
): Promise<{ sent: boolean; reason?: string }> {
  const recipient =
    process.env.CONTACT_NOTIFICATION_EMAIL || "rishabhloomba860@gmail.com";
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      `[Email Notification] Mailer credentials not configured. Contact submission from "${data.name}" (${data.email}) for "${recipient}" was saved in database.`
    );
    return {
      sent: false,
      reason:
        "Mailer credentials not configured. Set EMAIL_USER and EMAIL_PASS to activate email dispatch.",
    };
  }

  const senderAddress =
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    '"PULSE Inquiries" <no-reply@pulse.org>';

  const formattedDate = (data.submittedAt || new Date()).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New PULSE Contact Form Submission</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090a0f; color: #f4f4f5; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #12141c; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #e11d48, #9f1239); padding: 24px 32px; color: white; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; }
          .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 32px; }
          .field { margin-bottom: 20px; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #a1a1aa; margin-bottom: 6px; font-weight: 600; }
          .value { font-size: 15px; color: #ffffff; line-height: 1.5; }
          .value a { color: #f43f5e; text-decoration: none; }
          .message-box { background-color: #181b26; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-top: 6px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #e4e4e7; }
          .footer { padding: 20px 32px; background-color: #0c0d13; border-top: 1px solid #27272a; font-size: 12px; color: #71717a; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PULSE • New Contact Form Inquiry</h1>
            <p>Received on ${formattedDate}</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Sender Name</div>
              <div class="value"><strong>${data.name}</strong></div>
            </div>
            <div class="field">
              <div class="label">Email Address</div>
              <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
            </div>
            <div class="field">
              <div class="label">Subject</div>
              <div class="value"><strong>${data.subject}</strong></div>
            </div>
            <div class="field">
              <div class="label">Message</div>
              <div class="message-box">${data.message}</div>
            </div>
          </div>
          <div class="footer">
            You received this email because you are the designated recipient for PULSE inquiries (<a href="mailto:${recipient}" style="color: #a1a1aa;">${recipient}</a>). You can directly hit "Reply" in your email client to respond to ${data.name}.
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
New Contact Inquiry from PULSE:
----------------------------------------
Date: ${formattedDate}
From: ${data.name} (${data.email})
Subject: ${data.subject}

Message:
${data.message}
----------------------------------------
Target Recipient: ${recipient}
  `.trim();

  try {
    await transporter.sendMail({
      from: senderAddress,
      to: recipient,
      replyTo: `"${data.name}" <${data.email}>`,
      subject: `[PULSE Inquiry] ${data.subject} - from ${data.name}`,
      text: textContent,
      html: htmlContent,
    });
    return { sent: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Email Notification Error] Failed to send email:", errorMsg);
    return { sent: false, reason: errorMsg };
  }
}
