import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "brFrame - Historical Photo Frame",
  description: "Daily historical photos delivered to your digital frame",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
