"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, User, LogIn, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { validateAndJoinRoom } from "@/lib/room";
import { broadcastRoomEvent } from "@/lib/realtime";
import { useLanguage } from "@/context/LanguageContext";

function JoinRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const { t } = useLanguage();

  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [errors, setErrors] = useState<{ roomCode?: string; nickname?: string }>({});
  const [isJoining, setIsJoining] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Pre-fill code if present in URL query (?code=XXXX)
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    }
  }, [searchParams]);

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setRoomCode(val);
    if (errors.roomCode) {
      setErrors((prev) => ({ ...prev, roomCode: undefined }));
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { roomCode?: string; nickname?: string } = {};

    if (!roomCode.trim()) {
      newErrors.roomCode = "Room code is required.";
    } else if (roomCode.trim().length < 3) {
      newErrors.roomCode = "Room code must be at least 3 characters.";
    }

    if (!nickname.trim()) {
      newErrors.nickname = "Nickname is required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsJoining(true);
    try {
      const res = await validateAndJoinRoom(roomCode.trim(), nickname.trim());

      if (!res.success || !res.room || !res.player) {
        const errorMsg = res.error || "Failed to join room.";
        error(errorMsg, "Cannot Join");
        if (errorMsg.toLowerCase().includes("nickname")) {
          setErrors({ nickname: errorMsg });
        } else if (errorMsg.toLowerCase().includes("code") || errorMsg.toLowerCase().includes("not found")) {
          setErrors({ roomCode: errorMsg });
        }
        return;
      }

      // Save player ID in sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`necessaire_player_${res.room.roomCode}`, res.player.id);
        sessionStorage.setItem(`necessaire_nickname_${res.room.roomCode}`, res.player.nickname);
      }

      // Broadcast join event to all other clients in this room
      await broadcastRoomEvent(res.room.roomCode, {
        type: "PLAYER_JOINED",
        player: res.player,
      });

      success(`Joined room ${res.room.roomCode} as ${res.player.nickname}!`, "Joined Room");
      router.push(`/room/${res.room.roomCode}`);
    } catch (err: any) {
      error(err.message || "An unexpected error occurred.", "Error");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Top bar back link & help */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-pencil/70 hover:text-pencil transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>{t.join.backHome}</span>
        </Link>
        <button
          type="button"
          onClick={() => setIsHelpModalOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-heading font-bold text-pencil/60 hover:text-pencil transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{t.join.needHelp}</span>
        </button>
      </div>

      <form onSubmit={handleJoin}>
        <Card tape={true} className="shadow-hard-lg">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sticky-yellow text-pencil px-2.5 py-0.5 rounded-wobbly-sm border border-pencil font-heading font-bold text-xs shadow-hard-sm">
                🏷️ {t.join.badge}
              </span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-heading font-extrabold text-pencil">{t.join.title}</CardTitle>
            <CardDescription className="text-pencil/70 font-body text-sm">
              {t.join.desc}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Room Code */}
            <Input
              label={t.join.roomCodeLabel}
              placeholder="e.g. AB72"
              value={roomCode}
              onChange={handleRoomCodeChange}
              error={errors.roomCode}
              leftIcon={<KeyRound className="w-4 h-4 text-pencil/60" />}
              className="font-mono tracking-widest uppercase text-lg placeholder:normal-case placeholder:font-body placeholder:tracking-normal font-bold"
              maxLength={8}
              autoFocus={!roomCode}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />

            {/* Nickname */}
            <Input
              label={t.join.nicknameLabel}
              placeholder="e.g. Milk"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errors.nickname) setErrors((prev) => ({ ...prev, nickname: undefined }));
              }}
              error={errors.nickname}
              leftIcon={<User className="w-4 h-4 text-pencil/60" />}
              maxLength={20}
              autoFocus={Boolean(roomCode)}
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
            />
          </CardContent>

          <CardFooter className="flex items-center justify-between pt-4 border-t-2 border-pencil/10">
            <Link href="/" className="text-xs font-heading font-bold text-pencil/60 hover:text-pencil transition-colors">
              {t.join.cancel}
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isJoining}
              className="font-heading font-bold px-6"
            >
              {isJoining ? t.join.joining : t.join.joinBtn}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Help Modal */}
      <Modal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title={t.join.helpTitle}
        description={t.join.helpDesc}
      >
        <div className="space-y-3 text-xs sm:text-sm font-body text-pencil/80 leading-relaxed">
          <p>📌 {t.join.help1}</p>
          <p>💬 {t.join.help2}</p>
          <p>✨ {t.join.help3}</p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsHelpModalOpen(false)}
            className="font-heading font-bold"
          >
            {t.join.gotIt}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-16">
      <Suspense fallback={<div className="text-xs font-body text-pencil/60">Loading form...</div>}>
        <JoinRoomForm />
      </Suspense>
    </div>
  );
}
