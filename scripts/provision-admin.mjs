#!/usr/bin/env node

/**
 * PULSE Operator Provisioning Utility
 *
 * Secure one-time script for initializing the first administrator account.
 * This runs out-of-band in an operator shell, preventing public registration role escalation.
 *
 * Usage:
 *   node --env-file=.env.local scripts/provision-admin.mjs
 *
 * Required environment variables (or prompted):
 *   INITIAL_ADMIN_EMAIL
 *   INITIAL_ADMIN_PASSWORD (min 8 chars)
 *   INITIAL_ADMIN_NAME (optional, defaults to "Lead Administrator")
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
const adminName = process.env.INITIAL_ADMIN_NAME || "PULSE Lead Administrator";

async function provisionAdmin() {
  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI environment variable is missing.");
    process.exit(1);
  }

  if (!adminEmail || !adminPassword) {
    console.error("Error: Missing required provisioning variables.");
    console.error("Please configure INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in .env.local");
    process.exit(1);
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    console.error("Error: INITIAL_ADMIN_EMAIL is not a valid email address.");
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error("Error: INITIAL_ADMIN_PASSWORD must be at least 8 characters long.");
    process.exit(1);
  }

  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGODB_URI);

    const UserSchema = new mongoose.Schema(
      {
        name: String,
        email: { type: String, unique: true },
        passwordHash: String,
        role: String,
        status: String,
      },
      { timestamps: true }
    );

    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    // Check if an account already exists with this email
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.role === "admin") {
        console.log(`Notice: An administrator account with email [${normalizedEmail}] already exists.`);
        console.log("No changes were made.");
        await mongoose.disconnect();
        process.exit(0);
      } else {
        // Safe operator promotion of existing user
        console.log(`Promoting verified account [${normalizedEmail}] to administrator role...`);
        existing.role = "admin";
        await existing.save();
        console.log("Success: Existing account has been promoted to administrator.");
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    console.log("Generating secure bcrypt password hash...");
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await User.create({
      name: adminName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      status: "active",
    });

    console.log(`Success: Initial administrator account successfully created for [${normalizedEmail}].`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Provisioning failed:", error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

provisionAdmin();
