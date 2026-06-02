import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Members Hub - BlueUnicorn",
  icons: {
    icon: "/favicon.ico",
  },
  description: "Manage members, projects, chat, and alerts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
