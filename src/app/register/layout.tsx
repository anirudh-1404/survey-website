import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — PULSE",
  description: "Register for a verified PULSE citizen account to cast verified votes and participate in editorial discussions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
