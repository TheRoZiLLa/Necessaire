import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import { getRoomDetails } from "./room";
import { getMockById } from "./storage";
import { broadcastRoomEvent } from "./realtime";
import {
  AnswerRecord,
  ChoiceLetter,
  PlayerRevealResult,
  RevealData,
  RoomStatus,
  Round1AnswerItem,
} from "@/types";

const LOCAL_STORAGE_ANSWERS_KEY = "necessaire_answers";

function getLocalAnswers(): AnswerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ANSWERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAnswers(answers: AnswerRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_ANSWERS_KEY, JSON.stringify(answers));
  } catch (err) {
    console.error("Failed to save answers to localStorage", err);
  }
}

/**
 * Submit and lock initial answer for the current question.
 */
export async function submitInitialAnswer(
  roomCode: string,
  playerId: string,
  questionId: string,
  choice: ChoiceLetter
): Promise<{
  success: boolean;
  answeredCount: number;
  totalPlayers: number;
  allAnswered: boolean;
  answeredPlayerIds: string[];
  error?: string;
}> {
  const roomDetails = await getRoomDetails(roomCode);
  if (!roomDetails) {
    return {
      success: false,
      answeredCount: 0,
      totalPlayers: 0,
      allAnswered: false,
      answeredPlayerIds: [],
      error: "Room not found",
    };
  }

  const roomId = roomDetails.room.id;
  const activePlayerIds = roomDetails.players.map((p) => p.id);
  const totalPlayers = activePlayerIds.length;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Upsert initial answer
        const { error: upsertError } = await supabase.from("answers").upsert(
          {
            room_id: roomId,
            question_id: questionId,
            player_id: playerId,
            initial_answer: choice,
            final_answer: choice, // default to initial until changed
            locked: true,
            is_ready: false,
            final_locked: false,
          },
          { onConflict: "room_id,question_id,player_id" }
        );

        if (upsertError) throw new Error(upsertError.message);

        // Count locked answers for this question specifically from active players
        const { data, error: countError } = await supabase
          .from("answers")
          .select("player_id")
          .eq("room_id", roomId)
          .eq("question_id", questionId)
          .eq("locked", true)
          .in("player_id", activePlayerIds);

        if (countError) throw new Error(countError.message);

        const answeredPlayerIds = data ? data.map((d: any) => d.player_id) : [];
        const answeredCount = answeredPlayerIds.length;
        const allAnswered = answeredCount >= totalPlayers && totalPlayers > 0;

        if (allAnswered) {
          await supabase.from("rooms").update({ status: "DISCUSSION" }).eq("id", roomId);
        }

        return { success: true, answeredCount, totalPlayers, allAnswered, answeredPlayerIds };
      }
    } catch (err: any) {
      console.warn("Supabase submitInitialAnswer error, falling back to local:", err.message);
    }
  }

  // Local Storage Fallback
  const allAnswers = getLocalAnswers();
  const existingIdx = allAnswers.findIndex(
    (a) => a.roomId === roomId && a.questionId === questionId && a.playerId === playerId
  );

  const answerRecord: AnswerRecord = {
    id:
      existingIdx >= 0
        ? allAnswers[existingIdx].id
        : "ans-" + Math.random().toString(36).substring(2, 9),
    roomId,
    questionId,
    playerId,
    initialAnswer: choice,
    finalAnswer: choice,
    locked: true,
    finalLocked: false,
    isReady: false,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    allAnswers[existingIdx] = answerRecord;
  } else {
    allAnswers.push(answerRecord);
  }
  saveLocalAnswers(allAnswers);

  const currentQAnswers = allAnswers.filter(
    (a) =>
      a.roomId === roomId &&
      a.questionId === questionId &&
      a.locked &&
      activePlayerIds.includes(a.playerId)
  );
  const answeredPlayerIds = currentQAnswers.map((a) => a.playerId);
  const answeredCount = answeredPlayerIds.length;
  const allAnswered = answeredCount >= totalPlayers && totalPlayers > 0;

  if (allAnswered) {
    // Update local room status to DISCUSSION
    const localRoomsRaw = localStorage.getItem("necessaire_rooms");
    if (localRoomsRaw) {
      const rooms = JSON.parse(localRoomsRaw);
      const updatedRooms = rooms.map((r: any) =>
        r.id === roomId ? { ...r, status: "DISCUSSION" } : r
      );
      localStorage.setItem("necessaire_rooms", JSON.stringify(updatedRooms));
    }
  }

  return { success: true, answeredCount, totalPlayers, allAnswered, answeredPlayerIds };
}

