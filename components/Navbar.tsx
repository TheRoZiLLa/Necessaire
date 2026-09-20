import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Navbar() {
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
            <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase hidden sm:inline">
              Think · Discuss · Remember
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <Link
            href="/create"
            className="px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-card border border-transparent hover:border-card-border transition-all"
          >
            Host Test
          </Link>
          <Link
            href="/join"
            className="px-3.5 py-1.5 rounded-lg bg-card text-gray-200 hover:text-white border border-card-border hover:border-primary-accent/40 transition-all font-medium"
          >
            Join Room
          </Link>
        </nav>
      </div>
    </header>
  );
}
