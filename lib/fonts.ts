import { Manrope, Inter } from "next/font/google";

export const fontDisplay = Manrope({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

export const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});