/**
 * Get accurate count and player IDs of who has locked their initial answer for a question.
 */
export async function getQuestionAnswerStatus(
  roomCode: string,
  questionId: string
): Promise<{
  answeredCount: number;
  totalPlayers: number;
  answeredPlayerIds: string[];
}> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return { answeredCount: 0, totalPlayers: 0, answeredPlayerIds: [] };

  const { room, players } = roomDetails;
  const activePlayerIds = players.map((p) => p.id);
  const totalPlayers = players.length;

  let answeredPlayerIds: string[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("answers")
          .select("player_id")
          .eq("room_id", room.id)
          .eq("question_id", questionId)
          .eq("locked", true)
          .in("player_id", activePlayerIds);

        if (data) {
          answeredPlayerIds = data.map((d: any) => d.player_id);
        }
      }
    } catch (err: any) {
      console.warn("Supabase getQuestionAnswerStatus error:", err.message);
    }
  }

  if (answeredPlayerIds.length === 0) {
    const allAnswers = getLocalAnswers();
    const currentQAnswers = allAnswers.filter(
      (a) =>
        a.roomId === room.id &&
        a.questionId === questionId &&
        a.locked &&
        activePlayerIds.includes(a.playerId)
    );
    answeredPlayerIds = currentQAnswers.map((a) => a.playerId);
  }

  return {
    answeredCount: answeredPlayerIds.length,
    totalPlayers,
    answeredPlayerIds,
  };
}

/**
 * Check if all currently active players have answered the question.
 * If so, transition to DISCUSSION, broadcast event, and return advanced: true.
 * If not, broadcast updated ANSWER_PROGRESS and return advanced: false.
 */
export async function checkAndAdvanceAnsweringPhase(
  roomCode: string,
  questionId: string
): Promise<{
  advanced: boolean;
  answeredCount: number;
  totalPlayers: number;
  answeredPlayerIds: string[];
}> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return { advanced: false, answeredCount: 0, totalPlayers: 0, answeredPlayerIds: [] };

  const { room, players } = roomDetails;
  if (room.status !== "ANSWERING") {
    return {
      advanced: false,
      answeredCount: 0,
      totalPlayers: players.length,
      answeredPlayerIds: [],
    };
  }

  const activePlayerIds = players.map((p) => p.id);
  const totalPlayers = activePlayerIds.length;

  if (totalPlayers === 0) {
    return { advanced: false, answeredCount: 0, totalPlayers: 0, answeredPlayerIds: [] };
  }

  const status = await getQuestionAnswerStatus(roomCode, questionId);
  const answeredCount = status.answeredCount;
  const answeredPlayerIds = status.answeredPlayerIds;
  const allAnswered = answeredCount >= totalPlayers && totalPlayers > 0;

  if (allAnswered) {
    // Transition to DISCUSSION
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.from("rooms").update({ status: "DISCUSSION" }).eq("id", room.id);
        }
      } catch (err: any) {
        console.warn("Supabase checkAndAdvance update error:", err.message);
      }
    }

    if (typeof window !== "undefined") {
      const localRoomsRaw = localStorage.getItem("necessaire_rooms");
      if (localRoomsRaw) {
        const rooms = JSON.parse(localRoomsRaw);
        const updatedRooms = rooms.map((r: any) =>
          r.id === room.id ? { ...r, status: "DISCUSSION" } : r
        );
        localStorage.setItem("necessaire_rooms", JSON.stringify(updatedRooms));
      }
    }

    await broadcastRoomEvent(normalizedCode, {
      type: "ANSWER_PROGRESS",
      answeredCount,
      totalPlayers,
      answeredPlayerIds,
    });
    await broadcastRoomEvent(normalizedCode, {
      type: "STATUS_CHANGED",
      status: "DISCUSSION",
    });

    return { advanced: true, answeredCount, totalPlayers, answeredPlayerIds };
  } else {
    // Broadcast updated progress
    await broadcastRoomEvent(normalizedCode, {
      type: "ANSWER_PROGRESS",
      answeredCount,
      totalPlayers,
      answeredPlayerIds,
    });
    return { advanced: false, answeredCount, totalPlayers, answeredPlayerIds };
  }
}

