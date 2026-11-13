import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User, IUser } from "@/models/User";
import { requireAdmin, createErrorResponse, createSuccessResponse, getCurrentUser } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/password";

/**
 * GET /api/admin/admins
 * Retrieve all registered administrators with session awareness.
 */
export async function GET() {
  try {
    const sessionWithUser = await requireAdmin();
    await connectToDatabase();

    const admins = await User.find({ role: "admin" })
      .sort({ createdAt: 1 })
      .lean<IUser[]>();

    const currentUserId = sessionWithUser.user.id;

    const formattedAdmins = admins.map((admin, index) => ({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      createdAt: new Date(admin.createdAt).toISOString(),
      isCurrent: admin._id.toString() === currentUserId,
      isDefault: index === 0, // The first administrator created in the system
    }));

    return createSuccessResponse({
      admins: formattedAdmins,
      totalCount: formattedAdmins.length,
      currentUserId,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    return createErrorResponse(
      error.message || "Failed to retrieve administrators",
      error.statusCode || 500
    );
  }
}

/**
 * POST /api/admin/admins
 * Provision a new administrator account.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const errors: Record<string, string> = {};

    if (!name || name.length < 2) {
      errors.name = "Full name must be at least 2 characters long";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = "Please provide a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else {
      try {
        validatePassword(password);
      } catch (validationErr: unknown) {
        const pErr = validationErr as { message?: string };
        errors.password = pErr.message || "Password must be at least 8 characters long";
      }
    }

    if (Object.keys(errors).length > 0) {
      return createErrorResponse("Validation failed", 422, errors);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === "admin") {
        return createErrorResponse(
          "An administrator with this email address already exists.",
          409,
          { email: "This email is already registered as an administrator" }
        );
      } else {
        // Upgrade existing citizen to admin
        const newPasswordHash = await hashPassword(password);
        existingUser.role = "admin";
        existingUser.name = name || existingUser.name;
        existingUser.passwordHash = newPasswordHash;
        existingUser.status = "active";
        await existingUser.save();

        return createSuccessResponse(
          {
            admin: {
              id: existingUser._id.toString(),
              name: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
              status: existingUser.status,
              createdAt: new Date(existingUser.createdAt).toISOString(),
            },
            message: "Existing user successfully elevated to administrator.",
          },
          200
        );
      }
    }

    const passwordHash = await hashPassword(password);

    const newAdmin = await User.create({
      name,
      email,
      passwordHash,
      role: "admin",
      status: "active",
    });

    return createSuccessResponse(
      {
        admin: {
          id: newAdmin._id.toString(),
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          status: newAdmin.status,
          createdAt: new Date(newAdmin.createdAt).toISOString(),
        },
        message: "Administrator account created successfully.",
      },
      201
    );
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    return createErrorResponse(
      error.message || "Failed to create administrator account",
      error.statusCode || 500
    );
  }
}
