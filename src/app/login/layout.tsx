import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — PULSE",
  description: "Sign in to your verified PULSE citizen account to vote, participate in discussions, and track civic sentiment.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
