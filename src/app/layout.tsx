import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getIssuer } from "@/lib/oauth/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? getIssuer()),
  title: {
    template: "%s · AXUS ID",
    default: "AXUS ID — One account for everything",
  },
  description:
    "AXUS ID is a secure single sign-on account with passkeys, multiple identities and OAuth 2.0, OpenID Connect and SAML support.",
  applicationName: "AXUS ID",
  openGraph: {
    type: "website",
    siteName: "AXUS ID",
    title: "AXUS ID — One account for everything",
    description:
      "Sign in with a passkey, Google or a password — and see exactly what each app gets before you continue.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AXUS ID — One account for everything",
    description:
      "Sign in with a passkey, Google or a password — and see exactly what each app gets before you continue.",
  },
  icons: {
    icon: [
      { url: "/icon-tm.png" },
      { url: "/icon-tm-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: [
      { url: "/icon-tm.png" },
      { url: "/icon-tm-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [
      { url: "/icon-tm.png" },
      { url: "/icon-tm-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
