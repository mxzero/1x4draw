import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "1X4 — Fixed-odds draw",
  description: "Five players. One winner. Four times the stake.",
  applicationName: "1X4",
  appleWebApp: { capable: true, title: "1X4", statusBarStyle: "black-translucent" },
};

export const preferredRegion = ["sin1"];

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} bg-ink text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
