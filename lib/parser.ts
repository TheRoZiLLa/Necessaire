import { ChoiceLetter, ParsedQuestionDraft } from "@/types";

/**
 * Validates a single question draft and returns an array of error messages.
 */
export function validateQuestionDraft(draft: {
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: ChoiceLetter | "" | string;
  explanation?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!draft.questionText || !draft.questionText.trim()) {
    errors.push("Missing question text");
  }

  if (!draft.choiceA || !draft.choiceA.trim()) {
    errors.push("Missing choice A");
  }

  if (!draft.choiceB || !draft.choiceB.trim()) {
    errors.push("Missing choice B");
  }

  if (!draft.choiceC || !draft.choiceC.trim()) {
    errors.push("Missing choice C");
  }

  if (!draft.choiceD || !draft.choiceD.trim()) {
    errors.push("Missing choice D");
  }

  const validAnswers = ["A", "B", "C", "D"];
  if (!draft.correctAnswer || !validAnswers.includes(draft.correctAnswer.toUpperCase())) {
    errors.push("Missing answer");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Parses raw AI-generated text into an array of structured, editable ParsedQuestionDraft items.
 */
export function parseQuestionsText(rawText: string): ParsedQuestionDraft[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const lines = rawText.split(/\r?\n/);
  const drafts: ParsedQuestionDraft[] = [];

  let currentDraft: Partial<ParsedQuestionDraft> | null = null;
  let activeField: "question" | "choiceA" | "choiceB" | "choiceC" | "choiceD" | "explanation" | null = null;

  const commitCurrentDraft = () => {
    if (!currentDraft) return;

    const qText = (currentDraft.questionText || "").trim();
    const cA = (currentDraft.choiceA || "").trim();
    const cB = (currentDraft.choiceB || "").trim();
    const cC = (currentDraft.choiceC || "").trim();
    const cD = (currentDraft.choiceD || "").trim();
    const ans = (currentDraft.correctAnswer || "") as ChoiceLetter | "";
    const exp = (currentDraft.explanation || "").trim();

    // Only commit if at least something was parsed (e.g. question text or choice)
    if (qText || cA || cB || cC || cD || ans) {
      const validation = validateQuestionDraft({
        questionText: qText,
        choiceA: cA,
        choiceB: cB,
        choiceC: cC,
        choiceD: cD,
        correctAnswer: ans,
        explanation: exp,
      });

      drafts.push({
        tempId: `draft-${Date.now()}-${drafts.length}-${Math.random().toString(36).substring(2, 7)}`,
        questionNumber: drafts.length + 1,
        questionText: qText,
        choiceA: cA,
        choiceB: cB,
        choiceC: cC,
        choiceD: cD,
        correctAnswer: ans,
        explanation: exp,
        validationErrors: validation.errors,
        isValid: validation.isValid,
      });
    }

    currentDraft = null;
    activeField = null;
  };

  // Regexes
  // Match question start: "1. What is..." or "1) What is..." or "Question 1: What is..."
  const questionStartRegex = /^\s*(?:Question\s+)?(\d+)[\.\:\)]\s*(.*)$/i;

  // Match choices: "A. Option" or "A) Option" or "(A) Option" or "a. Option"
  const choiceRegex = /^\s*[\(\[]?([A-Da-d])[\)\.\:]\s+(.*)$/;

  // Match answer: "Answer: A" or "**Answer:** A" or "Ans: A" or "Correct Answer: A"
  const answerRegex = /^\s*(?:\*\*)?(?:Answer|Ans|Correct\s*Answer)(?:\*\*)?\s*[:\-]?\s*[\(\[]?([A-Da-d])[\)\]\.]?(?:\s*(?:[\-\:]\s*)?(.*))?/i;

  // Match explanation: "Explanation: ..." or "**Explanation:** ..."
  const explanationRegex = /^\s*(?:\*\*)?(?:Explanation|Explain|Reason)(?:\*\*)?\s*[:\-]?\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line - if inside explanation, we might preserve a newline
      if (activeField === "explanation" && currentDraft && currentDraft.explanation) {
        currentDraft.explanation += "\n";
      }
      continue;
    }

    // 1. Check for Question start
    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      commitCurrentDraft();
      currentDraft = {
        questionText: qMatch[2] ? qMatch[2].trim() : "",
        choiceA: "",
        choiceB: "",
        choiceC: "",
        choiceD: "",
        correctAnswer: "",
        explanation: "",
      };
      activeField = "question";
      continue;
    }

    // If we haven't encountered a numbered question yet, ignore header chatter or start draft
    if (!currentDraft) {
      continue;
    }

    // 2. Check for Choice (A, B, C, D)
    const choiceMatch = line.match(choiceRegex);
    if (choiceMatch) {
      const letter = choiceMatch[1].toUpperCase() as ChoiceLetter;
      const text = choiceMatch[2] ? choiceMatch[2].trim() : "";

      switch (letter) {
        case "A":
          currentDraft.choiceA = text;
          activeField = "choiceA";
          break;
        case "B":
          currentDraft.choiceB = text;
          activeField = "choiceB";
          break;
        case "C":
          currentDraft.choiceC = text;
          activeField = "choiceC";
          break;
        case "D":
          currentDraft.choiceD = text;
          activeField = "choiceD";
          break;
      }
      continue;
    }

    // 3. Check for Answer line
    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      const answerLetter = ansMatch[1].toUpperCase() as ChoiceLetter;
      currentDraft.correctAnswer = answerLetter;
      activeField = null;

      // If explanation is on the same line (e.g. "Answer: A - This is why...")
      if (ansMatch[2] && ansMatch[2].trim()) {
        currentDraft.explanation = (currentDraft.explanation ? currentDraft.explanation + " " : "") + ansMatch[2].trim();
        activeField = "explanation";
      }
      continue;
    }

    // 4. Check for Explanation line
    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      currentDraft.explanation = expMatch[1] ? expMatch[1].trim() : "";
      activeField = "explanation";
      continue;
    }

    // 5. Continuation lines
    if (activeField === "question") {
      currentDraft.questionText = (currentDraft.questionText ? currentDraft.questionText + "\n" : "") + trimmed;
    } else if (activeField === "choiceA") {
      currentDraft.choiceA = (currentDraft.choiceA ? currentDraft.choiceA + " " : "") + trimmed;
    } else if (activeField === "choiceB") {
      currentDraft.choiceB = (currentDraft.choiceB ? currentDraft.choiceB + " " : "") + trimmed;
    } else if (activeField === "choiceC") {
      currentDraft.choiceC = (currentDraft.choiceC ? currentDraft.choiceC + " " : "") + trimmed;
    } else if (activeField === "choiceD") {
      currentDraft.choiceD = (currentDraft.choiceD ? currentDraft.choiceD + " " : "") + trimmed;
    } else if (activeField === "explanation") {
      currentDraft.explanation = (currentDraft.explanation ? currentDraft.explanation + "\n" : "") + trimmed;
    }
  }

  // Commit last draft
  commitCurrentDraft();

  return drafts;
}

/**
 * Standard AI Prompt Template for copying to clipboard
 */
export const AI_PROMPT_TEMPLATE = `Create a multiple-choice mock test using exactly this format:

1. [Question]
   A. [Choice]
   B. [Choice]
   C. [Choice]
   D. [Choice]
   Answer: [A/B/C/D]
   Explanation: [Short explanation]

Create [NUMBER] questions.
Do not add any text outside this format.`;
