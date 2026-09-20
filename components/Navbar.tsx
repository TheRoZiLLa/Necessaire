"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function Navbar() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-card-border/80 bg-background/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary-accent group-hover:border-primary group-hover:bg-primary/20 transition-all">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white group-hover:text-primary-accent transition-colors">
              Nécessaire
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wider hidden sm:inline">
              {t.nav.tagline}
            </span>
          </div>
        </Link>

        {/* Navigation & Language Switcher */}
        <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-card-border bg-card/60 hover:bg-card hover:border-primary-accent/40 text-gray-300 hover:text-white transition-all text-xs font-semibold"
            title="Switch Language / เปลี่ยนภาษา"
          >
            <Globe className="w-3.5 h-3.5 text-primary-accent" />
            <span>{language === "th" ? "🇹🇭 ไทย" : "🇬🇧 EN"}</span>
          </button>

          <Link
            href="/create"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-card border border-transparent hover:border-card-border transition-all"
          >
            {t.nav.host}
          </Link>
          <Link
            href="/join"
            className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-card text-gray-200 hover:text-white border border-card-border hover:border-primary-accent/40 transition-all font-medium"
          >
            {t.nav.join}
          </Link>
        </nav>
      </div>
    </header>
  );
}
