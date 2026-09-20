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

// Future placeholder types for Room & Participant
export interface RoomInfo {
  code: string;
  title: string;
  subject?: string;
  hostNickname: string;
  createdAt: string;
}

export interface ParticipantInfo {
  id: string;
  roomCode: string;
  nickname: string;
  joinedAt: string;
}