/**
 * Host manually forces the room from ANSWERING to DISCUSSION phase,
 * skipping waiting for remaining / disconnected players.
 */
export async function forceProceedToDiscussion(
  roomCode: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return { success: false, error: "Room not found" };

  const roomId = roomDetails.room.id;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("rooms").update({ status: "DISCUSSION" }).eq("id", roomId);
      }
    } catch (err: any) {
      console.warn("Supabase forceProceedToDiscussion error:", err.message);
    }
  }

  // Local storage update
  if (typeof window !== "undefined") {
    const localRoomsRaw = localStorage.getItem("necessaire_rooms");
    if (localRoomsRaw) {
      const rooms = JSON.parse(localRoomsRaw);
      const updatedRooms = rooms.map((r: any) =>
        r.id === roomId ? { ...r, status: "DISCUSSION" } : r
      );
      localStorage.setItem("necessaire_rooms", JSON.stringify(updatedRooms));
    }
  }

  await broadcastRoomEvent(normalizedCode, {
    type: "STATUS_CHANGED",
    status: "DISCUSSION",
  });

  return { success: true };
}

/**
 * Set player ready state during Discussion Phase.
 */
export async function setPlayerReady(
  roomCode: string,
  playerId: string,
  questionId: string,
  isReady: boolean
): Promise<{
  success: boolean;
  readyCount: number;
  totalPlayers: number;
  allReady: boolean;
  error?: string;
}> {
  const roomDetails = await getRoomDetails(roomCode);
  if (!roomDetails) return { success: false, readyCount: 0, totalPlayers: 0, allReady: false, error: "Room not found" };

  const roomId = roomDetails.room.id;
  const totalPlayers = roomDetails.players.length;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from("answers")
          .update({ is_ready: isReady })
          .eq("room_id", roomId)
          .eq("question_id", questionId)
          .eq("player_id", playerId);

        const { count } = await supabase
          .from("answers")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("question_id", questionId)
          .eq("is_ready", true);

        const readyCount = count || 0;
        const allReady = readyCount >= totalPlayers && totalPlayers > 0;

        return { success: true, readyCount, totalPlayers, allReady };
      }
    } catch (err: any) {
      console.warn("Supabase setPlayerReady error, using local fallback:", err.message);
    }
  }

  // Local Storage Fallback
  const allAnswers = getLocalAnswers();
  const existing = allAnswers.find(
    (a) => a.roomId === roomId && a.questionId === questionId && a.playerId === playerId
  );
  if (existing) {
    existing.isReady = isReady;
    saveLocalAnswers(allAnswers);
  }

  const readyAnswers = allAnswers.filter(
    (a) => a.roomId === roomId && a.questionId === questionId && a.isReady
  );
  const readyCount = readyAnswers.length;
  const allReady = readyCount >= totalPlayers && totalPlayers > 0;

  return { success: true, readyCount, totalPlayers, allReady };
}

/**
 * Host transitions room from DISCUSSION to CHANGING phase.
 */
export async function transitionToChangePhase(roomCode: string): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = roomCode.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("rooms").update({ status: "CHANGING" }).eq("room_code", normalizedCode);
      }
    } catch (err: any) {
      console.warn("Supabase transitionToChangePhase error:", err.message);
    }
  }

  // Local update
  if (typeof window !== "undefined") {
    const localRoomsRaw = localStorage.getItem("necessaire_rooms");
    if (localRoomsRaw) {
      const rooms = JSON.parse(localRoomsRaw);
      const updated = rooms.map((r: any) =>
        r.roomCode === normalizedCode ? { ...r, status: "CHANGING" } : r
      );
      localStorage.setItem("necessaire_rooms", JSON.stringify(updated));
    }
  }

  return { success: true };
}

