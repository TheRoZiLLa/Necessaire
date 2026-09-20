"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function Navbar() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090C22]/80 backdrop-blur-xl shadow-lg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1 transition-all duration-200 ease-spring hover:scale-[1.02]"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-primary to-violet text-white shadow-glow-gold flex items-center justify-center group-hover:rotate-6 transition-all duration-300">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-rose-200 bg-clip-text text-transparent group-hover:brightness-125 transition-all">
              Nécessaire
            </span>
            <span className="text-[10px] text-amber-200/70 font-medium tracking-wider hidden sm:inline">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] hover:border-gold-light/50 text-gray-200 hover:text-white transition-all duration-200 ease-spring hover:scale-[1.03] active:scale-[0.97] text-xs font-semibold backdrop-blur-md"
            title="Switch Language / เปลี่ยนภาษา"
          >
            <Globe className="w-3.5 h-3.5 text-gold-light" />
            <span>{language === "th" ? "🇹🇭 ไทย" : "🇬🇧 EN"}</span>
          </button>

          <Link
            href="/create"
            className="px-3 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/[0.08] border border-white/10 hover:border-white/25 transition-all duration-200 ease-spring hover:scale-[1.03] active:scale-[0.97] font-medium"
          >
            {t.nav.host}
          </Link>
          <Link
            href="/join"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary to-[#E11D48] text-white hover:brightness-110 shadow-glow hover:shadow-lg transition-all duration-200 ease-spring hover:scale-[1.03] active:scale-[0.97] font-semibold text-xs sm:text-sm"
          >
            {t.nav.join}
          </Link>
        </nav>
      </div>
    </header>
  );
}
