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

function JoinRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();

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
              placeholder="e.g. AB72"
              value={roomCode}
              onChange={handleRoomCodeChange}
              error={errors.roomCode}
              leftIcon={<KeyRound className="w-4 h-4" />}
              className="font-mono tracking-widest uppercase text-base placeholder:normal-case placeholder:font-sans placeholder:tracking-normal font-bold"
              maxLength={8}
              autoFocus={!roomCode}
            />

            {/* Nickname */}
            <Input
              label="Your Nickname *"
              placeholder="e.g. Milk"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errors.nickname) setErrors((prev) => ({ ...prev, nickname: undefined }));
              }}
              error={errors.nickname}
              leftIcon={<User className="w-4 h-4" />}
              maxLength={20}
              autoFocus={Boolean(roomCode)}
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

      {/* Help Modal */}
      <Modal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="Joining a Nécessaire Room"
        description="How to connect with your study group"
      >
        <div className="space-y-3 text-xs sm:text-sm text-gray-300">
          <p>
            1. Ask your study group friend who hosted the room for their <strong>4-letter Room Code</strong>.
          </p>
          <p>
            2. Enter a unique <strong>Nickname</strong> so everyone knows whose score is whose after answering.
          </p>
          <p>
            3. Once joined, wait in the <strong>Lobby</strong> until the host starts the test.
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

export default function JoinRoomPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-16">
      <Suspense fallback={<div className="text-xs text-gray-400">Loading form...</div>}>
        <JoinRoomForm />
      </Suspense>
    </div>
  );
}
