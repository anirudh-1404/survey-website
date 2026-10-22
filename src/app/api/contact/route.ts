import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactSubmissionModel } from "@/models/ContactSubmission";
import { verifyCsrfOrigin, checkRateLimit } from "@/lib/auth";
import { sanitizeCommentContent } from "@/lib/comments";
import { sendContactNotificationEmail } from "@/lib/mail";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact
 * Public contact form submission endpoint.
 * Protected with CSRF check, rate limiting, and honeypot spam defense.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify CSRF
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: "Cross-site request rejected." },
        { status: 403 }
      );
    }

    // 2. Parse JSON body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid form payload." },
        { status: 400 }
      );
    }

    const { name, email, subject, message, website } = body;

    // 3. Honeypot check: If the hidden honeypot field is filled, silently discard without consuming rate limit
    if (website && typeof website === "string" && website.trim().length > 0) {
      return NextResponse.json({
        success: true,
        message:
          "Thank you. Your message has been securely submitted to the PULSE editorial team.",
      });
    }

    // 4. IP-based rate limiting: max 5 submissions per 15 minutes per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimit = checkRateLimit(`contact_ip:${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many submissions from your connection. Please wait 15 minutes before sending another inquiry.",
        },
        { status: 429 }
      );
    }

    // 5. Validation
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Full name is required." },
        { status: 400 }
      );
    }
    const cleanName = sanitizeCommentContent(name);
    if (cleanName.length < 2 || cleanName.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be between 2 and 100 characters." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid email address is required." },
        { status: 400 }
      );
    }
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length > 254 || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== "string") {
      return NextResponse.json(
        { success: false, error: "Subject line is required." },
        { status: 400 }
      );
    }
    const cleanSubject = sanitizeCommentContent(subject);
    if (cleanSubject.length < 3 || cleanSubject.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Subject line must be between 3 and 200 characters.",
        },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }
    const cleanMessage = sanitizeCommentContent(message);
    if (cleanMessage.length < 10 || cleanMessage.length > 3000) {
      return NextResponse.json(
        {
          success: false,
          error: "Message must be between 10 and 3,000 characters.",
        },
        { status: 400 }
      );
    }

    // 6. Persist to MongoDB
    await connectToDatabase();
    await ContactSubmissionModel.create({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      status: "unread",
    });

    // 7. Dispatch email notification to rishabhloomba860@gmail.com
    // Handled safely so contact submission success is never affected if mailer is not yet configured
    sendContactNotificationEmail({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      submittedAt: new Date(),
    }).catch((mailErr) => {
      console.warn("[Contact API] Mail notification skipped or failed:", mailErr);
    });

    return NextResponse.json({
      success: true,
      message:
        "Thank you. Your message has been securely submitted to the PULSE editorial team.",
    });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Failed to process contact inquiry.";
    return NextResponse.json(
      { success: false, error: errMessage },
      { status: 500 }
    );
  }
}
