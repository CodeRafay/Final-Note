import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Final Note - Secure Dead Man's Switch",
  description: "A secure, verification-based dead man's switch web application. Prepare private messages that are only released to chosen recipients if you become unavailable.",
  keywords: ["dead man's switch", "secure messaging", "final message", "legacy message"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased bg-gray-50 min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
