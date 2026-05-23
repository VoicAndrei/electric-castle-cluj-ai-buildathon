import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bonți — Electric Castle 2026",
  description: "Your EC friend. From 'should I even go?' to dancing at the right stage.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/bonti-32.png",
    apple: "/icons/bonti-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "Bonți",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#EB0000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
