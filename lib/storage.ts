import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import { Mock, Question, MockWithQuestions, ParsedQuestionDraft } from "@/types";

const LOCAL_STORAGE_MOCKS_KEY = "necessaire_mocks";
const LOCAL_STORAGE_QUESTIONS_KEY = "necessaire_questions";

// LocalStorage helpers
function getLocalMocks(): Mock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MOCKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMocks(mocks: Mock[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_MOCKS_KEY, JSON.stringify(mocks));
  } catch (err) {
    console.error("Failed to save mocks to localStorage", err);
  }
}

function getLocalQuestions(): Question[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalQuestions(questions: Question[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_QUESTIONS_KEY, JSON.stringify(questions));
  } catch (err) {
    console.error("Failed to save questions to localStorage", err);
  }
}

/**
 * Saves a new Mock and its Questions to Supabase (or localStorage fallback).
 */
export async function saveMockWithQuestions(
  mockData: { title: string; subject?: string },
  questions: ParsedQuestionDraft[]
): Promise<{ success: boolean; mockId?: string; error?: string }> {
  const mockId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "mock-" + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const mockRecord: Mock = {
    id: mockId,
    title: mockData.title.trim(),
    subject: mockData.subject?.trim() || undefined,
    createdAt: now,
  };

  const questionRecords: Question[] = questions.map((q, index) => ({
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `q-${index + 1}-` + Math.random().toString(36).substring(2, 9),
    mockId,
    questionNumber: index + 1,
    questionText: q.questionText.trim(),
    choiceA: q.choiceA.trim(),
    choiceB: q.choiceB.trim(),
    choiceC: q.choiceC.trim(),
    choiceD: q.choiceD.trim(),
    correctAnswer: (q.correctAnswer as "A" | "B" | "C" | "D") || "A",
    explanation: q.explanation.trim() || undefined,
    createdAt: now,
  }));

  // If Supabase is configured, save there
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client unavailable");

      // 1. Insert mock
      const { error: mockError } = await supabase.from("mocks").insert({
        id: mockId,
        title: mockRecord.title,
        subject: mockRecord.subject,
        created_at: mockRecord.createdAt,
      });

      if (mockError) {
        console.error("Supabase mock insert error:", mockError);
        throw new Error(mockError.message);
      }

      // 2. Insert questions
      const dbQuestions = questionRecords.map((q) => ({
        id: q.id,
        mock_id: q.mockId,
        question_number: q.questionNumber,
        question_text: q.questionText,
        choice_a: q.choiceA,
        choice_b: q.choiceB,
        choice_c: q.choiceC,
        choice_d: q.choiceD,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        created_at: q.createdAt,
      }));

      const { error: questionsError } = await supabase.from("questions").insert(dbQuestions);

      if (questionsError) {
        console.error("Supabase questions insert error:", questionsError);
        throw new Error(questionsError.message);
      }

      // Also mirror to localStorage for instantaneous offline read/cache
      const currentMocks = getLocalMocks();
      saveLocalMocks([mockRecord, ...currentMocks]);
      const currentQuestions = getLocalQuestions();
      saveLocalQuestions([...currentQuestions, ...questionRecords]);

      return { success: true, mockId };
    } catch (err: any) {
      console.error("Supabase save failed:", err.message);
      return {
        success: false,
        error: `Supabase database error: ${err.message}. Please ensure you ran supabase/schema.sql in your Supabase SQL Editor.`,
      };
    }
  }

  // Fallback to localStorage
  try {
    const currentMocks = getLocalMocks();
    saveLocalMocks([mockRecord, ...currentMocks]);

    const currentQuestions = getLocalQuestions();
    saveLocalQuestions([...currentQuestions, ...questionRecords]);

    return { success: true, mockId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save mock test" };
  }
}

/**
 * Retrieves a Mock by its ID along with its questions.
 */
export async function getMockById(id: string): Promise<MockWithQuestions | null> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: mockData, error: mockError } = await supabase
          .from("mocks")
          .select("*")
          .eq("id", id)
          .single();

        if (!mockError && mockData) {
          const { data: questionsData } = await supabase
            .from("questions")
            .select("*")
            .eq("mock_id", id)
            .order("question_number", { ascending: true });

          const questions: Question[] = (questionsData || []).map((q) => ({
            id: q.id,
            mockId: q.mock_id,
            questionNumber: q.question_number,
            questionText: q.question_text,
            choiceA: q.choice_a,
            choiceB: q.choice_b,
            choiceC: q.choice_c,
            choiceD: q.choice_d,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            createdAt: q.created_at,
          }));

          return {
            id: mockData.id,
            title: mockData.title,
            subject: mockData.subject,
            createdAt: mockData.created_at,
            questions,
          };
        }
      }
    } catch (err) {
      console.warn("Error reading from Supabase, attempting local fallback", err);
    }
  }

  // Fallback to LocalStorage
  const mocks = getLocalMocks();
  const mock = mocks.find((m) => m.id === id);
  if (!mock) return null;

  const allQuestions = getLocalQuestions();
  const questions = allQuestions
    .filter((q) => q.mockId === id)
    .sort((a, b) => a.questionNumber - b.questionNumber);

  return {
    ...mock,
    questions,
  };
}
