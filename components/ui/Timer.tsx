"use client";

import React, { useEffect, useState } from "react";

interface TimerProps {
  initialSeconds?: number;
  onComplete?: () => void;
  className?: string;
}

export function DiscussionTimer({
  initialSeconds = 90,
  onComplete,
  className = "",
}: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || secondsLeft <= 0) {
      if (secondsLeft === 0 && onComplete) onComplete();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, secondsLeft, onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Circular progress calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progress = (secondsLeft / initialSeconds) * circumference;

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Ambient circular glow */}
      <div className="absolute w-44 h-44 rounded-full bg-violet/20 blur-2xl pointer-events-none -z-10 animate-pulse-glow" />

      {/* SVG Countdown Ring */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          {/* Background track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="5"
          />
          {/* Animated progress ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#timerGradient)"
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C5CFF" />
              <stop offset="50%" stopColor="#4F7CFF" />
              <stop offset="100%" stopColor="#F6D58A" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Countdown Value */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black text-white font-mono tracking-wider drop-shadow-[0_2px_12px_rgba(124,92,255,0.5)]">
            {formattedTime}
          </span>
          <span className="text-[10px] font-mono text-lavender font-bold uppercase tracking-widest mt-0.5">
            Discuss
          </span>
        </div>
      </div>
    </div>
  );
}
