import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulse.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PULSE — Public Opinion on Global Issues",
    template: "%s | PULSE",
  },
  description:
    "An independent, modern public-opinion platform where verified citizens debate and vote on news-shaping issues, policy developments, and global affairs.",
  keywords: [
    "public opinion",
    "news polling",
    "policy debate",
    "global surveys",
    "civic sentiment",
  ],
  authors: [{ name: "PULSE Editorial Team" }],
  openGraph: {
    title: "PULSE — Public Opinion on Global Issues",
    description:
      "An independent, modern public-opinion platform where verified citizens debate and vote on news-shaping issues, policy developments, and global affairs.",
    url: siteUrl,
    siteName: "PULSE",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PULSE — Public Opinion on Global Issues",
    description:
      "An independent, modern public-opinion platform where verified citizens debate and vote on news-shaping issues, policy developments, and global affairs.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#090a0f] text-[#f4f4f7] selection:bg-rose-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
