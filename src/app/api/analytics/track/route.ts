import { NextRequest } from "next/server";
import { recordPageView } from "@/lib/analytics";
import { createSuccessResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const path = typeof body.path === "string" ? body.path : "/";
    const referrer = typeof body.referrer === "string" ? body.referrer : undefined;

    await recordPageView(path, referrer);
    return createSuccessResponse({ recorded: true });
  } catch {
    return createSuccessResponse({ recorded: false });
  }
}
