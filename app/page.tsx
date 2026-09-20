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
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs text-primary-accent font-medium">
          <Zap className="w-3.5 h-3.5" />
          <span>{language === "th" ? "ติวสอบร่วมกับเพื่อนก่อนสอบ" : "Pre-exam practice with friends"}</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
            Nécessaire
          </h1>
          <p className="text-lg sm:text-2xl font-medium text-primary-accent italic">
            {t.home.tagline}
          </p>
          <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
            {t.home.subtitle}
          </p>
        </div>

        {/* The Two Main Actions */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 text-left">
          {/* Action 1: Host */}
          <Link href="/create" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
            <Card hoverable className="h-full border-card-border group-hover:border-primary/50 flex flex-col justify-between">
              <CardHeader className="border-b-0 pb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary-accent mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">{t.home.hostBtn}</CardTitle>
                <CardDescription>
                  {t.home.hostDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="primary"
                  className="w-full mt-4 justify-between"
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  {language === "th" ? "สร้างห้องใหม่" : "Create Room"}
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Action 2: Join */}
          <Link href="/join" className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
            <Card hoverable className="h-full border-card-border group-hover:border-primary/50 flex flex-col justify-between">
              <CardHeader className="border-b-0 pb-2">
                <div className="w-10 h-10 rounded-lg bg-gray-800 border border-card-border flex items-center justify-center text-gray-300 mb-3 group-hover:bg-primary/20 group-hover:text-primary-accent group-hover:border-primary/40 transition-colors">
                  <LogIn className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">{t.home.joinBtn}</CardTitle>
                <CardDescription>
                  {t.home.joinDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="secondary"
                  className="w-full mt-4 justify-between group-hover:border-primary-accent/40"
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  {language === "th" ? "ใส่รหัสเข้าห้อง" : "Enter Code"}
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Minimal Study Loop & Discord reminder */}
        <div className="w-full pt-8 border-t border-card-border/50">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">
            <span>{t.home.flowTitle}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
            {steps.map((step, idx) => (
              <div
                key={step.label}
                className="bg-card/60 border border-card-border/60 rounded-lg p-3 flex flex-col items-center justify-center"
              >
                <span className="text-[10px] text-gray-500 font-mono">0{idx + 1}</span>
                <span className="text-xs font-semibold text-gray-200 mt-0.5">{step.label}</span>
                <span className="text-[11px] text-gray-400 mt-1 leading-tight">{step.desc}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>{language === "th" ? "เปิดห้องคุยเสียงใน Discord ระหว่างทำข้อสอบเพื่อประสิทธิภาพสูงสุด" : "Hop on a Discord call with your friends while testing"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
