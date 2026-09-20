import type { Metadata } from "next";
import { Kalam, Patrick_Hand, Itim } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/Toast";
import { LanguageProvider } from "@/context/LanguageContext";

const kalam = Kalam({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-kalam",
  display: "swap",
});

const patrickHand = Patrick_Hand({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-patrick",
  display: "swap",
});

const itim = Itim({
  weight: ["400"],
  subsets: ["latin", "thai"],
  variable: "--font-itim",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nécessaire | Think. Discuss. Remember.",
  description: "A collaborative mock-test experience for students preparing for exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${kalam.variable} ${patrickHand.variable} ${itim.variable}`}
    >
      <body className="min-h-screen bg-paper text-pencil flex flex-col font-body selection:bg-sticky-yellow selection:text-pencil">
        <LanguageProvider>
          <ToastProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
