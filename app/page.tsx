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
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:py-20 relative overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-violet/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute top-1/3 left-1/5 w-80 h-80 bg-electric/12 rounded-full blur-3xl pointer-events-none -z-10 animate-float" />
      <div className="absolute top-1/2 right-1/5 w-88 h-88 bg-gold/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />

      <div className="w-full max-w-4xl flex flex-col items-center text-center space-y-10">
        {/* Magical Book Emblem inspired by nf2u.jpg */}
        <div className="relative group cursor-pointer">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#7C5CFF] via-[#1E1B4B] to-[#0D1020] border border-lavender/30 shadow-glow-violet flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-all duration-300 ease-spring">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(246,213,138,0.35),transparent_70%)]" />
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-gold drop-shadow-[0_0_12px_rgba(246,213,138,0.7)]" />
            <Sparkles className="w-5 h-5 text-lavender-light absolute top-2 right-2 animate-pulse" />
          </div>
        </div>

        {/* Product Identity Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/12 text-xs text-lavender font-semibold backdrop-blur-md shadow-glass">
          <Stars className="w-3.5 h-3.5 text-gold" />
          <span>{language === "th" ? "สนามสอบจำลอง ติวร่วมกับเพื่อนก่อนสอบจริง" : "A better way to practice with friends before an exam."}</span>
        </div>

        {/* Hero Title & Editorial Tagline */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-r from-white via-[#E7E9F2] to-[#C4B5FD] bg-clip-text text-transparent drop-shadow-[0_2px_24px_rgba(124,92,255,0.25)]">
            Nécessaire
          </h1>
          <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-lavender-light via-white to-gold bg-clip-text text-transparent tracking-wide">
            {t.home.tagline}
          </p>
          <p className="text-sm sm:text-base text-gray-300/90 leading-relaxed font-normal max-w-lg mx-auto">
            {language === "th"
              ? "ฝึกทำข้อสอบเป็นกลุ่ม อภิปรายเหตุผลใน Discord และเปลี่ยนคำตอบก่อนเฉลย เพื่อสร้างความจำระยะยาว"
              : "Experience collaborative mock tests where you think independently, debate in Discord, revise answers, and cement true understanding."}
          </p>
        </div>

        {/* The Two Main Action Cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 text-left">
          {/* Action 1: Host */}
          <Link href="/create" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
            <div className="h-full rounded-2xl p-6 bg-gradient-to-br from-violet/15 via-[#11152A]/90 to-[#080A14] border border-white/10 group-hover:border-lavender/50 shadow-glass flex flex-col justify-between transition-all duration-300 ease-spring group-hover:translate-y-[-3px] group-hover:shadow-glow-violet">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C5CFF] to-[#6366F1] flex items-center justify-center text-white shadow-glow-violet mb-4 group-hover:scale-110 transition-all duration-300 ease-spring">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-lavender-light transition-colors">
                  {t.home.hostBtn}
                </h3>
                <p className="text-gray-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {t.home.hostDesc}
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full mt-6 justify-between shadow-glow"
                rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              >
                {language === "th" ? "สร้างห้องสอบใหม่" : "Create Room"}
              </Button>
            </div>
          </Link>

          {/* Action 2: Join */}
          <Link href="/join" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-electric rounded-2xl">
            <div className="h-full rounded-2xl p-6 bg-gradient-to-br from-electric/15 via-[#11152A]/90 to-[#080A14] border border-white/10 group-hover:border-electric/50 shadow-glass flex flex-col justify-between transition-all duration-300 ease-spring group-hover:translate-y-[-3px] group-hover:shadow-glow-blue">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F7CFF] to-[#6D8DFF] flex items-center justify-center text-white shadow-glow-blue mb-4 group-hover:scale-110 transition-all duration-300 ease-spring">
                  <LogIn className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-light transition-colors">
                  {t.home.joinBtn}
                </h3>
                <p className="text-gray-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {t.home.joinDesc}
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full mt-6 justify-between border-white/15 hover:border-electric/50"
                rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              >
                {language === "th" ? "ใส่รหัสเข้าห้องสอบ" : "Enter Code"}
              </Button>
            </div>
          </Link>
        </div>

        {/* Interactive Loop Demonstration Card */}
        <div className="w-full p-6 sm:p-8 rounded-2xl bg-[#11152A]/70 border border-white/10 shadow-glass text-left space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-lavender flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                {language === "th" ? "สัมผัสประสบการณ์เรียนรู้แบบใหม่" : "The Core Learning Experience"}
              </span>
              <h4 className="text-lg font-bold text-white">
                Think → Lock → Discuss → Change → Reveal → Remember
              </h4>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs text-gray-300">
              <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
              <span>Voice in Discord</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-center">
            {steps.map((step, idx) => (
              <div
                key={step.label}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center hover:border-lavender/40 hover:bg-white/[0.06] transition-all duration-300 ease-spring"
              >
                <span className="text-[10px] text-gold font-mono font-bold">0{idx + 1}</span>
                <span className="text-xs font-bold text-white mt-1">{step.label}</span>
                <span className="text-[11px] text-gray-400 mt-1 leading-tight">{step.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
