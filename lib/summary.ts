import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import { getRoomDetails } from "./room";
import { getMockById } from "./storage";
import { NeedsReviewItem, RoomSummary, RoomStatus, AnswerRecord } from "@/types";

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
 * Calculate room completion summary:
 * - Individual player score: Correct vs Wrong
 * - Top 5 questions with the lowest accuracy in the room ("Needs Review")
 */
export async function calculateRoomSummary(
  roomCode: string,
  playerId: string
): Promise<RoomSummary | null> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return null;

  const { room, players } = roomDetails;
  // Get authoritative mock with true correct_answers
  const authoritativeMock = await getMockById(room.mockId);
  if (!authoritativeMock) return null;

  const totalQuestions = authoritativeMock.questions.length;
  const totalPlayers = players.length || 1;

  // Retrieve answers
  let answersList: AnswerRecord[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("answers")
          .select("*")
          .eq("room_id", room.id);

        if (data) {
          answersList = data.map((d: any) => ({
            id: d.id,
            roomId: d.room_id,
            questionId: d.question_id,
            playerId: d.player_id,
            initialAnswer: d.initial_answer,
            finalAnswer: d.final_answer,
            locked: d.locked,
            finalLocked: d.final_locked,
            isReady: d.is_ready,
            createdAt: d.created_at,
          }));
        }
      }
    } catch (err) {
      console.warn("Supabase answers fetch error in calculateRoomSummary:", err);
    }
  }

  if (answersList.length === 0) {
    const localAnswers = getLocalAnswers();
    answersList = localAnswers.filter((a) => a.roomId === room.id);
  }

  // 1. Calculate player score
  let playerCorrect = 0;
  for (const q of authoritativeMock.questions) {
    const pAns = answersList.find(
      (a) => a.questionId === q.id && a.playerId === playerId
    );
    const finalAnswer = pAns?.finalAnswer || pAns?.initialAnswer;
    if (finalAnswer === q.correctAnswer) {
      playerCorrect++;
    }
  }
  const playerWrong = Math.max(0, totalQuestions - playerCorrect);

  // 2. Calculate Needs Review (Questions missed by players in the room)
  const questionAccuracyList: NeedsReviewItem[] = [];

  for (const q of authoritativeMock.questions) {
    let qCorrectCount = 0;
    for (const p of players) {
      const pAns = answersList.find(
        (a) => a.questionId === q.id && a.playerId === p.id
      );
      const finalAnswer = pAns?.finalAnswer || pAns?.initialAnswer;
      if (finalAnswer === q.correctAnswer) {
        qCorrectCount++;
      }
    }

    // Only include if at least one player got it wrong
    if (qCorrectCount < totalPlayers) {
      questionAccuracyList.push({
        questionId: q.id,
        originalQuestionNumber: q.questionNumber,
        questionText: q.questionText,
        correctCount: qCorrectCount,
        totalPlayers,
      });
    }
  }

  // Sort: lowest correctCount first, then original question number
  questionAccuracyList.sort((a, b) => {
    if (a.correctCount !== b.correctCount) {
      return a.correctCount - b.correctCount;
    }
    return a.originalQuestionNumber - b.originalQuestionNumber;
  });

  // Maximum 5 questions
  const needsReviewQuestions = questionAccuracyList.slice(0, 5);

  return {
    totalQuestions,
    playerScore: {
      correct: playerCorrect,
      wrong: playerWrong,
      total: totalQuestions,
    },
    needsReviewQuestions,
  };
}

/**
 * Host launches Review Mode for the selected question IDs.
 */
export async function startReviewMode(
  roomCode: string,
  questionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const roomDetails = await getRoomDetails(normalizedCode);
  if (!roomDetails) return { success: false, error: "Room not found" };

  const roomId = roomDetails.room.id;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Reset answers for these review questions so they can be re-answered
        await supabase
          .from("answers")
          .delete()
          .eq("room_id", roomId)
          .in("question_id", questionIds);

        // Update room with review_question_ids, current_question = 1, status = ANSWERING
        await supabase
          .from("rooms")
          .update({
            review_question_ids: questionIds,
            current_question: 1,
            status: "ANSWERING" as RoomStatus,
          })
          .eq("id", roomId);
      }
    } catch (err: any) {
      console.warn("Supabase startReviewMode error, using local fallback:", err.message);
    }
  }

  // Local Storage fallback
  const allAnswers = getLocalAnswers();
  const filteredAnswers = allAnswers.filter(
    (a) => !(a.roomId === roomId && questionIds.includes(a.questionId))
  );
  saveLocalAnswers(filteredAnswers);

  if (typeof window !== "undefined") {
    const localRoomsRaw = localStorage.getItem("necessaire_rooms");
    if (localRoomsRaw) {
      const rooms = JSON.parse(localRoomsRaw);
      const updated = rooms.map((r: any) =>
        r.id === roomId
          ? {
              ...r,
              reviewQuestionIds: questionIds,
              currentQuestion: 1,
              status: "ANSWERING",
            }
          : r
      );
      localStorage.setItem("necessaire_rooms", JSON.stringify(updated));
    }
  }

  return { success: true };
}

/**
 * Host exits Review Mode and returns to Summary screen.
 */
export async function exitReviewMode(
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
        await supabase
          .from("rooms")
          .update({
            review_question_ids: [],
            status: "FINISHED" as RoomStatus,
          })
          .eq("id", roomId);
      }
    } catch (err) {
      console.warn("Supabase exitReviewMode error:", err);
    }
  }

  // Local Storage fallback
  if (typeof window !== "undefined") {
    const localRoomsRaw = localStorage.getItem("necessaire_rooms");
    if (localRoomsRaw) {
      const rooms = JSON.parse(localRoomsRaw);
      const updated = rooms.map((r: any) =>
        r.id === roomId
          ? {
              ...r,
              reviewQuestionIds: [],
              status: "FINISHED",
            }
          : r
      );
      localStorage.setItem("necessaire_rooms", JSON.stringify(updated));
    }
  }

  return { success: true };
}
