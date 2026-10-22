import { getCurrentUser, createSuccessResponse } from "@/lib/auth";

export async function GET() {
  try {
    const sessionWithUser = await getCurrentUser();

    if (!sessionWithUser) {
      return createSuccessResponse({ user: null });
    }

    return createSuccessResponse({
      user: sessionWithUser.user,
    });
  } catch {
    return createSuccessResponse({ user: null });
  }
}
