import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pecalang — page watch",
  description:
    "Watch any URL on a schedule and get an LLM-written account of what changed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
