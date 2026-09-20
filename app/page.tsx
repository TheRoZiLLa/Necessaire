"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, PlusCircle, LogIn, Disc as DiscordIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t, language } = useLanguage();

  const steps = language === "th" ? [
    { label: "คิด", desc: "ทำโจทย์ด้วยตัวเอง" },
    { label: "ล็อค", desc: "ล็อคคำตอบแรก" },
    { label: "ถก", desc: "เปิดไมค์คุยใน Discord" },
    { label: "เปลี่ยน", desc: "เปลี่ยนคำตอบที่มั่นใจ" },
    { label: "เฉลย", desc: "เปิดเฉลยพร้อมคำอธิบาย" },
    { label: "จำแม่น", desc: "ทบทวนข้อที่พลาด" },
  ] : [
    { label: "Think", desc: "Solve questions independently" },
    { label: "Lock", desc: "Lock your initial answer" },
    { label: "Discuss", desc: "Debate choices in Discord" },
    { label: "Change", desc: "Revise answer after discussion" },
    { label: "Reveal", desc: "Host reveals correct answer" },
    { label: "Remember", desc: "Cement key concepts" },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-8">
        {/* Study Tag Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sticky-yellow border-2 border-pencil rounded-wobbly-sm text-xs text-pencil font-heading font-bold shadow-hard-sm rotate-[-1deg]">
          <Zap className="w-3.5 h-3.5 text-pencil fill-pencil" />
          <span>{language === "th" ? "โต๊ะติวข้อสอบจำลองกับเพื่อน" : "Pre-exam practice with friends"}</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-7xl font-heading font-extrabold tracking-tight text-pencil">
            Nécessaire
          </h1>
          <p className="text-xl sm:text-2xl font-heading font-bold text-pencil">
            <span className="highlighter-yellow px-2 py-0.5">
              {t.home.tagline}
            </span>
          </p>
          <p className="text-base sm:text-lg font-body text-pencil/75 max-w-md mx-auto leading-relaxed">
            {t.home.subtitle}
          </p>
        </div>

        {/* The Two Main Actions: Host & Join Cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left">
          {/* Action 1: Host */}
          <Link href="/create" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-pencil rounded-wobbly">
            <Card tape={true} hoverable className="h-full flex flex-col justify-between group-hover:rotate-[0.5deg] transition-transform">
              <CardHeader className="border-b-2 border-pencil/15 pb-3">
                <div className="w-12 h-12 rounded-wobbly bg-sticky-yellow border-2 border-pencil flex items-center justify-center text-pencil mb-3 shadow-hard-sm group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-6 h-6 stroke-[2.2]" />
                </div>
                <CardTitle className="text-2xl font-heading font-bold text-pencil">{t.home.hostBtn}</CardTitle>
                <CardDescription className="text-pencil/70 font-body text-sm">
                  {t.home.hostDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Button
                  variant="primary"
                  className="w-full justify-between font-heading font-bold"
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  {language === "th" ? "สร้างห้องใหม่" : "Create Room"}
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Action 2: Join */}
          <Link href="/join" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-pencil rounded-wobbly">
            <Card tape={true} hoverable className="h-full flex flex-col justify-between group-hover:rotate-[-0.5deg] transition-transform">
              <CardHeader className="border-b-2 border-pencil/15 pb-3">
                <div className="w-12 h-12 rounded-wobbly bg-paper border-2 border-pencil flex items-center justify-center text-pencil mb-3 shadow-hard-sm group-hover:scale-105 transition-transform">
                  <LogIn className="w-6 h-6 stroke-[2.2]" />
                </div>
                <CardTitle className="text-2xl font-heading font-bold text-pencil">{t.home.joinBtn}</CardTitle>
                <CardDescription className="text-pencil/70 font-body text-sm">
                  {t.home.joinDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Button
                  variant="secondary"
                  className="w-full justify-between font-heading font-bold"
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  {language === "th" ? "ใส่รหัสเข้าห้อง" : "Enter Code"}
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Study Loop & Discord Reminder */}
        <div className="w-full pt-8 border-t-2 border-dashed border-pencil/30">
          <div className="flex items-center justify-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-pencil/60 mb-4">
            <span>✏️ {t.home.flowTitle}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
            {steps.map((step, idx) => (
              <div
                key={step.label}
                className="bg-card border-2 border-pencil rounded-wobbly-sm p-3 flex flex-col items-center justify-center shadow-hard-sm hover:-translate-y-0.5 transition-transform"
              >
                <span className="text-xs text-pencil/50 font-mono font-bold">0{idx + 1}</span>
                <span className="text-sm font-heading font-bold text-pencil mt-0.5">{step.label}</span>
                <span className="text-xs font-body text-pencil/70 mt-1 leading-tight">{step.desc}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-body font-medium bg-sticky-yellow/80 border-2 border-pencil rounded-wobbly-sm px-4 py-2 shadow-hard-sm text-pencil">
            <DiscordIcon className="w-4 h-4 text-[#5865F2] fill-[#5865F2]" />
            <span>{language === "th" ? "เปิดห้องคุยเสียงใน Discord ระหว่างทำข้อสอบเพื่อประสิทธิภาพสูงสุด 🎧" : "Hop on a Discord call with your friends while testing 🎧"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
