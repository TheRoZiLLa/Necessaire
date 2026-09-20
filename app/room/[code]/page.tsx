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
  UserX,
  Sparkles,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getRoomDetails, startRoom, leaveRoom, kickPlayer } from "@/lib/room";
import {
  submitInitialAnswer,
  setPlayerReady,
  transitionToChangePhase,
  submitFinalAnswer,
  revealAnswer,
  advanceToNextQuestion,
  getRound1Answers,
} from "@/lib/loop";
import { calculateRoomSummary, startReviewMode, exitReviewMode } from "@/lib/summary";
import { useRoomRealtime, broadcastRoomEvent, RoomEvent } from "@/lib/realtime";
import { isSupabaseConfigured } from "@/lib/supabase";
import { formatChoiceLetter } from "@/lib/parser";
import { useLanguage } from "@/context/LanguageContext";
import {
  Room,
  Player,
  MockWithQuestions,
  ChoiceLetter,
  RevealData,
  RoomStatus,
  RoomSummary,
  Round1AnswerItem,
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
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [mock, setMock] = useState<MockWithQuestions | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isHostDisconnected, setIsHostDisconnected] = useState(false);

  // Kick & Player modal states
  const [kickingPlayerId, setKickingPlayerId] = useState<string | null>(null);
  const [showPlayersModal, setShowPlayersModal] = useState(false);

  // Round 1 answers for Discuss & Change phase
  const [round1Answers, setRound1Answers] = useState<Round1AnswerItem[]>([]);
  const [loadingRound1Answers, setLoadingRound1Answers] = useState(false);

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

  // Choice label language toggle (A-D vs ก-ง)
  const [useThaiChoices, setUseThaiChoices] = useState(false);

  useEffect(() => {
    if (mock?.questions && mock.questions.length > 0) {
      const hasThai = mock.questions.some(
        (q) => /[\u0E00-\u0E7F]/.test(q.questionText) || /[\u0E00-\u0E7F]/.test(q.choiceA)
      );
      if (hasThai) {
        setUseThaiChoices(true);
      }
    }
  }, [mock]);

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
    setRound1Answers([]);
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

        case "PLAYER_KICKED": {
          const myId =
            currentPlayerId ||
            (typeof window !== "undefined"
              ? sessionStorage.getItem(`necessaire_player_${roomCode}`)
              : null);
          if (myId === event.playerId) {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem(`necessaire_player_${roomCode}`);
              sessionStorage.removeItem(`necessaire_nickname_${roomCode}`);
            }
            error(t.room.youWereKicked || "You were removed from the room by the host.", "Removed");
            router.push("/join");
            return;
          }
          setPlayers((prev) => prev.filter((p) => p.id !== event.playerId));
          info(t.room.kickedToast.replace("{name}", event.nickname || "Player"));
          break;
        }

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

  // Load Round 1 answers for Discuss & Change phase
  const loadRound1Answers = useCallback(
    async (qId?: string) => {
      const targetId = qId || currentQuestion?.id;
      if (!targetId) return;
      setLoadingRound1Answers(true);
      try {
        const data = await getRound1Answers(roomCode, targetId);
        setRound1Answers(data);
      } catch (err) {
        console.error("Failed to load round 1 answers:", err);
      } finally {
        setLoadingRound1Answers(false);
      }
    },
    [roomCode, currentQuestion?.id]
  );

  // Synchronize Round 1 answers when entering DISCUSSION or CHANGING
  useEffect(() => {
    if (
      (room?.status === "DISCUSSION" || room?.status === "CHANGING") &&
      currentQuestion?.id
    ) {
      loadRound1Answers(currentQuestion.id);
    }
  }, [room?.status, currentQuestion?.id, loadRound1Answers]);

  // Restore initial choice from Round 1 answers if user reloaded
  useEffect(() => {
    if (round1Answers.length > 0 && currentPlayerId && !selectedInitialChoice) {
      const myAns = round1Answers.find((a) => a.playerId === currentPlayerId);
      if (myAns?.initialAnswer) {
        setSelectedInitialChoice(myAns.initialAnswer);
      }
    }
  }, [round1Answers, currentPlayerId, selectedInitialChoice]);

  // Kick a player from the room (Host only)
  const handleKickPlayer = async (playerId: string, nickname: string) => {
    if (!isHost || !currentPlayerId) return;
    const confirmMsg = t.room.kickConfirm
      ? t.room.kickConfirm.replace("{name}", nickname)
      : `Remove ${nickname} from the room?`;
    if (!window.confirm(confirmMsg)) return;

    setKickingPlayerId(playerId);
    try {
      const res = await kickPlayer(roomCode, playerId, currentPlayerId);
      if (res.success) {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
        success(t.room.kickedToast.replace("{name}", nickname));
      } else {
        error(res.error || "Failed to remove player.");
      }
    } catch (err: any) {
      error(err.message || "Error removing player.");
    } finally {
      setKickingPlayerId(null);
    }
  };

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
          loadRound1Answers(currentQuestion.id);
          info(t.room.discussNoticeTitle || "Everyone has answered! Discuss your answers in Discord.", "Discussion Time");
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
  // 2. Ready in Discussion Phase (Optional / Legacy)
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
  // 3. Final Lock (Discuss & Change phase)
  // -------------------------------------------------------------
  const handleFinalLock = async () => {
    if (!currentQuestion || !currentPlayerId) return;

    const finalChoice = selectedFinalChoice || selectedInitialChoice;

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
        setSelectedFinalChoice(finalChoice);
        setFinalLockedCount(res.finalLockedCount);
        await broadcastRoomEvent(roomCode, {
          type: "FINAL_LOCK_PROGRESS",
          finalLockedCount: res.finalLockedCount,
          totalPlayers: res.totalPlayers,
        });

        success(t.room.answer2ndLocked || "Final answer locked! Waiting for host to reveal.", "Locked");
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
        <p className="text-xs text-gray-400 font-mono tracking-wider">{t.room.connecting.replace("{code}", roomCode)}</p>
      </div>
    );
  }

  if (!room || !mock) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <HelpCircle className="w-10 h-10 text-gray-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">{t.room.roomNotFoundTitle}</h2>
          <p className="text-xs sm:text-sm text-gray-400">
            {t.room.roomNotFoundDesc.replace("{code}", roomCode)}
          </p>
          {!isSupabaseConfigured() && (
            <div className="text-left bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
              ⚠️ Note: This website build is running in local mode without Supabase. If this room was hosted from a different device, other devices cannot connect until Supabase credentials are configured in Vercel and redeployed.
            </div>
          )}
          <div className="pt-2">
            <Link href="/join">
              <Button variant="primary" size="sm">
                {t.room.joinAnotherBtn}
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
            <span>{t.room.leaveLobby}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              {t.room.lobbyActive}
            </span>
          </div>
        </div>

        {/* Offline Warning if Supabase is missing */}
        {!isSupabaseConfigured() && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs sm:text-sm text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">{t.room.offlineWarningTitle}</p>
              <p className="text-amber-200/80 text-xs">
                {t.room.offlineWarningDesc}
              </p>
            </div>
          </div>
        )}

        {/* Room Code Card */}
        <Card className="border-primary/40 shadow-glow overflow-visible relative">
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                {t.room.roomCode}
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
              <span className="text-gray-500">• {t.mock.questionsCount.replace("{count}", String(mock.questions.length))}</span>
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
                {isCopiedCode ? t.room.copiedCode : t.room.copyCode}
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
                {isCopiedLink ? t.room.copiedLink : t.room.copyLink}
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
                {t.room.playersJoined} ({players.length})
              </CardTitle>
            </div>
            <span className="text-xs text-gray-400 hidden sm:inline">
              {t.room.discordWaiting}
            </span>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
              {players.map((p) => {
                const isMe = p.id === currentPlayerId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ease-spring ${
                      p.isHost
                        ? "bg-primary/[0.12] border-primary/40 text-white shadow-glow-coral"
                        : "bg-[#121738]/80 border-white/10 text-gray-200 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-transform ${
                          p.isHost
                            ? "bg-gradient-to-br from-primary to-rose-600 text-white shadow-glow-sm"
                            : "bg-white/10 text-gold"
                        }`}
                      >
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-sm font-medium block truncate">
                          {p.nickname}{" "}
                          {isMe && (
                            <span className="text-xs text-cyan font-normal">
                              {t.room.youBadge}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold uppercase tracking-wider shrink-0 bg-gold/10 px-2 py-0.5 rounded-full border border-gold/30 shadow-glow-gold">
                          <Crown className="w-3 h-3 text-amber-400" />
                          {t.room.hostBadge}
                        </span>
                      )}

                      {isHost && !p.isHost && (
                        <button
                          type="button"
                          onClick={() => handleKickPlayer(p.id, p.nickname)}
                          disabled={kickingPlayerId === p.id}
                          title={t.room.kickBtn || "เตะออก"}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-all active:scale-95"
                        >
                          {kickingPlayerId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
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
                  {t.room.youAreHost}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.room.hostInstruction}
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
                {t.room.startTestBtn}
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-3 py-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
              <span className="text-sm text-gray-300 font-medium text-center">
                {t.room.waitingHost}
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
              {t.room.mockComplete}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              {mock.title} • {players.length} {t.room.playersJoined.toLowerCase()}
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
                  {t.room.correctCount.replace("{count}", String(summary.playerScore.correct))}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-error flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {t.room.wrongCount.replace("{count}", String(summary.playerScore.wrong))}
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
                  {t.room.needsReviewTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.room.needsReviewSubtitle}
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
                        {t.room.reviewTheseBtn} ({summary.needsReviewQuestions.length})
                      </Button>
                    ) : (
                      <p className="text-xs text-center text-gray-500 italic py-1">
                        {t.room.waitingHostReview}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-center text-xs text-success font-medium">
                  ✓ {t.room.perfectRun}
                </div>
              )}
            </div>
          )}

          {/* Quick Exit Links */}
          <div className="pt-4 border-t border-card-border/60 flex flex-col sm:flex-row justify-center gap-3">
            <Link href={`/mock/${mock.id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full">
                {t.room.reviewFullKey}
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full">
                {t.join.backHome}
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
            <span>{t.room.hostDisconnectedNotice}</span>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="text-xs text-gray-400 hover:text-white underline shrink-0"
          >
            {t.room.leaveBtn}
          </button>
        </div>
      )}

      {/* Top Header: Question Progress & Room Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3 sm:pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-base sm:text-lg font-bold text-white font-mono">
            {isReviewMode ? t.room.reviewModeQ : "Q"} {currentQIndex + 1} / {totalQuestions}
          </span>
          {isReviewMode && (
            <span className="text-xs text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              {t.room.originallyQ.replace("{num}", String(currentQuestion.questionNumber))}
            </span>
          )}
          <span className="text-xs text-gray-400">
            • Room <strong className="font-mono text-gray-200">{roomCode}</strong>
          </span>

          {/* Toggle Thai / English Choices */}
          <button
            type="button"
            onClick={() => setUseThaiChoices(!useThaiChoices)}
            className="text-[11px] px-2 py-0.5 rounded-lg border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:border-primary/50 transition-colors flex items-center gap-1 font-mono"
            title="สลับการแสดงผลตัวเลือก A-B-C-D และ ก-ข-ค-ง"
          >
            <span>{t.room.choiceToggle}</span>
            <span className="font-bold text-gold">{useThaiChoices ? "ก ข ค ง" : "A B C D"}</span>
          </button>

          {/* Players count button */}
          <button
            type="button"
            onClick={() => setShowPlayersModal(true)}
            className="text-[11px] px-2.5 py-0.5 rounded-lg border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:border-cyan/50 transition-colors flex items-center gap-1.5 font-mono"
            title="ดูผู้เล่นในห้อง"
          >
            <Users className="w-3.5 h-3.5 text-cyan" />
            <span>{players.length}</span>
          </button>
        </div>

        {/* Phase Pill */}
        <div className="flex items-center gap-2">
          {room.status === "ANSWERING" && (
            <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-primary/20 text-primary-accent border border-primary/30 uppercase tracking-wider shadow-glow-coral">
              {t.room.phase1Badge}
            </span>
          )}
          {(room.status === "DISCUSSION" || room.status === "CHANGING") && (
            <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1.5 shadow-glow-gold">
              <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
              {t.room.phaseDiscussChangeBadge || t.room.phase2Badge}
            </span>
          )}
          {room.status === "REVEAL" && (
            <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-success/20 text-success border border-success/30 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {t.room.phase4Badge}
            </span>
          )}
        </div>
      </div>

      {/* Active Game Players Modal */}
      {showPlayersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121738] border border-white/15 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan" />
                <h3 className="text-base font-bold text-white">
                  {t.room.playersJoined} ({players.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlayersModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {players.map((p) => {
                const isMe = p.id === currentPlayerId;
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          p.isHost
                            ? "bg-primary text-white"
                            : "bg-white/10 text-gold"
                        }`}
                      >
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium text-white">
                        {p.nickname} {isMe && <span className="text-xs text-cyan">({t.room.youBadge})</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.isHost && (
                        <span className="text-[10px] font-bold text-gold uppercase px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30">
                          {t.room.hostBadge}
                        </span>
                      )}
                      {isHost && !p.isHost && (
                        <button
                          type="button"
                          onClick={() => handleKickPlayer(p.id, p.nickname)}
                          disabled={kickingPlayerId === p.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                          title={t.room.kickBtn}
                        >
                          {kickingPlayerId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPlayersModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
                        {formatChoiceLetter(c.letter, useThaiChoices)}
                      </span>
                      <span className="text-sm sm:text-base pt-1 leading-snug">{c.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress & Lock Button */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {answeredCount} / {players.length}
                  </span>
                  <span>{t.room.playersAnswered}</span>
                  {isInitialLocked && (
                    <span className="inline-flex items-center gap-1 text-success font-semibold ml-2">
                      <Lock className="w-3.5 h-3.5" />
                      {t.room.answer1stLocked || t.room.answerLocked}
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
                    className="w-full sm:w-auto py-3 text-sm font-semibold shadow-glow-coral"
                    leftIcon={<Lock className="w-4 h-4" />}
                  >
                    {t.room.lockAnswer1stBtn || t.room.lockAnswerBtn}
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    {t.room.waitingAll1st
                      ? t.room.waitingAll1st.replace("{answered}", String(answeredCount)).replace("{total}", String(players.length))
                      : t.room.waitingAllLock}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* =======================================================
              PHASE 2: DISCUSS & CHANGE (Combined Screen)
              ======================================================= */}
          {(room.status === "DISCUSSION" || room.status === "CHANGING") && (
            <div className="space-y-6">
              {/* Discord Voice chat banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-11 h-11 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(88,101,242,0.3)]">
                  <DiscordIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                    <span>{t.room.discussNoticeTitle}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {t.room.round1AnswersDesc || t.room.discussNoticeDesc}
                  </p>
                </div>
              </div>

              {/* 1. Who answered what in Round 1 */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#121738]/80 border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gold animate-pulse" />
                    <h4 className="text-sm sm:text-base font-bold text-white">
                      {t.room.round1AnswersTitle}
                    </h4>
                  </div>
                  {loadingRound1Answers && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>{t.mock.loading}</span>
                    </div>
                  )}
                </div>

                {/* Tally Breakdown Bar */}
                {round1Answers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-400 block">
                      {t.room.tallyLabel}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {choices.map((c) => {
                        const count = round1Answers.filter((a) => a.initialAnswer === c.letter).length;
                        const pct = round1Answers.length > 0 ? Math.round((count / round1Answers.length) * 100) : 0;
                        const isMyPick = selectedInitialChoice === c.letter;

                        return (
                          <div
                            key={c.letter}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ease-spring ${
                              isMyPick
                                ? "bg-primary/15 border-primary/40 shadow-glow-coral"
                                : "bg-white/[0.03] border-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-gold font-mono">
                                {t.room.optionWord} {formatChoiceLetter(c.letter, useThaiChoices)}
                              </span>
                              {isMyPick && (
                                <span className="text-[10px] text-cyan font-bold uppercase">
                                  {t.room.youBadge}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-baseline justify-between">
                              <span className="text-lg font-black text-white font-mono">{count}</span>
                              <span className="text-xs text-gray-400 font-mono">{pct}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isMyPick ? "bg-primary" : "bg-gold"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Players Choice Badges */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-semibold text-gray-400 block">
                    {t.room.whoAnsweredWhat} ({round1Answers.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {round1Answers.map((item) => {
                      const isMe = item.playerId === currentPlayerId;
                      return (
                        <div
                          key={item.playerId}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                            isMe
                              ? "bg-cyan/10 border-cyan/40 text-white shadow-glow-cyan"
                              : "bg-white/[0.04] border-white/10 text-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-white/10 text-gold flex items-center justify-center font-bold text-[11px] shrink-0">
                              {item.nickname.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate font-medium">
                              {item.nickname} {isMe && <span className="text-cyan font-normal">{t.room.youBadge}</span>}
                            </span>
                          </div>

                          {item.initialAnswer ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-gold/15 text-gold font-bold font-mono border border-gold/30 shrink-0 shadow-glow-gold">
                              {t.room.optionWord} {formatChoiceLetter(item.initialAnswer, useThaiChoices)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-500 italic shrink-0">
                              {t.room.noAnswerYet}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Direct Change / Confirm Answer Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#121738]/90 border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div className="space-y-0.5">
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-cyan" />
                      <span>{t.room.changeDirectHelp}</span>
                    </h4>
                    <p className="text-xs text-gray-400">
                      {t.room.initialWas}{" "}
                      <strong className="text-gold font-mono">
                        {t.room.optionWord} {selectedInitialChoice ? formatChoiceLetter(selectedInitialChoice, useThaiChoices) : "-"}
                      </strong>
                    </p>
                  </div>

                  {isFinalLocked && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success bg-success/15 px-3 py-1 rounded-full border border-success/30">
                      <CheckCircle2 className="w-4 h-4" />
                      {t.room.answer2ndLocked}
                    </span>
                  )}
                </div>

                {!isFinalLocked ? (
                  <div className="space-y-4">
                    {/* Choice List for Round 2 */}
                    <div className="space-y-2.5">
                      {choices.map((c) => {
                        const activeFinalChoice = selectedFinalChoice || selectedInitialChoice;
                        const isSelected = activeFinalChoice === c.letter;
                        const isOriginal = selectedInitialChoice === c.letter;

                        return (
                          <button
                            key={c.letter}
                            type="button"
                            onClick={() => setSelectedFinalChoice(c.letter)}
                            className={`w-full text-left p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all select-none active:scale-[0.99] duration-200 ease-spring ${
                              isSelected
                                ? "border-primary bg-primary/15 text-white shadow-glow-coral"
                                : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-primary text-white"
                                    : "bg-white/10 text-gray-400"
                                }`}
                              >
                                {formatChoiceLetter(c.letter, useThaiChoices)}
                              </span>
                              <span className="text-sm sm:text-base pt-0.5 leading-snug">{c.text}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                              {isOriginal && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-400 border border-white/10">
                                  {t.room.initialWas.replace(":", "")}
                                </span>
                              )}
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-primary-accent" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Lock 2nd Button & Counter */}
                    <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="font-semibold text-white">{finalLockedCount} / {players.length}</span>
                        <span>{t.room.playersAnswered}</span>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        disabled={!selectedFinalChoice && !selectedInitialChoice}
                        isLoading={isSubmittingFinal}
                        onClick={handleFinalLock}
                        className="w-full sm:w-auto py-3 shadow-glow-coral font-semibold"
                        leftIcon={<Lock className="w-4 h-4" />}
                      >
                        {t.room.lockAnswer2ndBtn}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-center space-y-1.5">
                    <div className="flex items-center justify-center gap-1.5 text-success font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.room.finalLockedNotice}</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      {t.room.optionWord}{" "}
                      <strong className="text-white font-mono text-sm">
                        {formatChoiceLetter(selectedFinalChoice || selectedInitialChoice || "A", useThaiChoices)}
                      </strong>
                    </p>
                    <p className="text-xs text-gray-400 pt-1">
                      {t.room.waitingReveal.replace("{locked}", String(finalLockedCount)).replace("{total}", String(players.length))}
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Host Instant Reveal Control */}
              {isHost && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-gold/10 via-primary/10 to-violet/10 border border-gold/30 shadow-glow-gold flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Crown className="w-4 h-4 text-gold" />
                      <span className="text-sm font-bold text-white">
                        {t.room.hostRevealInstant}
                      </span>
                    </div>
                    <p className="text-xs text-gold/90 font-mono">
                      {t.room.hostRevealLiveCount.replace("{locked}", String(finalLockedCount)).replace("{total}", String(players.length))}
                    </p>
                  </div>

                  <Button
                    variant="gold"
                    size="lg"
                    onClick={handleRevealAnswer}
                    isLoading={isRevealing}
                    className="w-full sm:w-auto shadow-glow-gold py-3 px-6 text-sm font-bold"
                    leftIcon={<Eye className="w-5 h-5" />}
                  >
                    {t.room.revealBtn}
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
                    {t.room.correctAnswer}
                  </span>
                  <span className="text-xs font-medium text-gray-300">
                    {revealData.correctCount} / {revealData.totalPlayers}
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {t.room.optionWord} {formatChoiceLetter(revealData.correctAnswer, useThaiChoices)}
                </div>
              </div>

              {/* Explanation Card */}
              {revealData.explanation && (
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-gold uppercase tracking-wider block">
                    {t.room.explanation}
                  </span>
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                    {revealData.explanation}
                  </p>
                </div>
              )}

              {/* Trajectory Breakdown (Initial -> Final) */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  {t.room.playerTrajectory}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {revealData.results.map((r) => (
                    <div
                      key={r.playerId}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm transition-all duration-300 ease-spring ${
                        r.isCorrect
                          ? "bg-success/[0.08] border-success/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                          : "bg-error/[0.08] border-error/30 text-gray-300"
                      }`}
                    >
                      <span className="font-medium truncate max-w-[120px]">
                        {r.nickname}
                      </span>
                      <div className="flex items-center gap-2 font-mono font-semibold">
                        <span>{r.initialAnswer ? formatChoiceLetter(r.initialAnswer, useThaiChoices) : "-"}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                        <span className={r.isCorrect ? "text-success font-bold" : "text-error"}>
                          {r.finalAnswer ? formatChoiceLetter(r.finalAnswer, useThaiChoices) : "-"}
                        </span>
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
                      {t.room.backToSummaryBtn}
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
                      {currentQIndex + 1 >= totalQuestions ? t.room.finishMockBtn : t.room.nextQuestionBtn}
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
