import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nécessaire | Think. Discuss. Remember.",
  description: "A simple way to practice with friends before an exam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
        <ToastProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
