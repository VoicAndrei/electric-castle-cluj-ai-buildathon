import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bonți — Electric Castle 2026",
  description: "Your EC friend. From 'should I even go?' to dancing at the right stage.",
  icons: {
    icon: "/icons/bonti-32.png",
    apple: "/icons/bonti-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
