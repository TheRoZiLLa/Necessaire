"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, PlusCircle, LogIn, Disc as DiscordIcon, Sparkles, BookOpen, Stars } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t, language } = useLanguage();

  const steps = language === "th" ? [
    { label: "คิดเดี่ยว", desc: "ทำโจทย์ด้วยตัวเอง" },
    { label: "ล็อครอบ 1", desc: "ล็อคคำตอบแรก" },
    { label: "ถกเหตุผล", desc: "เห็นเพื่อนตอบ แล้วคุยใน Discord" },
    { label: "เปลี่ยนใจ", desc: "ปรับคำตอบ & ล็อครอบ 2" },
    { label: "เปิดเฉลย", desc: "Host เปิดเฉลยพร้อมกัน" },
    { label: "จำแม่น", desc: "ทบทวนข้อที่พลาด" },
  ] : [
    { label: "Think", desc: "Solve independently" },
    { label: "Lock 1st", desc: "Lock initial answer" },
    { label: "Discuss", desc: "See choices & debate in Discord" },
    { label: "Revise", desc: "Change & Lock 2nd" },
    { label: "Reveal", desc: "Host unlocks answer" },
    { label: "Remember", desc: "Review missed questions" },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-10 sm:py-16 relative overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-gold/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />

      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-8">
        {/* Magical Book Emblem inspired by nf2u.jpg */}
        <div className="relative group cursor-pointer">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-violet via-[#1E1B4B] to-[#0F172A] border border-amber-300/40 shadow-glow-gold flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-all duration-300 ease-spring">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.35),transparent_70%)]" />
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
            <Sparkles className="w-5 h-5 text-yellow-200 absolute top-2 right-2 animate-pulse" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-amber-300/30 text-xs text-amber-200 font-semibold backdrop-blur-md shadow-sm">
          <Stars className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === "th" ? "สนามสอบจำลอง ติวร่วมกับเพื่อนก่อนสอบจริง" : "Collaborative Pre-Exam Practice with Friends"}</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-white via-amber-100 to-rose-200 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(255,255,255,0.2)]">
            Nécessaire
          </h1>
          <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-rose-300 bg-clip-text text-transparent">
            {t.home.tagline}
          </p>
          <p className="text-sm sm:text-base text-gray-300/90 max-w-lg mx-auto leading-relaxed">
            {t.home.subtitle}
          </p>
        </div>

        {/* The Two Main Action Cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2 text-left">
          {/* Action 1: Host */}
          <Link href="/create" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
            <Card hoverable className="h-full border-white/15 group-hover:border-amber-400/60 flex flex-col justify-between p-1 bg-[#101438]/80">
              <CardHeader className="border-b-0 pb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-glow-gold mb-3 group-hover:scale-110 transition-all duration-300 ease-spring">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold text-white group-hover:text-amber-200 transition-colors">
                  {t.home.hostBtn}
                </CardTitle>
                <CardDescription className="text-gray-300 text-xs sm:text-sm mt-1">
                  {t.home.hostDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="primary"
                  className="w-full mt-4 justify-between"
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  {language === "th" ? "สร้างห้องสอบใหม่" : "Create Room"}
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Action 2: Join */}
          <Link href="/join" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
            <Card hoverable className="h-full border-white/15 group-hover:border-cyan/60 flex flex-col justify-between p-1 bg-[#101438]/80">
              <CardHeader className="border-b-0 pb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-white shadow-glow-cyan mb-3 group-hover:scale-110 transition-all duration-300 ease-spring">
                  <LogIn className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold text-white group-hover:text-cyan-light transition-colors">
                  {t.home.joinBtn}
                </CardTitle>
                <CardDescription className="text-gray-300 text-xs sm:text-sm mt-1">
                  {t.home.joinDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="secondary"
                  className="w-full mt-4 justify-between border-white/15 hover:border-cyan/50"
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  {language === "th" ? "ใส่รหัสเข้าห้องสอบ" : "Enter Code"}
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Minimal Study Loop & Discord reminder */}
        <div className="w-full pt-8 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-xs text-amber-200/80 font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.home.flowTitle}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
            {steps.map((step, idx) => (
              <div
                key={step.label}
                className="bg-white/[0.04] border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center hover:border-amber-400/30 transition-all duration-200 ease-spring"
              >
                <span className="text-[10px] text-amber-300/80 font-mono font-bold">0{idx + 1}</span>
                <span className="text-xs font-bold text-white mt-0.5">{step.label}</span>
                <span className="text-[11px] text-gray-300/80 mt-1 leading-tight">{step.desc}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 bg-white/[0.03] border border-white/10 rounded-full py-2 px-4 max-w-md mx-auto">
            <DiscordIcon className="w-4 h-4 text-[#5865F2] shrink-0" />
            <span>{language === "th" ? "เปิดห้องคุยเสียงใน Discord ระหว่างทำข้อสอบเพื่อประสิทธิภาพสูงสุด" : "Hop on a Discord call with your friends while testing"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
