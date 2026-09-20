"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Copy,
  Check,
  Crown,
  Play,
  Share2,
  Sparkles,
  ArrowLeft,
  Loader2,
  LogOut,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getRoomDetails, startRoom, leaveRoom } from "@/lib/room";
import { useRoomRealtime, broadcastRoomEvent, RoomEvent } from "@/lib/realtime";
import { Room, Player, MockWithQuestions, ChoiceLetter } from "@/types";

export default function RoomLobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();
  const { success, error, info } = useToast();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [mock, setMock] = useState<MockWithQuestions | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // Copy states
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Active question answering state (for phase transition to Question 1)
  const [selectedChoice, setSelectedChoice] = useState<ChoiceLetter | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Fetch initial room details
  const loadRoom = useCallback(async () => {
    try {
      const details = await getRoomDetails(roomCode);
      if (!details) {
        setRoom(null);
        setLoading(false);
        return;
      }

      setRoom(details.room);
      setMock(details.mock);
      setPlayers(details.players);

      // Check current player session
      if (typeof window !== "undefined") {
        const storedPlayerId = sessionStorage.getItem(`necessaire_player_${roomCode}`);
        if (storedPlayerId) {
          setCurrentPlayerId(storedPlayerId);
          const current = details.players.find((p) => p.id === storedPlayerId);
          if (current) {
            setIsHost(current.isHost);
          }
        } else {
          // Unidentified user navigated directly to /room/CODE
          // If in lobby, redirect to /join?code=CODE
          if (details.room.status === "LOBBY") {
            router.push(`/join?code=${roomCode}`);
            return;
          }
        }
      }
    } catch (err) {
      console.error("Failed to load room:", err);
    } finally {
      setLoading(false);
    }
  }, [roomCode, router]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Handle Realtime events
  const handleRealtimeEvent = useCallback(
    (event: RoomEvent) => {
      switch (event.type) {
        case "PLAYER_JOINED":
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === event.player.id);
            if (exists) return prev;
            return [...prev, event.player];
          });
          info(`${event.player.nickname} joined the lobby!`);
          break;

        case "PLAYER_LEFT":
          setPlayers((prev) => prev.filter((p) => p.id !== event.playerId));
          break;

        case "ROOM_STARTED":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: event.status,
                  currentQuestion: event.currentQuestion,
                }
              : null
          );
          success("The host has started the mock test! Question 1 is live.", "Test Started");
          break;
      }
    },
    [info, success]
  );

  useRoomRealtime(roomCode, handleRealtimeEvent);

  // Copy Room Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setIsCopiedCode(true);
      success(`Room code ${roomCode} copied to clipboard!`, "Copied");
      setTimeout(() => setIsCopiedCode(false), 2000);
    } catch {
      error("Failed to copy room code.");
    }
  };

  // Copy Invite Link
  const handleCopyLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/join?code=${roomCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopiedLink(true);
      success("Invite link copied to clipboard! Send it to your friends.", "Link Copied");
      setTimeout(() => setIsCopiedLink(false), 2000);
    } catch {
      error("Failed to copy invite link.");
    }
  };

  // Host starts the Mock Test
  const handleStartMock = async () => {
    if (!isHost) return;

    setIsStarting(true);
    try {
      const res = await startRoom(roomCode);
      if (res.success) {
        // Broadcast to all connected clients
        await broadcastRoomEvent(roomCode, {
          type: "ROOM_STARTED",
          currentQuestion: 1,
          status: "ANSWERING",
        });

        setRoom((prev) =>
          prev
            ? {
                ...prev,
                status: "ANSWERING",
                currentQuestion: 1,
              }
            : null
        );
        success("Mock test started! Displaying Question 1 to all players.", "Started");
      } else {
        error(res.error || "Failed to start room.");
      }
    } catch (err: any) {
      error(err.message || "An error occurred starting the test.");
    } finally {
      setIsStarting(false);
    }
  };

  // Leave room
  const handleLeaveRoom = async () => {
    if (currentPlayerId) {
      await leaveRoom(roomCode, currentPlayerId);
      await broadcastRoomEvent(roomCode, {
        type: "PLAYER_LEFT",
        playerId: currentPlayerId,
      });
      sessionStorage.removeItem(`necessaire_player_${roomCode}`);
    }
    router.push("/join");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-gray-400">Loading lobby {roomCode}...</p>
      </div>
    );
  }

  if (!room || !mock) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <HelpCircle className="w-10 h-10 text-gray-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Room Not Found</h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Room <strong>{roomCode}</strong> does not exist or has already ended.
          </p>
          <div className="pt-2">
            <Link href="/join">
              <Button variant="primary" size="sm">
                Join Another Room
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: LOBBY VIEW (status === "LOBBY")
  // ==========================================
  if (room.status === "LOBBY") {
    return (
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:py-14 space-y-8">
        {/* Top Header info */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-error transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Lobby Active
            </span>
          </div>
        </div>

        {/* Room Code Showcase Card */}
        <Card className="border-primary/40 shadow-glow overflow-visible relative">
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Room Code
              </span>
              <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-widest py-1 select-all">
                {roomCode}
              </div>
            </div>

            {/* Mock details subtitle */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300">
              <span className="font-semibold text-white">{mock.title}</span>
              {mock.subject && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-card-border/60 text-gray-300">
                  <BookOpen className="w-3 h-3 text-gray-400" />
                  {mock.subject}
                </span>
              )}
              <span className="text-gray-500">• {mock.questions.length} questions</span>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                leftIcon={
                  isCopiedCode ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-primary-accent" />
                  )
                }
              >
                {isCopiedCode ? "Code Copied!" : "Copy Room Code"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                leftIcon={
                  isCopiedLink ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Share2 className="w-4 h-4 text-primary-accent" />
                  )
                }
              >
                {isCopiedLink ? "Link Copied!" : "Copy Invite Link"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Players List Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-accent" />
              <CardTitle className="text-base sm:text-lg">
                Players in Room ({players.length})
              </CardTitle>
            </div>
            <span className="text-xs text-gray-400">
              Waiting in Discord...
            </span>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {players.map((p) => {
                const isMe = p.id === currentPlayerId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      p.isHost
                        ? "bg-primary/[0.08] border-primary/40 text-white"
                        : "bg-[#0F1117] border-card-border text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          p.isHost
                            ? "bg-primary text-white shadow-glow-sm"
                            : "bg-card-border/70 text-gray-300"
                        }`}
                      >
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-sm font-medium block truncate">
                          {p.nickname} {isMe && <span className="text-xs text-primary-accent font-normal">(You)</span>}
                        </span>
                      </div>
                    </div>

                    {p.isHost && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-accent uppercase tracking-wider shrink-0 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        <Crown className="w-3 h-3 text-amber-400" />
                        Host
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action / Waiting Footer */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {isHost ? (
            <>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  You are the Host
                </h4>
                <p className="text-xs text-gray-400">
                  When everyone is ready in Discord, start the mock test.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartMock}
                isLoading={isStarting}
                className="w-full sm:w-auto shadow-glow"
                leftIcon={<Play className="w-5 h-5 fill-current" />}
              >
                Start Mock
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-3 py-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
              <span className="text-sm text-gray-300 font-medium">
                Waiting for host to start the test...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE MOCK TEST (status === "ANSWERING")
  // ==========================================
  const currentQIndex = (room.currentQuestion || 1) - 1;
  const currentQuestion = mock.questions[currentQIndex] || mock.questions[0];

  const choices: { letter: ChoiceLetter; text: string }[] = [
    { letter: "A", text: currentQuestion.choiceA },
    { letter: "B", text: currentQuestion.choiceB },
    { letter: "C", text: currentQuestion.choiceC },
    { letter: "D", text: currentQuestion.choiceD },
  ];

  const handleSelectChoice = (letter: ChoiceLetter) => {
    if (isLocked) return;
    setSelectedChoice(letter);
  };

  const handleToggleLock = () => {
    if (!selectedChoice) return;
    setIsLocked(!isLocked);
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:py-12 space-y-6">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between border-b border-card-border/60 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary-accent border border-primary/30 uppercase tracking-wider">
            Question {currentQIndex + 1} of {mock.questions.length}
          </span>
          <span className="text-xs text-gray-400">
            • Room {roomCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">
            {players.length} Players connected
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <Card className="border-card-border shadow-xl">
        <CardHeader className="bg-card-border/20 py-4 px-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Step 1: Think & Lock
            </span>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 px-2.5 py-0.5 rounded border border-success/30">
                <Check className="w-3.5 h-3.5" />
                Answer Locked ({selectedChoice})
              </span>
            ) : (
              <span className="text-xs text-gray-400">
                {selectedChoice ? "Click Lock Answer when ready" : "Choose your answer"}
              </span>
            )}
          </div>
          <CardTitle className="text-lg sm:text-xl text-white font-medium pt-2 leading-relaxed whitespace-pre-line">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-3">
          {choices.map((c) => {
            const isSelected = selectedChoice === c.letter;

            return (
              <button
                key={c.letter}
                type="button"
                disabled={isLocked}
                onClick={() => handleSelectChoice(c.letter)}
                className={`w-full text-left p-4 rounded-xl border flex items-start gap-3.5 transition-all select-none ${
                  isSelected
                    ? "border-primary bg-primary/15 text-white shadow-glow-sm"
                    : "border-card-border bg-[#0F1117] text-gray-300 hover:border-gray-600 hover:bg-card/50"
                } ${isLocked ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-card-border/60 text-gray-400"
                  }`}
                >
                  {c.letter}
                </span>
                <span className="text-sm pt-0.5 leading-snug">{c.text}</span>
              </button>
            );
          })}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-500">
              {isLocked
                ? "Locked! You can change answer after discussing in Discord."
                : "Select an option above to lock in your answer."}
            </span>

            <Button
              type="button"
              variant={isLocked ? "outline" : "primary"}
              disabled={!selectedChoice}
              onClick={handleToggleLock}
              size="md"
              className="w-full sm:w-auto"
            >
              {isLocked ? "Unlock Answer" : "Lock Answer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
