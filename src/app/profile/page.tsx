import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileClient } from "@/components/profile/ProfileClient";

export const metadata: Metadata = {
  title: "My Profile — PULSE",
  description: "Manage your PULSE citizen profile and account security settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export const instant = false;

export default async function ProfilePage() {
  const sessionWithUser = await getCurrentUser();

  if (!sessionWithUser) {
    redirect("/login?redirect=/profile");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      <Navbar />

      <main className="flex-1 py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Citizen Account Profile
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Manage your display identity, view membership details, and update your security credentials.
            </p>
          </div>

          <ProfileClient user={sessionWithUser.user} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
