import type { Metadata } from "next";
import { Russo_One, Work_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const displayFont = Russo_One({
  subsets: ["cyrillic", "latin"],
  weight: "400",
  variable: "--font-outfit",
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-work",
});

export const metadata: Metadata = {
  title: "Просвет",
  description: "Платформа для обучения цифровой грамотности населения России",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
