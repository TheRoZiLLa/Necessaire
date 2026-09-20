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
  Loader2,
  LogOut,
  HelpCircle,
  BookOpen,
  Disc as DiscordIcon,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lock,
  RefreshCw,
  Eye,
  RotateCcw,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getRoomDetails, startRoom, leaveRoom } from "@/lib/room";
import {
  submitInitialAnswer,
  setPlayerReady,
  transitionToChangePhase,
  submitFinalAnswer,
  revealAnswer,
  advanceToNextQuestion,
} from "@/lib/loop";
import { calculateRoomSummary, startReviewMode, exitReviewMode } from "@/lib/summary";
import { useRoomRealtime, broadcastRoomEvent, RoomEvent } from "@/lib/realtime";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  Room,
  Player,
  MockWithQuestions,
  ChoiceLetter,
  RevealData,
  RoomStatus,
  RoomSummary,
} from "@/types";

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
  const [isHostDisconnected, setIsHostDisconnected] = useState(false);

  // Copy states
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // -------------------------------------------------------------
  // Test Loop States
  // -------------------------------------------------------------
  // Answer Phase
  const [selectedInitialChoice, setSelectedInitialChoice] = useState<ChoiceLetter | null>(null);
  const [isInitialLocked, setIsInitialLocked] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isSubmittingInitial, setIsSubmittingInitial] = useState(false);

  // Discussion Phase
  const [isReady, setIsReady] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const [isUpdatingReady, setIsUpdatingReady] = useState(false);
  const [isProceedingToChange, setIsProceedingToChange] = useState(false);

  // Change Phase
  const [changeMode, setChangeMode] = useState<"keep" | "change" | null>(null);
  const [selectedFinalChoice, setSelectedFinalChoice] = useState<ChoiceLetter | null>(null);
  const [isFinalLocked, setIsFinalLocked] = useState(false);
  const [finalLockedCount, setFinalLockedCount] = useState(0);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

  // Reveal Phase
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Summary & Review Mode States
  const [summary, setSummary] = useState<RoomSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isStartingReview, setIsStartingReview] = useState(false);
  const [isExitingReview, setIsExitingReview] = useState(false);

  // Fetch room details
  const loadRoom = useCallback(async () => {
    try {
      const storedPlayerId =
        typeof window !== "undefined"
          ? sessionStorage.getItem(`necessaire_player_${roomCode}`)
          : null;

      const details = await getRoomDetails(roomCode, storedPlayerId || undefined);
      if (!details) {
        setRoom(null);
        setLoading(false);
        return;
      }

      setRoom(details.room);
      setMock(details.mock);
      setPlayers(details.players);

      // Check if host is present in players list
      const hostPresent = details.players.some((p) => p.isHost);
      setIsHostDisconnected(!hostPresent);

      if (storedPlayerId) {
        setCurrentPlayerId(storedPlayerId);
        const current = details.players.find((p) => p.id === storedPlayerId);
        if (current) {
          setIsHost(current.isHost);
        }
      } else {
        if (details.room.status === "LOBBY") {
          router.push(`/join?code=${roomCode}`);
          return;
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

  // Automatic Reconnection & Silent State Resync on Tab Focus / Window Online
  useEffect(() => {
    const handleSync = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadRoom();
      }
    };

    window.addEventListener("visibilitychange", handleSync);
    window.addEventListener("focus", handleSync);
    window.addEventListener("online", handleSync);

    return () => {
      window.removeEventListener("visibilitychange", handleSync);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("online", handleSync);
    };
  }, [loadRoom]);

  // Load summary when room reaches FINISHED
  const loadSummaryData = useCallback(async () => {
    if (!currentPlayerId) return;
    setLoadingSummary(true);
    try {
      const data = await calculateRoomSummary(roomCode, currentPlayerId);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, [roomCode, currentPlayerId]);

  useEffect(() => {
    if (room?.status === "FINISHED") {
      loadSummaryData();
    }
  }, [room?.status, loadSummaryData]);

  // Reset local form states for a new question
  const resetQuestionStates = useCallback(() => {
    setSelectedInitialChoice(null);
    setIsInitialLocked(false);
    setAnsweredCount(0);
    setIsReady(false);
    setReadyCount(0);
    setChangeMode(null);
    setSelectedFinalChoice(null);
    setIsFinalLocked(false);
    setFinalLockedCount(0);
    setRevealData(null);
  }, []);

  // Handle Realtime events
  const handleRealtimeEvent = useCallback(
    (event: RoomEvent) => {
      switch (event.type) {
        case "PLAYER_JOINED":
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === event.player.id);
            if (exists) return prev;
            if (event.player.isHost) setIsHostDisconnected(false);
            return [...prev, event.player];
          });
          info(`${event.player.nickname} joined the room!`);
          break;

        case "PLAYER_LEFT":
          setPlayers((prev) => {
            const leaving = prev.find((p) => p.id === event.playerId);
            if (leaving?.isHost) {
              setIsHostDisconnected(true);
            }
            return prev.filter((p) => p.id !== event.playerId);
          });
          break;

        case "ROOM_STARTED":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: event.status,
                  currentQuestion: event.currentQuestion,
                  reviewQuestionIds: [],
                }
              : null
          );
          resetQuestionStates();
          success("The host has started the mock test! Question 1 is live.", "Test Started");
          break;

        case "ANSWER_PROGRESS":
          setAnsweredCount(event.answeredCount);
          break;

        case "STATUS_CHANGED":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: event.status,
                  currentQuestion: event.currentQuestion ?? prev.currentQuestion,
                }
              : null
          );
          if (event.status === "DISCUSSION") {
            info("Everyone has answered! Discuss your answers in Discord.", "Discussion Time");
          } else if (event.status === "CHANGING") {
            info("Discussion ended. You may now keep or revise your answer.", "Change Phase");
          }
          break;

        case "READY_PROGRESS":
          setReadyCount(event.readyCount);
          break;

        case "FINAL_LOCK_PROGRESS":
          setFinalLockedCount(event.finalLockedCount);
          break;

        case "ANSWER_REVEALED":
          setRevealData(event.revealData);
          setRoom((prev) => (prev ? { ...prev, status: "REVEAL" } : null));
          success("Host has revealed the correct answer!", "Reveal Phase");
          break;

        case "NEXT_QUESTION":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: event.status,
                  currentQuestion: event.currentQuestion,
                }
              : null
          );
          resetQuestionStates();
          if (event.status === "FINISHED") {
            success("Mock test completed! Calculating summary...", "Finished");
          } else {
            info(`Moving to Question ${event.currentQuestion}.`, "Next Question");
          }
          break;

        case "START_REVIEW":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  reviewQuestionIds: event.questionIds,
                  currentQuestion: 1,
                  status: "ANSWERING",
                }
              : null
          );
          resetQuestionStates();
          success(`Host started Review Mode for ${event.questionIds.length} missed questions!`, "Review Mode");
          break;

        case "BACK_TO_SUMMARY":
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  reviewQuestionIds: [],
                  status: "FINISHED",
                }
              : null
          );
          resetQuestionStates();
          info("Returned to test summary.", "Summary");
          break;
      }
    },
    [info, success, resetQuestionStates]
  );

  useRoomRealtime(roomCode, handleRealtimeEvent);

  // Copy helpers
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setIsCopiedCode(true);
      success(`Room code ${roomCode} copied!`, "Copied");
      setTimeout(() => setIsCopiedCode(false), 2000);
    } catch {
      error("Failed to copy room code.");
    }
  };

  const handleCopyLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/join?code=${roomCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopiedLink(true);
      success("Invite link copied!", "Link Copied");
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
        await broadcastRoomEvent(roomCode, {
          type: "ROOM_STARTED",
          currentQuestion: 1,
          status: "ANSWERING",
        });
        setRoom((prev) =>
          prev ? { ...prev, status: "ANSWERING", currentQuestion: 1, reviewQuestionIds: [] } : null
        );
        resetQuestionStates();
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
      try {
        await leaveRoom(roomCode, currentPlayerId);
        await broadcastRoomEvent(roomCode, {
          type: "PLAYER_LEFT",
          playerId: currentPlayerId,
        });
      } catch (err) {
        console.warn("Leave room notification failed", err);
      } finally {
        sessionStorage.removeItem(`necessaire_player_${roomCode}`);
        sessionStorage.removeItem(`necessaire_nickname_${roomCode}`);
      }
    }
    router.push("/join");
  };

  // -------------------------------------------------------------
  // Determine Active Question (Normal vs Review Mode)
  // -------------------------------------------------------------
  const isReviewMode = Boolean(room?.reviewQuestionIds && room.reviewQuestionIds.length > 0);

  const activeQuestionList = isReviewMode
    ? (room?.reviewQuestionIds || [])
        .map((id) => mock?.questions.find((q) => q.id === id)!)
        .filter(Boolean)
    : mock?.questions || [];

  const totalQuestions = activeQuestionList.length;
  const currentQIndex = (room?.currentQuestion || 1) - 1;
  const currentQuestion = activeQuestionList[currentQIndex] || activeQuestionList[0];

  // -------------------------------------------------------------
  // 1. Submit Initial Answer (ANSWERING phase)
  // -------------------------------------------------------------
  const handleLockInitialAnswer = async () => {
    if (!selectedInitialChoice || !currentQuestion || !currentPlayerId) return;

    setIsSubmittingInitial(true);
    try {
      const res = await submitInitialAnswer(
        roomCode,
        currentPlayerId,
        currentQuestion.id,
        selectedInitialChoice
      );

      if (res.success) {
        setIsInitialLocked(true);
        setAnsweredCount(res.answeredCount);

        await broadcastRoomEvent(roomCode, {
          type: "ANSWER_PROGRESS",
          answeredCount: res.answeredCount,
          totalPlayers: res.totalPlayers,
        });

        if (res.allAnswered) {
          await broadcastRoomEvent(roomCode, {
            type: "STATUS_CHANGED",
            status: "DISCUSSION",
          });
          setRoom((prev) => (prev ? { ...prev, status: "DISCUSSION" } : null));
          info("Everyone has answered! Discuss your answers in Discord.", "Discussion Time");
        }
      } else {
        error(res.error || "Failed to lock answer. Please try again.");
      }
    } catch (err: any) {
      error(err.message || "Network error locking answer.");
    } finally {
      setIsSubmittingInitial(false);
    }
  };

  // -------------------------------------------------------------
  // 2. Ready in Discussion Phase (DISCUSSION phase)
  // -------------------------------------------------------------
  const handleToggleReady = async () => {
    if (!currentQuestion || !currentPlayerId) return;
    const nextReady = !isReady;
    setIsUpdatingReady(true);

    try {
      const res = await setPlayerReady(
        roomCode,
        currentPlayerId,
        currentQuestion.id,
        nextReady
      );

      if (res.success) {
        setIsReady(nextReady);
        setReadyCount(res.readyCount);
        await broadcastRoomEvent(roomCode, {
          type: "READY_PROGRESS",
          readyCount: res.readyCount,
          totalPlayers: res.totalPlayers,
        });
      } else {
        error(res.error || "Failed to update ready state.");
      }
    } catch (err: any) {
      error(err.message || "Failed to update ready status.");
    } finally {
      setIsUpdatingReady(false);
    }
  };

  const handleProceedToChange = async () => {
    if (!isHost) return;
    setIsProceedingToChange(true);
    try {
      const res = await transitionToChangePhase(roomCode);
      if (res.success) {
        await broadcastRoomEvent(roomCode, {
          type: "STATUS_CHANGED",
          status: "CHANGING",
        });
        setRoom((prev) => (prev ? { ...prev, status: "CHANGING" } : null));
      } else {
        error(res.error || "Failed to proceed to Change phase.");
      }
    } catch (err: any) {
      error(err.message || "Error transitioning to Change phase.");
    } finally {
      setIsProceedingToChange(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Final Lock (CHANGING phase)
  // -------------------------------------------------------------
  const handleFinalLock = async () => {
    if (!currentQuestion || !currentPlayerId) return;

    const finalChoice =
      changeMode === "change" && selectedFinalChoice
        ? selectedFinalChoice
        : selectedInitialChoice;

    if (!finalChoice) {
      error("Please pick an answer before locking.");
      return;
    }

    setIsSubmittingFinal(true);
    try {
      const res = await submitFinalAnswer(
        roomCode,
        currentPlayerId,
        currentQuestion.id,
        finalChoice
      );

      if (res.success) {
        setIsFinalLocked(true);
        setFinalLockedCount(res.finalLockedCount);
        await broadcastRoomEvent(roomCode, {
          type: "FINAL_LOCK_PROGRESS",
          finalLockedCount: res.finalLockedCount,
          totalPlayers: res.totalPlayers,
        });

        success("Final answer locked! Waiting for host to reveal.", "Locked");
      } else {
        error(res.error || "Failed to submit final answer.");
      }
    } catch (err: any) {
      error(err.message || "Failed to final lock answer.");
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  // -------------------------------------------------------------
  // 4. Reveal Answer (REVEAL phase)
  // -------------------------------------------------------------
  const handleRevealAnswer = async () => {
    if (!isHost || !currentQuestion) return;

    setIsRevealing(true);
    try {
      const res = await revealAnswer(roomCode, currentQuestion.id);
      if (res.success && res.revealData) {
        setRevealData(res.revealData);
        setRoom((prev) => (prev ? { ...prev, status: "REVEAL" } : null));

        await broadcastRoomEvent(roomCode, {
          type: "ANSWER_REVEALED",
          revealData: res.revealData,
        });
      } else {
        error(res.error || "Failed to reveal answer.");
      }
    } catch (err: any) {
      error(err.message || "Failed to reveal answer.");
    } finally {
      setIsRevealing(false);
    }
  };

  // -------------------------------------------------------------
  // 5. Next Question (NEXT phase)
  // -------------------------------------------------------------
  const handleNextQuestion = async () => {
    if (!isHost) return;

    setIsAdvancing(true);
    try {
      const res = await advanceToNextQuestion(roomCode);
      if (res.success) {
        const nextStatus: RoomStatus = res.isFinished ? "FINISHED" : "ANSWERING";
        const nextNum = res.nextQuestionNumber;

        await broadcastRoomEvent(roomCode, {
          type: "NEXT_QUESTION",
          currentQuestion: nextNum,
          status: nextStatus,
        });

        setRoom((prev) =>
          prev ? { ...prev, currentQuestion: nextNum, status: nextStatus } : null
        );
        resetQuestionStates();
      } else {
        error(res.error || "Failed to advance question.");
      }
    } catch (err: any) {
      error(err.message || "Failed to advance question.");
    } finally {
      setIsAdvancing(false);
    }
  };

  // -------------------------------------------------------------
  // 6. Review Mode Handlers
  // -------------------------------------------------------------
  const handleLaunchReview = async () => {
    if (!isHost || !summary || summary.needsReviewQuestions.length === 0) return;

    setIsStartingReview(true);
    try {
      const questionIds = summary.needsReviewQuestions.map((q) => q.questionId);
      const res = await startReviewMode(roomCode, questionIds);

      if (res.success) {
        await broadcastRoomEvent(roomCode, {
          type: "START_REVIEW",
          questionIds,
        });

        setRoom((prev) =>
          prev
            ? {
                ...prev,
                reviewQuestionIds: questionIds,
                currentQuestion: 1,
                status: "ANSWERING",
              }
            : null
        );
        resetQuestionStates();
        success("Review mode launched for missed questions!", "Review Started");
      } else {
        error(res.error || "Failed to start review mode.");
      }
    } catch (err: any) {
      error(err.message || "Failed to launch review mode.");
    } finally {
      setIsStartingReview(false);
    }
  };

  const handleBackToSummary = async () => {
    if (!isHost) return;

    setIsExitingReview(true);
    try {
      const res = await exitReviewMode(roomCode);
      if (res.success) {
        await broadcastRoomEvent(roomCode, {
          type: "BACK_TO_SUMMARY",
        });

        setRoom((prev) =>
          prev
            ? {
                ...prev,
                reviewQuestionIds: [],
                status: "FINISHED",
              }
            : null
        );
        resetQuestionStates();
        info("Returned to test summary.", "Summary");
      } else {
        error(res.error || "Failed to exit review mode.");
      }
    } catch (err: any) {
      error(err.message || "Failed to exit review mode.");
    } finally {
      setIsExitingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-gray-400 font-mono tracking-wider">CONNECTING TO ROOM {roomCode}...</p>
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
          {!isSupabaseConfigured() && (
            <div className="text-left bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
              ⚠️ Note: This website build is running in local mode without Supabase. If this room was hosted from a different device, other devices cannot connect until Supabase credentials are configured in Vercel and redeployed.
            </div>
          )}
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
      <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-14 space-y-6 sm:space-y-8 pb-32 sm:pb-16">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-error transition-colors p-1"
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

        {/* Offline Warning if Supabase is missing */}
        {!isSupabaseConfigured() && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs sm:text-sm text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Offline / Single-Device Mode</p>
              <p className="text-amber-200/80 text-xs">
                Supabase credentials were not detected in this build. Other devices cannot find this room. To allow friends to join, add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel Environment Variables and click <strong>Redeploy</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Room Code Card */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="w-full"
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
                className="w-full"
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
          <CardHeader className="flex flex-row items-center justify-between py-4 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-accent" />
              <CardTitle className="text-base sm:text-lg">
                Players in Room ({players.length})
              </CardTitle>
            </div>
            <span className="text-xs text-gray-400 hidden sm:inline">
              Hop on Discord while waiting
            </span>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
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
        <div className="p-4 sm:p-6 rounded-xl bg-card border border-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {isHost ? (
            <>
              <div className="text-center sm:text-left">
                <h4 className="text-sm font-semibold text-white">
                  You are the Host
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
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
              <span className="text-sm text-gray-300 font-medium text-center">
                Waiting for host to start the test...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MOCK COMPLETE SUMMARY (status === "FINISHED")
  // ==========================================
  if (room.status === "FINISHED") {
    return (
      <div className="flex-1 max-w-2xl mx-auto w-full px-3 sm:px-6 py-8 sm:py-16 space-y-6 text-center pb-32 sm:pb-16">
        <Card className="p-6 sm:p-10 space-y-6 border-card-border shadow-2xl">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-xs font-mono font-semibold tracking-widest text-primary-accent uppercase">
              Pre-Exam Drill
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              MOCK COMPLETE
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              {mock.title} • {players.length} participants
            </p>
          </div>

          {/* Big Score Box */}
          {loadingSummary ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : summary ? (
            <div className="p-6 rounded-2xl bg-[#0F1117] border border-card-border space-y-3">
              <div className="text-4xl sm:text-5xl font-black text-white font-mono">
                {summary.playerScore.correct} / {summary.totalQuestions}
              </div>

              <div className="flex items-center justify-center gap-6 text-sm font-semibold pt-1">
                <span className="text-success flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Correct: {summary.playerScore.correct}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-error flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  Wrong: {summary.playerScore.wrong}
                </span>
              </div>
            </div>
          ) : null}

          {/* Needs Review Section */}
          {summary && (
            <div className="space-y-4 text-left pt-2 border-t border-card-border/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Needs Review
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Questions where players in this room made the most mistakes (up to 5 questions).
                </p>
              </div>

              {summary.needsReviewQuestions.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.needsReviewQuestions.map((nr) => (
                    <div
                      key={nr.questionId}
                      className="p-3.5 rounded-xl bg-[#0F1117] border border-card-border flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            Q{nr.originalQuestionNumber}
                          </span>
                          <span className="text-xs font-medium text-gray-400 truncate block">
                            {nr.questionText}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs font-semibold text-gray-300 font-mono">
                        <span className="text-amber-400 font-bold">{nr.correctCount}</span> /{" "}
                        {nr.totalPlayers} correct
                      </div>
                    </div>
                  ))}

                  {/* Review Mode Trigger Button */}
                  <div className="pt-2">
                    {isHost ? (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleLaunchReview}
                        isLoading={isStartingReview}
                        className="w-full shadow-glow py-3"
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                      >
                        Review These Questions ({summary.needsReviewQuestions.length})
                      </Button>
                    ) : (
                      <p className="text-xs text-center text-gray-500 italic py-1">
                        Waiting for host to review these questions or wrap up...
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-center text-xs text-success font-medium">
                  ✓ Perfect run! All questions were answered correctly across the room.
                </div>
              )}
            </div>
          )}

          {/* Quick Exit Links */}
          <div className="pt-4 border-t border-card-border/60 flex flex-col sm:flex-row justify-center gap-3">
            <Link href={`/mock/${mock.id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full">
                Review Full Answer Key
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE TEST QUESTION (Normal or Review Mode)
  // ==========================================
  if (!currentQuestion) return null;

  const choices: { letter: ChoiceLetter; text: string }[] = [
    { letter: "A", text: currentQuestion.choiceA },
    { letter: "B", text: currentQuestion.choiceB },
    { letter: "C", text: currentQuestion.choiceC },
    { letter: "D", text: currentQuestion.choiceD },
  ];

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-10 space-y-4 sm:space-y-6 pb-32 sm:pb-16">
      {/* Host Disconnected Alert Banner */}
      {isHostDisconnected && !isHost && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Host disconnected. Waiting for host to reconnect...</span>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="text-xs text-gray-400 hover:text-white underline shrink-0"
          >
            Leave
          </button>
        </div>
      )}

      {/* Top Header: Question Progress & Room Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-card-border/60 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-base sm:text-lg font-bold text-white font-mono">
            {isReviewMode ? "REVIEW Q" : "Q"} {currentQIndex + 1} / {totalQuestions}
          </span>
          {isReviewMode && (
            <span className="text-xs text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              (Originally Q{currentQuestion.questionNumber})
            </span>
          )}
          <span className="text-xs text-gray-400">
            • Room <strong className="font-mono text-gray-200">{roomCode}</strong>
          </span>
        </div>

        {/* Phase Pill */}
        <div className="flex items-center gap-2">
          {room.status === "ANSWERING" && (
            <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-primary/20 text-primary-accent border border-primary/30 uppercase tracking-wider">
              1. Answer Phase
            </span>
          )}
          {room.status === "DISCUSSION" && (
            <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1.5">
              <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
              2. Discuss in Discord
            </span>
          )}
          {room.status === "CHANGING" && (
            <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              3. Change or Keep
            </span>
          )}
          {room.status === "REVEAL" && (
            <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-success/20 text-success border border-success/30 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              4. Reveal & Learn
            </span>
          )}
        </div>
      </div>

      {/* Main Question Card */}
      <Card className="border-card-border shadow-xl">
        <CardHeader className="bg-card-border/20 py-4 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-xl text-white font-medium leading-relaxed whitespace-pre-line">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* =======================================================
              PHASE 1: ANSWERING
              ======================================================= */}
          {room.status === "ANSWERING" && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {choices.map((c) => {
                  const isSelected = selectedInitialChoice === c.letter;

                  return (
                    <button
                      key={c.letter}
                      type="button"
                      disabled={isInitialLocked || isSubmittingInitial}
                      onClick={() => setSelectedInitialChoice(c.letter)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border flex items-start gap-3.5 transition-all select-none min-h-[58px] sm:min-h-[64px] active:scale-[0.99] ${
                        isSelected
                          ? "border-primary bg-primary/15 text-white shadow-glow-sm"
                          : "border-card-border bg-[#0F1117] text-gray-300 hover:border-gray-600 hover:bg-card/50"
                      } ${isInitialLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-card-border/60 text-gray-400"
                        }`}
                      >
                        {c.letter}
                      </span>
                      <span className="text-sm sm:text-base pt-1 leading-snug">{c.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress & Lock Button */}
              <div className="pt-4 border-t border-card-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {answeredCount} / {players.length}
                  </span>
                  <span>players answered</span>
                  {isInitialLocked && (
                    <span className="inline-flex items-center gap-1 text-success font-medium ml-2">
                      <Lock className="w-3.5 h-3.5" />
                      Answer locked
                    </span>
                  )}
                </div>

                {!isInitialLocked ? (
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!selectedInitialChoice}
                    isLoading={isSubmittingInitial}
                    onClick={handleLockInitialAnswer}
                    className="w-full sm:w-auto py-3 text-sm font-semibold"
                    leftIcon={<Lock className="w-4 h-4" />}
                  >
                    Lock Answer
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    Waiting for everyone to lock their answers...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* =======================================================
              PHASE 2: DISCUSSION
              ======================================================= */}
          {room.status === "DISCUSSION" && (
            <div className="space-y-6 py-2 text-center">
              <div className="p-5 sm:p-6 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center mx-auto">
                  <DiscordIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Everyone has answered.
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
                  Hop on your Discord call now to discuss why you chose your answer and debate the concepts together!
                </p>
              </div>

              {/* Ready Button for players */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-card-border/60">
                <div className="text-xs text-gray-400">
                  <strong className="text-white">{readyCount}</strong> / {players.length} players ready to revise
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  <Button
                    variant={isReady ? "secondary" : "primary"}
                    size="md"
                    isLoading={isUpdatingReady}
                    onClick={handleToggleReady}
                    className="w-full sm:w-auto"
                    leftIcon={isReady ? <Check className="w-4 h-4 text-success" /> : undefined}
                  >
                    {isReady ? "I'm Ready ✓" : "I'm Ready"}
                  </Button>

                  {/* Host Proceed Action */}
                  {isHost && (
                    <Button
                      variant="primary"
                      size="md"
                      isLoading={isProceedingToChange}
                      onClick={handleProceedToChange}
                      className="w-full sm:w-auto shadow-glow"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Proceed to Change
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              PHASE 3: CHANGING (Keep or Change)
              ======================================================= */}
          {room.status === "CHANGING" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-card-border/20 border border-card-border flex items-center justify-between">
                <span className="text-xs text-gray-400">Your initial answer was:</span>
                <span className="px-3 py-1 rounded-lg bg-primary/20 text-primary-accent font-bold font-mono text-sm border border-primary/30">
                  Option {selectedInitialChoice || "N/A"}
                </span>
              </div>

              {/* Choice Mode Selection: Keep or Change */}
              {!isFinalLocked ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setChangeMode("keep");
                        setSelectedFinalChoice(selectedInitialChoice);
                      }}
                      className={`p-4 rounded-xl border text-sm font-semibold transition-all min-h-[54px] active:scale-[0.99] ${
                        changeMode === "keep"
                          ? "border-primary bg-primary/20 text-white shadow-glow-sm"
                          : "border-card-border bg-[#0F1117] text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      Keep Option {selectedInitialChoice || "A"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setChangeMode("change")}
                      className={`p-4 rounded-xl border text-sm font-semibold transition-all min-h-[54px] active:scale-[0.99] ${
                        changeMode === "change"
                          ? "border-primary bg-primary/20 text-white shadow-glow-sm"
                          : "border-card-border bg-[#0F1117] text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      Change Answer
                    </button>
                  </div>

                  {/* If user clicked Change: show choice list */}
                  {changeMode === "change" && (
                    <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                      <span className="text-xs text-gray-400 font-medium block">
                        Select your revised answer:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {choices.map((c) => {
                          const isSelected = selectedFinalChoice === c.letter;

                          return (
                            <button
                              key={c.letter}
                              type="button"
                              onClick={() => setSelectedFinalChoice(c.letter)}
                              className={`p-3 rounded-lg border text-left text-xs sm:text-sm flex items-start gap-2.5 transition-all min-h-[48px] ${
                                isSelected
                                  ? "border-primary bg-primary/20 text-white"
                                  : "border-card-border bg-[#0F1117] text-gray-300 hover:border-gray-600"
                              }`}
                            >
                              <span className="font-bold text-primary-accent">{c.letter}.</span>
                              <span className="truncate">{c.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Final Lock action */}
                  <div className="pt-4 border-t border-card-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-gray-400">
                      {finalLockedCount} / {players.length} players final locked
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      disabled={!changeMode || (changeMode === "change" && !selectedFinalChoice)}
                      isLoading={isSubmittingFinal}
                      onClick={handleFinalLock}
                      className="w-full sm:w-auto"
                      leftIcon={<Lock className="w-4 h-4" />}
                    >
                      Final Lock
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-success font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Final Answer Locked</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Waiting for host to reveal the answer ({finalLockedCount} / {players.length} locked).
                  </p>
                </div>
              )}

              {/* Host Reveal Action */}
              {isHost && (
                <div className="pt-4 border-t border-card-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-gray-400">
                    Host Control: {finalLockedCount} / {players.length} players locked
                  </span>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleRevealAnswer}
                    isLoading={isRevealing}
                    className="w-full sm:w-auto shadow-glow"
                    leftIcon={<Eye className="w-4 h-4" />}
                  >
                    Reveal Answer
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* =======================================================
              PHASE 4: REVEAL
              ======================================================= */}
          {room.status === "REVEAL" && revealData && (
            <div className="space-y-6">
              {/* Correct Answer Highlight */}
              <div className="p-5 rounded-xl bg-success/10 border border-success/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Correct Answer
                  </span>
                  <span className="text-xs font-medium text-gray-300">
                    {revealData.correctCount} / {revealData.totalPlayers} correct
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  Option {revealData.correctAnswer}
                </div>
              </div>

              {/* Explanation Card */}
              {revealData.explanation && (
                <div className="p-4 rounded-xl bg-card-border/20 border border-card-border space-y-1.5">
                  <span className="text-xs font-semibold text-primary-accent uppercase tracking-wider block">
                    Explanation
                  </span>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {revealData.explanation}
                  </p>
                </div>
              )}

              {/* Trajectory Breakdown (Initial -> Final) */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Player Answers (Initial → Final)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {revealData.results.map((r) => (
                    <div
                      key={r.playerId}
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs sm:text-sm ${
                        r.isCorrect
                          ? "bg-success/[0.06] border-success/30 text-white"
                          : "bg-error/[0.06] border-error/30 text-gray-300"
                      }`}
                    >
                      <span className="font-medium truncate max-w-[120px]">
                        {r.nickname}
                      </span>
                      <div className="flex items-center gap-2 font-mono font-semibold">
                        <span>{r.initialAnswer || "-"}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                        <span>{r.finalAnswer || "-"}</span>
                        {r.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-error" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Advance Action (Next Question or Back to Summary if Review Mode) */}
              {isHost && (
                <div className="pt-4 border-t border-card-border/60 flex items-center justify-end gap-3">
                  {isReviewMode && currentQIndex + 1 >= totalQuestions ? (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleBackToSummary}
                      isLoading={isExitingReview}
                      className="w-full sm:w-auto shadow-glow"
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Back to Summary
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleNextQuestion}
                      isLoading={isAdvancing}
                      className="w-full sm:w-auto shadow-glow"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {currentQIndex + 1 >= totalQuestions ? "Finish Mock" : "Next Question"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
