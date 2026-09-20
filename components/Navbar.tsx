"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function Navbar() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-pencil bg-paper/95 backdrop-blur-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-pen-blue rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-wobbly-sm bg-sticky-yellow border-2 border-pencil shadow-hard-sm flex items-center justify-center text-pencil group-hover:rotate-6 transition-transform">
            <Sparkles className="w-4 h-4 text-pencil" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-heading font-bold tracking-tight text-pencil group-hover:text-marker-red transition-colors">
              Nécessaire
            </span>
            <span className="text-xs text-pencil-light font-body -mt-1 hidden sm:inline">
              {t.nav.tagline}
            </span>
          </div>
        </Link>

        {/* Navigation & Language Switcher */}
        <nav className="flex items-center gap-2 sm:gap-3 text-sm font-body">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-wobbly-sm border-2 border-pencil bg-white text-pencil shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all text-xs font-semibold cursor-pointer"
            title="Switch Language / เปลี่ยนภาษา"
          >
            <Globe className="w-3.5 h-3.5 text-pencil" />
            <span>{language === "th" ? "🇹🇭 ไทย" : "🇬🇧 EN"}</span>
          </button>

          <Link
            href="/create"
            className="px-2.5 sm:px-3 py-1 font-heading font-bold text-sm text-pencil hover:text-marker-red hover:underline decoration-2 decoration-marker-red underline-offset-4 transition-all"
          >
            {t.nav.host}
          </Link>
          <Link
            href="/join"
            className="px-3.5 py-1 rounded-wobbly-sm border-2 border-pencil bg-white text-pencil shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-pen-blue hover:text-white font-heading font-bold text-sm transition-all"
          >
            {t.nav.join}
          </Link>
        </nav>
      </div>
    </header>
  );
}
