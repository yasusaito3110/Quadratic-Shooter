import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quadratic Shooter",
  description: "Training web app for quadratic completion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
