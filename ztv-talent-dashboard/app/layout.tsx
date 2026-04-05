import type { Metadata } from "next";
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

export const metadata = {
  title: "Zee Talent Intelligence",
  description: "Live social reach and engagement metrics for the Zee network talent roster.",
  openGraph: {
    title: "Zee Talent Intelligence",
    description: "Real-time Instagram extensions & engagement analytics for Zee talent.",
    url: "https://ztv-ig-tracker.vercel.app/",
    siteName: "Zee Entertainment",
    images: [
      {
        url: "/og-image.jpg", // We will create this in the next step
        width: 1200,
        height: 630,
        alt: "Zee Talent Intelligence Dashboard Preview",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
