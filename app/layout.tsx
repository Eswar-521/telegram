import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tinitiate CRM Telegram",
  description: "Business owner CRM for Telegram contacts, catalog, appointments, and chats."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
