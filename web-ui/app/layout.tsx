import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Orchestration UI",
  description: "Web interface for MCP orchestration workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