/**
 * Submit and lock the final answer in the Change Phase.
 */
export async function submitFinalAnswer(
  roomCode: string,
  playerId: string,
  questionId: string,
  finalChoice: ChoiceLetter
): Promise<{
  success: boolean;
  finalLockedCount: number;
  totalPlayers: number;
  allFinalLocked: boolean;
  error?: string;
}> {
  const roomDetails = await getRoomDetails(roomCode);
  if (!roomDetails) return { success: false, finalLockedCount: 0, totalPlayers: 0, allFinalLocked: false, error: "Room not found" };

  const roomId = roomDetails.room.id;
  const totalPlayers = roomDetails.players.length;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from("answers")
          .update({
            final_answer: finalChoice,
            final_locked: true,
          })
          .eq("room_id", roomId)
          .eq("question_id", questionId)
          .eq("player_id", playerId);

        const { count } = await supabase
          .from("answers")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("question_id", questionId)
          .eq("final_locked", true);

        const finalLockedCount = count || 0;
        const allFinalLocked = finalLockedCount >= totalPlayers && totalPlayers > 0;

        return { success: true, finalLockedCount, totalPlayers, allFinalLocked };
      }
    } catch (err: any) {
      console.warn("Supabase submitFinalAnswer error, using local fallback:", err.message);
    }
  }

  // Local Storage Fallback
  const allAnswers = getLocalAnswers();
  const existing = allAnswers.find(
    (a) => a.roomId === roomId && a.questionId === questionId && a.playerId === playerId
  );
  if (existing) {
    existing.finalAnswer = finalChoice;
    existing.finalLocked = true;
    saveLocalAnswers(allAnswers);
  }

  const lockedAnswers = allAnswers.filter(
    (a) => a.roomId === roomId && a.questionId === questionId && a.finalLocked
  );
  const finalLockedCount = lockedAnswers.length;
  const allFinalLocked = finalLockedCount >= totalPlayers && totalPlayers > 0;

  return { success: true, finalLockedCount, totalPlayers, allFinalLocked };
}

/**
 * Host reveals the answer: transitions room to REVEAL and computes results.
 */
