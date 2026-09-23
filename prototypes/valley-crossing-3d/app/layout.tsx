import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "סימולטור ניתוח שטח טקטי",
  description:
    "סימולטור תלת-ממדי לניתוח שטח טקטי ובחירת ציר תנועה — מערכת אימון מבצעית.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
