import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doc Decoder | Human-in-the-Loop Clinical Report & Prescription Translator",
  description:
    "Turn lab reports and prescriptions into plain-language explanations in your language. Built with Gemma 4 multimodal perception and deterministic safety guardrails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
