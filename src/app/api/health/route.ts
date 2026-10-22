import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "disconnected",
        error: "Database connectivity check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