export async function revealAnswer(
  roomCode: string,
  questionId: string
): Promise<{ success: boolean; revealData?: RevealData; error?: string }> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return { success: false, error: "Room not found" };

  const { room, players } = roomDetails;
  const authoritativeMock = await getMockById(room.mockId);
  if (!authoritativeMock) return { success: false, error: "Mock not found" };

  const targetQuestion = authoritativeMock.questions.find((q) => q.id === questionId);
  if (!targetQuestion) return { success: false, error: "Question not found" };

  // Update room status to REVEAL
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("rooms").update({ status: "REVEAL" }).eq("id", room.id);
      }
    } catch (err) {
      console.warn("Supabase reveal update error:", err);
    }
  }

  // Local room status update
  if (typeof window !== "undefined") {
    const localRoomsRaw = localStorage.getItem("necessaire_rooms");
    if (localRoomsRaw) {
      const rooms = JSON.parse(localRoomsRaw);
      const updated = rooms.map((r: any) =>
        r.id === room.id ? { ...r, status: "REVEAL" } : r
      );
      localStorage.setItem("necessaire_rooms", JSON.stringify(updated));
    }
  }

  // Retrieve answers for this question
  let answersList: AnswerRecord[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("answers")
          .select("*")
          .eq("room_id", room.id)
          .eq("question_id", questionId);

        if (data) {
          answersList = data.map((d: any) => ({
            id: d.id,
            roomId: d.room_id,
            questionId: d.question_id,
            playerId: d.player_id,
            initialAnswer: d.initial_answer as ChoiceLetter,
            finalAnswer: d.final_answer as ChoiceLetter,
            locked: d.locked,
            finalLocked: d.final_locked,
            isReady: d.is_ready,
            createdAt: d.created_at,
          }));
        }
      }
    } catch (err) {
      console.warn("Supabase answers fetch error:", err);
    }
  }

  if (answersList.length === 0) {
    const localAnswers = getLocalAnswers();
    answersList = localAnswers.filter(
      (a) => a.roomId === room.id && a.questionId === questionId
    );
  }

  // Compute breakdown: initial -> final, isCorrect
  const results: PlayerRevealResult[] = players.map((p) => {
    const pAns = answersList.find((a) => a.playerId === p.id);
    const initialAnswer = pAns?.initialAnswer || null;
    const finalAnswer = pAns?.finalAnswer || initialAnswer || null;
    const isCorrect = finalAnswer === targetQuestion.correctAnswer;

    return {
      playerId: p.id,
      nickname: p.nickname,
      initialAnswer,
      finalAnswer,
      isCorrect,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;

  const revealData: RevealData = {
    questionId,
    correctAnswer: targetQuestion.correctAnswer,
    explanation: targetQuestion.explanation,
    correctCount,
    totalPlayers: players.length,
    results,
  };

  return { success: true, revealData };
}

/**
 * Host advances room to the Next Question or completes the mock test.
 */
export async function advanceToNextQuestion(
  roomCode: string
): Promise<{
  success: boolean;
  isFinished: boolean;
  nextQuestionNumber: number;
  error?: string;
}> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return { success: false, isFinished: false, nextQuestionNumber: 0, error: "Room not found" };

  const { room, mock } = roomDetails;
  const currentNum = room.currentQuestion || 1;
  const isReviewMode = Boolean(room.reviewQuestionIds && room.reviewQuestionIds.length > 0);
  const totalQuestions = isReviewMode
    ? room.reviewQuestionIds!.length
    : mock.questions.length;

  const isFinished = currentNum >= totalQuestions;
  const nextStatus: RoomStatus = isFinished ? "FINISHED" : "ANSWERING";
  const nextNum = isFinished ? currentNum : currentNum + 1;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from("rooms")
          .update({
            current_question: nextNum,
            status: nextStatus,
          })
          .eq("id", room.id);
      }
    } catch (err) {
      console.warn("Supabase advance error:", err);
    }
  }

  // Local update
  if (typeof window !== "undefined") {
    const localRoomsRaw = localStorage.getItem("necessaire_rooms");
    if (localRoomsRaw) {
      const rooms = JSON.parse(localRoomsRaw);
      const updated = rooms.map((r: any) =>
        r.id === room.id
          ? { ...r, currentQuestion: nextNum, status: nextStatus }
          : r
      );
      localStorage.setItem("necessaire_rooms", JSON.stringify(updated));
    }
  }

  return { success: true, isFinished, nextQuestionNumber: nextNum };
}

/**
 * Get current player's answer record for a specific question.
 */
export function getPlayerAnswerForQuestion(
  roomId: string,
  questionId: string,
  playerId: string
): AnswerRecord | null {
  const all = getLocalAnswers();
  return (
    all.find(
      (a) =>
        a.roomId === roomId &&
        a.questionId === questionId &&
        a.playerId === playerId
    ) || null
  );
}

/**
 * Retrieve locked Round 1 answers for all players for the specified question.
 */
export async function getRound1Answers(
  roomCode: string,
  questionId: string
): Promise<Round1AnswerItem[]> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return [];

  const { room, players } = roomDetails;
  let answersList: { playerId: string; initialAnswer: ChoiceLetter | null }[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("answers")
          .select("player_id, initial_answer")
          .eq("room_id", room.id)
          .eq("question_id", questionId)
          .eq("locked", true);

        if (data) {
          answersList = data.map((d: any) => ({
            playerId: d.player_id,
            initialAnswer: d.initial_answer as ChoiceLetter,
          }));
        }
      }
    } catch (err) {
      console.warn("Supabase getRound1Answers error:", err);
    }
  }

  if (answersList.length === 0) {
    const localAnswers = getLocalAnswers();
    answersList = localAnswers
      .filter((a) => a.roomId === room.id && a.questionId === questionId && a.locked)
      .map((a) => ({
        playerId: a.playerId,
        initialAnswer: a.initialAnswer,
      }));
  }

  return players.map((p) => {
    const ans = answersList.find((a) => a.playerId === p.id);
    return {
      playerId: p.id,
      nickname: p.nickname,
      initialAnswer: ans?.initialAnswer || null,
    };
  });
}

