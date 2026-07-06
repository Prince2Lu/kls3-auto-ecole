import type { Metadata } from "next";
import { fontBody } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "KLS3 Auto-École",
  description: "Gestion des dossiers élèves pour auto-écoles",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fontBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
