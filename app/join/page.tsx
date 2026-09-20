"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, User, LogIn, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function JoinRoomPage() {
  const { info, error } = useToast();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [errors, setErrors] = useState<{ roomCode?: string; nickname?: string }>({});
  const [isJoining, setIsJoining] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Force uppercase and remove special characters
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setRoomCode(val);
    if (errors.roomCode) {
      setErrors((prev) => ({ ...prev, roomCode: undefined }));
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { roomCode?: string; nickname?: string } = {};

    if (!roomCode.trim()) {
      newErrors.roomCode = "Room code is required";
    } else if (roomCode.trim().length < 4) {
      newErrors.roomCode = "Room code must be at least 4 characters";
    }

    if (!nickname.trim()) {
      newErrors.nickname = "Nickname is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      error("Please check the fields and try again.", "Validation Error");
      return;
    }

    setIsJoining(true);
    setTimeout(() => {
      setIsJoining(false);
      info(
        `Phase 1 Preview: Validated code [${roomCode}] as [${nickname}]! Room connection will be live in Phase 2.`,
        "UI Scaffolding Active"
      );
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-md space-y-6">
        {/* Top bar back link & help */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-accent transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Need help?</span>
          </button>
        </div>

        <form onSubmit={handleJoin}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-gray-400 mb-1 text-xs font-semibold uppercase tracking-wider">
                <LogIn className="w-4 h-4 text-primary-accent" />
                <span>Join Session</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl">Enter Room</CardTitle>
              <CardDescription>
                Enter the room code shared by your host and choose your nickname.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Room Code */}
              <Input
                label="Room Code *"
                placeholder="e.g. EXAM42"
                value={roomCode}
                onChange={handleRoomCodeChange}
                error={errors.roomCode}
                leftIcon={<KeyRound className="w-4 h-4" />}
                className="font-mono tracking-wider uppercase text-base placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                maxLength={10}
                autoFocus
              />

              {/* Nickname */}
              <Input
                label="Your Nickname *"
                placeholder="e.g. Jordan"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (errors.nickname) setErrors((prev) => ({ ...prev, nickname: undefined }));
                }}
                error={errors.nickname}
                leftIcon={<User className="w-4 h-4" />}
                maxLength={20}
              />
            </CardContent>

            <CardFooter>
              <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
                Cancel
              </Link>
              <Button
                type="submit"
                variant="primary"
                isLoading={isJoining}
              >
                Join Room
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>

      {/* Help Modal demonstration */}
      <Modal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="Joining a Nécessaire Room"
        description="How to connect with your study group"
      >
        <div className="space-y-3 text-xs sm:text-sm text-gray-300">
          <p>
            1. Ask your study group friend who hosted the room for their <strong>Room Code</strong>.
          </p>
          <p>
            2. Enter a recognizable <strong>Nickname</strong> so everyone knows whose score is whose after answering.
          </p>
          <p>
            3. Join your friends in your regular <strong>Discord voice channel</strong> to discuss answers together.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsHelpModalOpen(false)}
          >
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  );
}
