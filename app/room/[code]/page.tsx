"use client";

import React, { useEffect, useState, use, useCallback, useRef } from "react";
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
  SkipForward,
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
  checkAndAdvanceAnsweringPhase,
  forceProceedToDiscussion,
  getQuestionAnswerStatus,
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
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState<string[]>([]);
  const [isSubmittingInitial, setIsSubmittingInitial] = useState(false);
  const [isForceProceeding, setIsForceProceeding] = useState(false);

  // Live state refs for Realtime events to avoid stale closures
  const currentQuestionRef = useRef<any>(null);
  const roomRef = useRef<Room | null>(null);
  const isHostRef = useRef<boolean>(false);

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

  // Notify room when tab closes or navigates away
  useEffect(() => {
    if (!roomCode || !currentPlayerId) return;

    const handleUnload = () => {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const channel = new BroadcastChannel(`necessaire-room-${roomCode.trim().toUpperCase()}`);
          channel.postMessage({
            type: "PLAYER_LEFT",
            playerId: currentPlayerId,
          });
          channel.close();
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [roomCode, currentPlayerId]);

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
    setAnsweredPlayerIds([]);
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
          setAnsweredPlayerIds((prev) => prev.filter((id) => id !== event.playerId));

          if (roomRef.current?.status === "ANSWERING" && currentQuestionRef.current?.id) {
            checkAndAdvanceAnsweringPhase(roomCode, currentQuestionRef.current.id).then((adv) => {
              if (adv.advanced) {
                setRoom((prev) => (prev ? { ...prev, status: "DISCUSSION" } : null));
                info(t.room.discussNoticeTitle || "Everyone has answered! Discuss your answers in Discord.", "Discussion Time");
              } else {
                setAnsweredCount(adv.answeredCount);
                setAnsweredPlayerIds(adv.answeredPlayerIds);
              }
            });
          }
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
          setAnsweredPlayerIds((prev) => prev.filter((id) => id !== event.playerId));
          info(t.room.kickedToast.replace("{name}", event.nickname || "Player"));

          if (roomRef.current?.status === "ANSWERING" && currentQuestionRef.current?.id) {
            checkAndAdvanceAnsweringPhase(roomCode, currentQuestionRef.current.id).then((adv) => {
              if (adv.advanced) {
                setRoom((prev) => (prev ? { ...prev, status: "DISCUSSION" } : null));
                info(t.room.discussNoticeTitle || "Everyone has answered! Discuss your answers in Discord.", "Discussion Time");
              } else {
                setAnsweredCount(adv.answeredCount);
                setAnsweredPlayerIds(adv.answeredPlayerIds);
              }
            });
          }
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
          if (event.answeredPlayerIds) {
            setAnsweredPlayerIds(event.answeredPlayerIds);
          }
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

  // Sync refs for event handlers to access current values without stale closures
  currentQuestionRef.current = currentQuestion;
  roomRef.current = room;
  isHostRef.current = isHost;

  // Sync initial answer state when room enters or reloads in ANSWERING phase
  useEffect(() => {
    if (room?.status === "ANSWERING" && currentQuestion?.id) {
      getQuestionAnswerStatus(roomCode, currentQuestion.id).then((status) => {
        setAnsweredCount(status.answeredCount);
        setAnsweredPlayerIds(status.answeredPlayerIds);
        if (currentPlayerId && status.answeredPlayerIds.includes(currentPlayerId)) {
          setIsInitialLocked(true);
        }
      });
    }
  }, [room?.status, currentQuestion?.id, roomCode, currentPlayerId]);

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
        setAnsweredPlayerIds((prev) => prev.filter((id) => id !== playerId));
        success(t.room.kickedToast.replace("{name}", nickname));

        // Immediately check if all remaining active players have answered
        if (room?.status === "ANSWERING" && currentQuestion) {
          const adv = await checkAndAdvanceAnsweringPhase(roomCode, currentQuestion.id);
          if (adv.advanced) {
            setRoom((prev) => (prev ? { ...prev, status: "DISCUSSION" } : null));
            loadRound1Answers(currentQuestion.id);
            info(t.room.discussNoticeTitle || "Everyone has answered! Discuss your answers in Discord.", "Discussion Time");
          } else {
            setAnsweredCount(adv.answeredCount);
            setAnsweredPlayerIds(adv.answeredPlayerIds);
          }
        }
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
        setAnsweredPlayerIds(res.answeredPlayerIds);

        await broadcastRoomEvent(roomCode, {
          type: "ANSWER_PROGRESS",
          answeredCount: res.answeredCount,
          totalPlayers: res.totalPlayers,
          answeredPlayerIds: res.answeredPlayerIds,
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

  // Host force proceeds to Discussion (skips waiting for absent / disconnected players)
  const handleForceProceedToDiscussion = async () => {
    if (!isHost || !currentQuestion) return;
    setIsForceProceeding(true);
    try {
      const res = await forceProceedToDiscussion(roomCode);
      if (res.success) {
        setRoom((prev) => (prev ? { ...prev, status: "DISCUSSION" } : null));
        loadRound1Answers(currentQuestion.id);
        info(t.room.hostForceProceedToast || "Host advanced the room to Discussion.", "Discussion Time");
      } else {
        error(res.error || "Failed to proceed to discussion.");
      }
    } catch (err: any) {
      error(err.message || "Error proceeding to discussion.");
    } finally {
      setIsForceProceeding(false);
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
        <Loader2 className="w-8 h-8 text-pencil animate-spin" />
        <p className="text-sm font-body text-pencil/60">{t.room.connecting.replace("{code}", roomCode)}</p>
      </div>
    );
  }

  if (!room || !mock) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20">
        <Card tape={true} className="max-w-md w-full text-center p-8 space-y-4 shadow-hard-lg">
          <HelpCircle className="w-10 h-10 text-pencil/50 mx-auto" />
          <h2 className="text-2xl font-heading font-bold text-pencil">{t.room.roomNotFoundTitle}</h2>
          <p className="text-sm font-body text-pencil/70">
            {t.room.roomNotFoundDesc.replace("{code}", roomCode)}
          </p>
          {!isSupabaseConfigured() && (
            <div className="text-left bg-sticky-yellow border-2 border-pencil rounded-wobbly-sm p-3 text-xs text-pencil font-body">
              ⚠️ Note: This website build is running in local mode without Supabase. If this room was hosted from a different device, other devices cannot connect until Supabase credentials are configured in Vercel and redeployed.
            </div>
          )}
          <div className="pt-2">
            <Link href="/join">
              <Button variant="primary" size="sm" className="font-heading font-bold">
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
      <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8 pb-32 sm:pb-16">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-pencil/70 hover:text-marker-red transition-colors p-1"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.room.leaveLobby}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-wobbly-sm text-xs font-heading font-bold bg-stamp-green/15 text-stamp-green border border-stamp-green">
              <span className="w-2 h-2 rounded-full bg-stamp-green animate-pulse" />
              {t.room.lobbyActive}
            </span>
          </div>
        </div>

        {/* Offline Warning if Supabase is missing */}
        {!isSupabaseConfigured() && (
          <div className="bg-sticky-yellow border-2 border-pencil rounded-wobbly-sm p-4 text-xs sm:text-sm text-pencil flex items-start gap-3 shadow-hard-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-pencil mt-0.5" />
            <div className="space-y-1">
              <p className="font-heading font-bold">{t.room.offlineWarningTitle}</p>
              <p className="font-body text-xs text-pencil/80">
                {t.room.offlineWarningDesc}
              </p>
            </div>
          </div>
        )}

        {/* Room Code Card (Admit Ticket) */}
        <Card tape={true} className="shadow-hard-lg">
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-pencil/60 uppercase tracking-widest font-heading font-bold">
                {t.room.roomCode}
              </span>
              <div className="text-5xl sm:text-7xl font-black text-pencil font-mono tracking-widest py-1 select-all">
                {roomCode}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-body text-pencil/80">
              <span className="font-heading font-bold text-pencil">{mock.title}</span>
              {mock.subject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-wobbly-sm bg-sticky-yellow text-pencil border border-pencil font-heading font-bold text-xs">
                  <BookOpen className="w-3 h-3 text-pencil" />
                  {mock.subject}
                </span>
              )}
              <span className="text-pencil/50">• {t.mock.questionsCount.replace("{count}", String(mock.questions.length))}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="w-full font-heading font-bold"
                leftIcon={
                  isCopiedCode ? (
                    <Check className="w-4 h-4 text-stamp-green stroke-[3]" />
                  ) : (
                    <Copy className="w-4 h-4 text-pencil" />
                  )
                }
              >
                {isCopiedCode ? t.room.copiedCode : t.room.copyCode}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="w-full font-heading font-bold"
                leftIcon={
                  isCopiedLink ? (
                    <Check className="w-4 h-4 text-stamp-green stroke-[3]" />
                  ) : (
                    <Share2 className="w-4 h-4 text-pencil" />
                  )
                }
              >
                {isCopiedLink ? t.room.copiedLink : t.room.copyLink}
              </Button>
            </div>
          </div>
        </Card>

        {/* Players List Card */}
        <Card className="shadow-hard-sm">
          <CardHeader className="flex flex-row items-center justify-between py-4 px-4 sm:px-6 bg-paper border-b-2 border-pencil/15">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-pencil" />
              <CardTitle className="text-base sm:text-lg font-heading font-bold text-pencil">
                {t.room.playersJoined} ({players.length})
              </CardTitle>
            </div>
            <span className="text-xs font-body text-pencil/60 hidden sm:inline">
              {t.room.discordWaiting}
            </span>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {players.map((p) => {
                const isMe = p.id === currentPlayerId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3.5 rounded-wobbly-sm border-2 transition-all ${
                      p.isHost
                        ? "bg-sticky-yellow border-pencil text-pencil shadow-hard-sm"
                        : "bg-white border-pencil/30 text-pencil"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-wobbly-sm border-2 border-pencil flex items-center justify-center text-xs font-heading font-bold shrink-0 ${
                          p.isHost
                            ? "bg-pencil text-white"
                            : "bg-paper text-pencil"
                        }`}
                      >
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-sm font-heading font-bold block truncate text-pencil">
                          {p.nickname}{" "}
                          {isMe && (
                            <span className="text-xs font-body text-pen-blue font-bold">
                              ({t.room.youBadge})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.isHost && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-heading font-bold text-pencil uppercase tracking-wider shrink-0 bg-white px-2 py-0.5 rounded-wobbly-sm border border-pencil shadow-hard-sm">
                          <Crown className="w-3 h-3 text-pencil fill-pencil" />
                          {t.room.hostBadge}
                        </span>
                      )}

                      {isHost && !p.isHost && (
                        <button
                          type="button"
                          onClick={() => handleKickPlayer(p.id, p.nickname)}
                          disabled={kickingPlayerId === p.id}
                          title={t.room.kickBtn || "เตะออก"}
                          className="p-1.5 rounded-wobbly-sm text-pencil/60 hover:text-marker-red hover:bg-marker-red/10 border border-transparent hover:border-marker-red transition-all active:scale-95"
                        >
                          {kickingPlayerId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-marker-red" />
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
        <div className="p-4 sm:p-6 rounded-wobbly-md bg-card border-2 border-pencil shadow-hard-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {isHost ? (
            <>
              <div className="text-center sm:text-left">
                <h4 className="text-base font-heading font-bold text-pencil">
                  {t.room.youAreHost}
                </h4>
                <p className="text-xs font-body text-pencil/70 mt-0.5">
                  {t.room.hostInstruction}
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartMock}
                isLoading={isStarting}
                className="w-full sm:w-auto font-heading font-bold"
                leftIcon={<Play className="w-5 h-5 fill-current" />}
              >
                {t.room.startTestBtn}
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center gap-3 py-2">
              <span className="w-3 h-3 rounded-full bg-pencil animate-bounce" />
              <span className="text-base font-heading font-bold text-pencil text-center">
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
        <Card tape={true} className="p-6 sm:p-10 space-y-6 shadow-hard-lg">
          {/* Header */}
          <div className="space-y-1">
            <span className="inline-block text-xs font-heading font-bold tracking-widest text-pencil uppercase bg-sticky-yellow border border-pencil rounded-wobbly-sm px-2.5 py-0.5 shadow-hard-sm">
              🏆 Pre-Exam Drill Complete
            </span>
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-pencil tracking-tight">
              {t.room.mockComplete}
            </h1>
            <p className="text-xs sm:text-sm font-body text-pencil/70">
              {mock.title} • {players.length} {t.room.playersJoined.toLowerCase()}
            </p>
          </div>

          {/* Big Score Box (Exam Stamp) */}
          {loadingSummary ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-pencil" />
            </div>
          ) : summary ? (
            <div className="p-6 rounded-wobbly bg-paper border-2 border-pencil space-y-3 shadow-hard-sm">
              <div className="text-5xl sm:text-6xl font-black text-pencil font-mono">
                {summary.playerScore.correct} / {summary.totalQuestions}
              </div>

              <div className="flex items-center justify-center gap-6 text-sm font-heading font-bold pt-1">
                <span className="text-stamp-green flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  {t.room.correctCount.replace("{count}", String(summary.playerScore.correct))}
                </span>
                <span className="text-pencil/40">•</span>
                <span className="text-marker-red flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 stroke-[2.5]" />
                  {t.room.wrongCount.replace("{count}", String(summary.playerScore.wrong))}
                </span>
              </div>
            </div>
          ) : null}

          {/* Needs Review Section */}
          {summary && (
            <div className="space-y-4 text-left pt-2 border-t-2 border-dashed border-pencil/20">
              <div>
                <h3 className="text-lg font-heading font-bold text-pencil flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-pencil" />
                  {t.room.needsReviewTitle}
                </h3>
                <p className="text-xs font-body text-pencil/70 mt-0.5">
                  {t.room.needsReviewSubtitle}
                </p>
              </div>

              {summary.needsReviewQuestions.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.needsReviewQuestions.map((nr) => (
                    <div
                      key={nr.questionId}
                      className="p-3.5 rounded-wobbly-sm bg-white border-2 border-pencil/30 flex items-center justify-between gap-4 shadow-hard-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-wobbly-sm font-mono font-bold text-xs bg-sticky-yellow text-pencil border border-pencil shrink-0">
                            Q{nr.originalQuestionNumber}
                          </span>
                          <span className="text-xs font-body text-pencil/80 truncate block">
                            {nr.questionText}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs font-heading font-bold text-pencil font-mono">
                        <span className="text-pencil font-black">{nr.correctCount}</span> /{" "}
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
                        className="w-full font-heading font-bold py-3"
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                      >
                        {t.room.reviewTheseBtn} ({summary.needsReviewQuestions.length})
                      </Button>
                    ) : (
                      <p className="text-xs text-center font-body text-pencil/60 italic py-1">
                        {t.room.waitingHostReview}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-wobbly-sm bg-stamp-green/10 border-2 border-stamp-green text-center text-xs font-heading font-bold text-stamp-green">
                  ✓ {t.room.perfectRun}
                </div>
              )}
            </div>
          )}

          {/* Quick Exit Links */}
          <div className="pt-4 border-t-2 border-dashed border-pencil/20 flex flex-col sm:flex-row justify-center gap-3">
            <Link href={`/mock/${mock.id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full font-heading font-bold">
                {t.room.reviewFullKey}
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full font-heading font-bold">
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
    <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-32 sm:pb-16">
      {/* Host Disconnected Alert Banner */}
      {isHostDisconnected && !isHost && (
        <div className="p-3.5 rounded-wobbly-sm bg-sticky-yellow border-2 border-pencil text-pencil text-xs sm:text-sm flex items-center justify-between gap-3 shadow-hard-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 text-pencil" />
            <span className="font-body">{t.room.hostDisconnectedNotice}</span>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="text-xs font-heading font-bold text-pencil underline shrink-0"
          >
            {t.room.leaveBtn}
          </button>
        </div>
      )}

      {/* Top Header: Question Progress & Room Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-dashed border-pencil/20 pb-3 sm:pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-lg sm:text-xl font-heading font-extrabold text-pencil">
            {isReviewMode ? t.room.reviewModeQ : "Q"} {currentQIndex + 1} / {totalQuestions}
          </span>
          {isReviewMode && (
            <span className="text-xs font-heading font-bold text-pencil px-2 py-0.5 rounded-wobbly-sm bg-sticky-yellow border border-pencil shadow-hard-sm">
              {t.room.originallyQ.replace("{num}", String(currentQuestion.questionNumber))}
            </span>
          )}
          <span className="text-xs font-body text-pencil/70">
            • Room <strong className="font-mono text-pencil font-bold">{roomCode}</strong>
          </span>

          {/* Toggle Thai / English Choices */}
          <button
            type="button"
            onClick={() => setUseThaiChoices(!useThaiChoices)}
            className="text-xs px-2.5 py-0.5 rounded-wobbly-sm border-2 border-pencil bg-paper text-pencil hover:bg-sticky-yellow transition-colors flex items-center gap-1 font-heading font-bold shadow-hard-sm"
            title="สลับการแสดงผลตัวเลือก A-B-C-D และ ก-ข-ค-ง"
          >
            <span>{t.room.choiceToggle}</span>
            <span className="text-pen-blue">{useThaiChoices ? "ก ข ค ง" : "A B C D"}</span>
          </button>

          {/* Players count button */}
          <button
            type="button"
            onClick={() => setShowPlayersModal(true)}
            className="text-xs px-2.5 py-0.5 rounded-wobbly-sm border-2 border-pencil bg-paper text-pencil hover:bg-sticky-yellow transition-colors flex items-center gap-1.5 font-heading font-bold shadow-hard-sm"
            title="ดูผู้เล่นในห้อง"
          >
            <Users className="w-3.5 h-3.5 text-pencil" />
            <span>{players.length}</span>
          </button>
        </div>

        {/* Phase Pill */}
        <div className="flex items-center gap-2">
          {room.status === "ANSWERING" && (
            <span className="px-3 py-1 rounded-wobbly-sm text-xs font-heading font-bold bg-sticky-yellow text-pencil border-2 border-pencil uppercase tracking-wider shadow-hard-sm">
              {t.room.phase1Badge}
            </span>
          )}
          {(room.status === "DISCUSSION" || room.status === "CHANGING") && (
            <span className="px-3 py-1 rounded-wobbly-sm text-xs font-heading font-bold bg-pen-blue text-white border-2 border-pencil uppercase tracking-wider flex items-center gap-1.5 shadow-hard-sm">
              <Sparkles className="w-3.5 h-3.5 text-sticky-yellow" />
              {t.room.phaseDiscussChangeBadge || t.room.phase2Badge}
            </span>
          )}
          {room.status === "REVEAL" && (
            <span className="px-3 py-1 rounded-wobbly-sm text-xs font-heading font-bold bg-stamp-green text-white border-2 border-pencil uppercase tracking-wider flex items-center gap-1.5 shadow-hard-sm">
              <Eye className="w-3.5 h-3.5" />
              {t.room.phase4Badge}
            </span>
          )}
        </div>
      </div>

      {/* Active Game Players Modal */}
      {showPlayersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pencil/40 backdrop-blur-xs">
          <div className="bg-card border-2 border-pencil rounded-wobbly max-w-md w-full p-5 space-y-4 shadow-hard-xl">
            <div className="flex items-center justify-between border-b-2 border-pencil/15 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pencil" />
                <h3 className="text-lg font-heading font-bold text-pencil">
                  {t.room.playersJoined} ({players.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlayersModal(false)}
                className="p-1.5 rounded-wobbly-sm text-pencil/70 hover:text-pencil hover:bg-paper transition-colors"
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
                    className="p-3 rounded-wobbly-sm bg-white border-2 border-pencil/30 flex items-center justify-between text-sm shadow-hard-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-wobbly-sm border-2 border-pencil flex items-center justify-center text-xs font-heading font-bold shrink-0 ${
                          p.isHost
                            ? "bg-pencil text-white"
                            : "bg-paper text-pencil"
                        }`}
                      >
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-heading font-bold text-pencil">
                        {p.nickname} {isMe && <span className="text-xs font-body text-pen-blue font-bold">({t.room.youBadge})</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {room.status === "ANSWERING" && (
                        answeredPlayerIds.includes(p.id) ? (
                          <span className="text-[10px] text-stamp-green flex items-center gap-1 bg-stamp-green/15 border border-stamp-green px-2 py-0.5 rounded-wobbly-sm font-heading font-bold">
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                            {t.room.lockedStatus}
                          </span>
                        ) : (
                          <span className="text-[10px] text-pencil flex items-center gap-1 bg-sticky-yellow border border-pencil px-2 py-0.5 rounded-wobbly-sm font-heading font-bold">
                            <Loader2 className="w-3 h-3 animate-spin text-pencil" />
                            {t.room.thinkingStatus}
                          </span>
                        )
                      )}
                      {p.isHost && (
                        <span className="text-[10px] font-heading font-bold text-pencil uppercase px-2 py-0.5 rounded-wobbly-sm bg-white border border-pencil shadow-hard-sm">
                          <Crown className="w-3 h-3 text-pencil fill-pencil inline mr-1" />
                          {t.room.hostBadge}
                        </span>
                      )}
                      {isHost && !p.isHost && (
                        <button
                          type="button"
                          onClick={() => handleKickPlayer(p.id, p.nickname)}
                          disabled={kickingPlayerId === p.id}
                          className="p-1.5 rounded-wobbly-sm text-pencil/60 hover:text-marker-red hover:bg-marker-red/10 border border-transparent hover:border-marker-red transition-all"
                          title={t.room.kickBtn}
                        >
                          {kickingPlayerId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-marker-red" />
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

            <div className="pt-2 border-t-2 border-pencil/15 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPlayersModal(false)}
                className="font-heading font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Question Card */}
      <Card tape={true} className="shadow-hard-lg">
        <CardHeader className="bg-paper py-4 px-4 sm:px-6 border-b-2 border-pencil/15">
          <CardTitle className="text-lg sm:text-2xl text-pencil font-heading font-bold leading-relaxed whitespace-pre-line">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* =======================================================
              PHASE 1: ANSWERING
              ======================================================= */}
          {room.status === "ANSWERING" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {choices.map((c) => {
                  const isSelected = selectedInitialChoice === c.letter;

                  return (
                    <button
                      key={c.letter}
                      type="button"
                      disabled={isInitialLocked || isSubmittingInitial}
                      onClick={() => setSelectedInitialChoice(c.letter)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-wobbly-sm border-2 flex items-start gap-3.5 transition-all select-none min-h-[58px] sm:min-h-[64px] active:scale-[0.99] ${
                        isSelected
                          ? "border-pencil bg-sticky-yellow text-pencil shadow-hard font-semibold"
                          : "border-pencil/40 bg-white text-pencil hover:border-pencil hover:bg-paper"
                      } ${isInitialLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                    >
                      <span
                        className={`w-8 h-8 rounded-wobbly-sm border-2 border-pencil flex items-center justify-center font-heading font-bold text-xs sm:text-sm shrink-0 transition-colors ${
                          isSelected
                            ? "bg-pencil text-white"
                            : "bg-paper text-pencil"
                        }`}
                      >
                        {formatChoiceLetter(c.letter, useThaiChoices)}
                      </span>
                      <span className="text-base sm:text-lg font-body pt-0.5 leading-snug">{c.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress & Lock Button */}
              <div className="pt-4 border-t-2 border-dashed border-pencil/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm font-body text-pencil/80 flex items-center gap-2">
                  <span className="font-heading font-bold text-pencil text-base">
                    {answeredCount} / {players.length}
                  </span>
                  <span>{t.room.playersAnswered}</span>
                  {isInitialLocked && (
                    <span className="inline-flex items-center gap-1 text-stamp-green font-heading font-bold ml-2">
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
                    className="w-full sm:w-auto py-3 text-sm font-heading font-bold"
                    leftIcon={<Lock className="w-4 h-4" />}
                  >
                    {t.room.lockAnswer1stBtn || t.room.lockAnswerBtn}
                  </Button>
                ) : (
                  <span className="text-xs sm:text-sm font-body text-pencil/60 italic">
                    {t.room.waitingAll1st
                      ? t.room.waitingAll1st.replace("{answered}", String(answeredCount)).replace("{total}", String(players.length))
                      : t.room.waitingAllLock}
                  </span>
                )}
              </div>

              {/* Host Control: Skip waiting / Force proceed to Discussion */}
              {isHost && (
                <div className="pt-3.5 border-t-2 border-dashed border-pencil/20 flex flex-col sm:flex-row items-center justify-between gap-3 bg-sticky-yellow/40 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-wobbly border-t-2 border-pencil">
                  <div className="text-xs font-body text-pencil flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pencil animate-pulse shrink-0" />
                    <span>{t.room.hostControlNotice}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceProceedToDiscussion}
                    isLoading={isForceProceeding}
                    className="w-full sm:w-auto text-xs font-heading font-bold text-pencil shrink-0"
                    leftIcon={<SkipForward className="w-3.5 h-3.5" />}
                  >
                    {t.room.forceProceedBtn}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* =======================================================
              PHASE 2: DISCUSS & CHANGE (Combined Screen)
              ======================================================= */}
          {(room.status === "DISCUSSION" || room.status === "CHANGING") && (
            <div className="space-y-6">
              {/* Discord Voice chat banner */}
              <div className="p-4 sm:p-5 rounded-wobbly-sm bg-[#5865F2]/10 border-2 border-[#5865F2]/40 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-hard-sm">
                <div className="w-11 h-11 rounded-wobbly-sm bg-[#5865F2]/20 border-2 border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center shrink-0">
                  <DiscordIcon className="w-6 h-6 fill-[#5865F2]" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-base sm:text-lg font-heading font-bold text-pencil flex items-center justify-center sm:justify-start gap-2">
                    <span>{t.room.discussNoticeTitle}</span>
                  </h3>
                  <p className="text-xs sm:text-sm font-body text-pencil/80 leading-relaxed">
                    {t.room.round1AnswersDesc || t.room.discussNoticeDesc}
                  </p>
                </div>
              </div>

              {/* 1. Who answered what in Round 1 */}
              <div className="p-5 sm:p-6 rounded-wobbly bg-white border-2 border-pencil space-y-4 shadow-hard-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pencil fill-pencil" />
                    <h4 className="text-base font-heading font-bold text-pencil">
                      {t.room.round1AnswersTitle}
                    </h4>
                  </div>
                  {loadingRound1Answers && (
                    <div className="flex items-center gap-1.5 text-xs font-body text-pencil/60">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-pencil" />
                      <span>{t.mock.loading}</span>
                    </div>
                  )}
                </div>

                {/* Tally Breakdown Bar */}
                {round1Answers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-heading font-bold text-pencil/70 block uppercase">
                      📊 {t.room.tallyLabel}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {choices.map((c) => {
                        const count = round1Answers.filter((a) => a.initialAnswer === c.letter).length;
                        const pct = round1Answers.length > 0 ? Math.round((count / round1Answers.length) * 100) : 0;
                        const isMyPick = selectedInitialChoice === c.letter;

                        return (
                          <div
                            key={c.letter}
                            className={`p-2.5 rounded-wobbly-sm border-2 flex flex-col justify-between transition-all ${
                              isMyPick
                                ? "bg-sticky-yellow border-pencil shadow-hard-sm"
                                : "bg-paper border-pencil/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-heading font-bold text-sm text-pencil">
                                {t.room.optionWord} {formatChoiceLetter(c.letter, useThaiChoices)}
                              </span>
                              {isMyPick && (
                                <span className="text-[10px] bg-pencil text-white px-1.5 py-0.5 rounded-wobbly-sm font-heading font-bold uppercase">
                                  {t.room.youBadge}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-baseline justify-between">
                              <span className="text-xl font-black text-pencil font-mono">{count}</span>
                              <span className="text-xs font-body text-pencil/60 font-mono">{pct}%</span>
                            </div>
                            <div className="w-full bg-pencil/15 h-2 rounded-full mt-1.5 overflow-hidden border border-pencil/20">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isMyPick ? "bg-pencil" : "bg-pencil/60"
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
                <div className="space-y-2 pt-2 border-t-2 border-dashed border-pencil/20">
                  <span className="text-xs font-heading font-bold text-pencil/70 block uppercase">
                    👥 {t.room.whoAnsweredWhat} ({round1Answers.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {round1Answers.map((item) => {
                      const isMe = item.playerId === currentPlayerId;
                      return (
                        <div
                          key={item.playerId}
                          className={`p-2.5 rounded-wobbly-sm border-2 flex items-center justify-between gap-2 text-xs transition-all ${
                            isMe
                              ? "bg-sticky-yellow border-pencil text-pencil shadow-hard-sm"
                              : "bg-paper border-pencil/30 text-pencil"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-wobbly-sm border border-pencil bg-white text-pencil flex items-center justify-center font-heading font-bold text-[11px] shrink-0">
                              {item.nickname.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate font-heading font-bold">
                              {item.nickname} {isMe && <span className="text-pen-blue font-bold font-body">({t.room.youBadge})</span>}
                            </span>
                          </div>

                          {item.initialAnswer ? (
                            <span className="px-2 py-0.5 rounded-wobbly-sm bg-white text-pencil font-heading font-bold font-mono border border-pencil shadow-hard-sm shrink-0">
                              {t.room.optionWord} {formatChoiceLetter(item.initialAnswer, useThaiChoices)}
                            </span>
                          ) : (
                            <span className="text-[11px] font-body text-pencil/50 italic shrink-0">
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
              <div className="p-5 sm:p-6 rounded-wobbly bg-white border-2 border-pencil space-y-4 shadow-hard-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b-2 border-dashed border-pencil/20">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-heading font-bold text-pencil flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-pencil" />
                      <span>{t.room.changeDirectHelp}</span>
                    </h4>
                    <p className="text-xs font-body text-pencil/70">
                      {t.room.initialWas}{" "}
                      <strong className="text-pencil font-mono font-bold bg-sticky-yellow px-1.5 py-0.5 rounded-wobbly-sm border border-pencil">
                        {t.room.optionWord} {selectedInitialChoice ? formatChoiceLetter(selectedInitialChoice, useThaiChoices) : "-"}
                      </strong>
                    </p>
                  </div>

                  {isFinalLocked && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-stamp-green bg-stamp-green/15 px-3 py-1 rounded-wobbly-sm border border-stamp-green">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
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
                            className={`w-full text-left p-3.5 rounded-wobbly-sm border-2 flex items-start justify-between gap-3 transition-all select-none active:scale-[0.99] ${
                              isSelected
                                ? "border-pencil bg-sticky-yellow text-pencil shadow-hard font-semibold"
                                : "border-pencil/30 bg-paper text-pencil hover:border-pencil hover:bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span
                                className={`w-8 h-8 rounded-wobbly-sm border-2 border-pencil flex items-center justify-center font-heading font-bold text-xs sm:text-sm shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-pencil text-white"
                                    : "bg-paper text-pencil"
                                }`}
                              >
                                {formatChoiceLetter(c.letter, useThaiChoices)}
                              </span>
                              <span className="text-base font-body pt-0.5 leading-snug">{c.text}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                              {isOriginal && (
                                <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-wobbly-sm bg-paper text-pencil/70 border border-pencil/30">
                                  {t.room.initialWas.replace(":", "")}
                                </span>
                              )}
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-pencil stroke-[2.5]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Lock 2nd Button & Counter */}
                    <div className="pt-3 border-t-2 border-dashed border-pencil/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs sm:text-sm font-body text-pencil/80 flex items-center gap-2">
                        <span className="font-heading font-bold text-pencil text-base">{finalLockedCount} / {players.length}</span>
                        <span>{t.room.playersAnswered}</span>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        disabled={!selectedFinalChoice && !selectedInitialChoice}
                        isLoading={isSubmittingFinal}
                        onClick={handleFinalLock}
                        className="w-full sm:w-auto py-3 font-heading font-bold"
                        leftIcon={<Lock className="w-4 h-4" />}
                      >
                        {t.room.lockAnswer2ndBtn}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-wobbly-sm bg-stamp-green/10 border-2 border-stamp-green text-center space-y-1.5">
                    <div className="flex items-center justify-center gap-1.5 text-stamp-green font-heading font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>{t.room.finalLockedNotice}</span>
                    </div>
                    <p className="text-sm font-body text-pencil">
                      {t.room.optionWord}{" "}
                      <strong className="text-pencil font-mono font-bold text-base bg-white px-2 py-0.5 rounded-wobbly-sm border border-pencil shadow-hard-sm">
                        {formatChoiceLetter(selectedFinalChoice || selectedInitialChoice || "A", useThaiChoices)}
                      </strong>
                    </p>
                    <p className="text-xs font-body text-pencil/70 pt-1">
                      {t.room.waitingReveal.replace("{locked}", String(finalLockedCount)).replace("{total}", String(players.length))}
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Host Instant Reveal Control */}
              {isHost && (
                <div className="p-5 rounded-wobbly bg-sticky-yellow border-2 border-pencil shadow-hard flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Crown className="w-4 h-4 text-pencil fill-pencil" />
                      <span className="text-base font-heading font-bold text-pencil">
                        {t.room.hostRevealInstant}
                      </span>
                    </div>
                    <p className="text-xs font-body text-pencil/80 font-mono">
                      {t.room.hostRevealLiveCount.replace("{locked}", String(finalLockedCount)).replace("{total}", String(players.length))}
                    </p>
                  </div>

                  <Button
                    variant="gold"
                    size="lg"
                    onClick={handleRevealAnswer}
                    isLoading={isRevealing}
                    className="w-full sm:w-auto py-3 px-6 text-sm font-heading font-bold"
                    leftIcon={<Eye className="w-5 h-5" />}
                  >
                    {t.room.revealBtn}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* =======================================================
              PHASE 3: REVEAL
              ======================================================= */}
          {room.status === "REVEAL" && revealData && (
            <div className="space-y-6">
              {/* Correct Answer Highlight (Ink Stamp) */}
              <div className="p-5 rounded-wobbly bg-stamp-green/15 border-2 border-stamp-green space-y-2 shadow-hard-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-stamp-green flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    {t.room.correctAnswer}
                  </span>
                  <span className="text-xs font-heading font-bold text-pencil">
                    {revealData.correctCount} / {revealData.totalPlayers}
                  </span>
                </div>
                <div className="text-3xl font-black text-pencil font-mono">
                  {t.room.optionWord} {formatChoiceLetter(revealData.correctAnswer, useThaiChoices)}
                </div>
              </div>

              {/* Explanation Card */}
              {revealData.explanation && (
                <div className="p-5 rounded-wobbly-sm bg-sticky-yellow/40 border-2 border-dashed border-pencil/30 space-y-2">
                  <span className="text-xs font-heading font-bold text-pencil uppercase tracking-wider block">
                    💡 {t.room.explanation}
                  </span>
                  <p className="text-sm font-body text-pencil/80 leading-relaxed whitespace-pre-line">
                    {revealData.explanation}
                  </p>
                </div>
              )}

              {/* Trajectory Breakdown (Initial -> Final) */}
              <div className="space-y-2">
                <span className="text-xs font-heading font-bold text-pencil/70 uppercase tracking-wider block">
                  📝 {t.room.playerTrajectory}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {revealData.results.map((r) => (
                    <div
                      key={r.playerId}
                      className={`p-3 rounded-wobbly-sm border-2 flex items-center justify-between text-xs sm:text-sm transition-all shadow-hard-sm ${
                        r.isCorrect
                          ? "bg-stamp-green/10 border-stamp-green text-pencil"
                          : "bg-marker-red/[0.06] border-marker-red/40 text-pencil"
                      }`}
                    >
                      <span className="font-heading font-bold truncate max-w-[120px] text-pencil">
                        {r.nickname}
                      </span>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span>{r.initialAnswer ? formatChoiceLetter(r.initialAnswer, useThaiChoices) : "-"}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-pencil/50" />
                        <span className={r.isCorrect ? "text-stamp-green font-black" : "text-marker-red font-black"}>
                          {r.finalAnswer ? formatChoiceLetter(r.finalAnswer, useThaiChoices) : "-"}
                        </span>
                        {r.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-stamp-green stroke-[2.5]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-marker-red stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Advance Action (Next Question or Back to Summary if Review Mode) */}
              {isHost && (
                <div className="pt-4 border-t-2 border-dashed border-pencil/20 flex items-center justify-end gap-3">
                  {isReviewMode && currentQIndex + 1 >= totalQuestions ? (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleBackToSummary}
                      isLoading={isExitingReview}
                      className="w-full sm:w-auto font-heading font-bold"
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
                      className="w-full sm:w-auto font-heading font-bold"
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
