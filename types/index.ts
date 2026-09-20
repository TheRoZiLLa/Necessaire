/**
 * Nécessaire - Core Type Definitions
 */

export type ChoiceLetter = "A" | "B" | "C" | "D";

export interface Mock {
  id: string;
  title: string;
  subject?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  mockId: string;
  questionNumber: number;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: ChoiceLetter;
  explanation?: string;
  createdAt?: string;
}

export interface MockWithQuestions extends Mock {
  questions: Question[];
}

export interface ParsedQuestionDraft {
  tempId: string;
  questionNumber: number;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: ChoiceLetter | "";
  explanation: string;
  validationErrors: string[];
  isValid: boolean;
}

/**
 * Room and Multiplayer Types
 */
export type RoomStatus =
  | "LOBBY"
  | "ANSWERING"
  | "DISCUSSION"
  | "CHANGING"
  | "REVEAL"
  | "FINISHED";

export interface Room {
  id: string;
  roomCode: string;
  mockId: string;
  hostId: string;
  currentQuestion: number;
  status: RoomStatus;
  createdAt: string;
}

export interface Player {
  id: string;
  roomId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: string;
  lastSeen: string;
}

export interface RoomDetails {
  room: Room;
  mock: MockWithQuestions;
  players: Player[];
}

/**
 * Answer & Reveal Types
 */
export interface AnswerRecord {
  id: string;
  roomId: string;
  questionId: string;
  playerId: string;
  initialAnswer: ChoiceLetter | null;
  finalAnswer: ChoiceLetter | null;
  locked: boolean;
  finalLocked: boolean;
  isReady: boolean;
  createdAt: string;
}

export interface PlayerRevealResult {
  playerId: string;
  nickname: string;
  initialAnswer: ChoiceLetter | null;
  finalAnswer: ChoiceLetter | null;
  isCorrect: boolean;
}

export interface RevealData {
  questionId: string;
  correctAnswer: ChoiceLetter;
  explanation?: string;
  correctCount: number;
  totalPlayers: number;
  results: PlayerRevealResult[];
}
