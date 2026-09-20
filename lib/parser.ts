import { ChoiceLetter, ParsedQuestionDraft } from "@/types";

export const THAI_CHOICE_MAP: Record<ChoiceLetter, string> = {
  A: "ก",
  B: "ข",
  C: "ค",
  D: "ง",
};

/**
 * Normalizes an answer or choice letter from English (A-D) or Thai (ก-ง) into canonical A, B, C, D.
 */
export function normalizeChoiceLetter(raw: string): ChoiceLetter | "" {
  const upper = raw.trim().toUpperCase();
  if (upper === "A" || upper === "ก" || upper === "1" || upper === "๑") return "A";
  if (upper === "B" || upper === "ข" || upper === "2" || upper === "๒") return "B";
  if (upper === "C" || upper === "ค" || upper === "3" || upper === "๓") return "C";
  if (upper === "D" || upper === "ง" || upper === "4" || upper === "๔") return "D";
  return "";
}

/**
 * Formats a ChoiceLetter to Thai (ก, ข, ค, ง) if requested, or English (A, B, C, D).
 */
export function formatChoiceLetter(letter: ChoiceLetter | string, isThaiMode: boolean): string {
  if (!isThaiMode) return letter;
  return THAI_CHOICE_MAP[letter as ChoiceLetter] || letter;
}

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
    errors.push("Missing choice A / ก");
  }

  if (!draft.choiceB || !draft.choiceB.trim()) {
    errors.push("Missing choice B / ข");
  }

  if (!draft.choiceC || !draft.choiceC.trim()) {
    errors.push("Missing choice C / ค");
  }

  if (!draft.choiceD || !draft.choiceD.trim()) {
    errors.push("Missing choice D / ง");
  }

  const normalizedAns = normalizeChoiceLetter(draft.correctAnswer);
  if (!normalizedAns) {
    errors.push("Missing answer (A-D or ก-ง)");
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
  // Match question start: "1. What is..." or "ข้อ 1. ใครคือ..." or "ข้อที่ 1) ..." or "๑. ..."
  const questionStartRegex = /^\s*(?:Question\s+|ข้อที่\s+|ข้อ\s+)?([0-9๑-๙]+)[\.\:\)]\s*(.*)$/i;

  // Match choices: "A. Option", "A) Option", "(A) Option", "ก. ช้อยส์", "ก) ช้อยส์", "(ก) ช้อยส์", "1) Option"
  const choiceRegex = /^\s*[\(\[]?([A-Da-dก-งกขคง])[\)\.\:\-\]]\s+(.*)$/;

  // Match answer: "Answer: A", "Ans: A", "เฉลย: ก", "คำตอบ: ข", "ตอบ: ค"
  const answerRegex = /^\s*(?:\*\*)?(?:Answer|Ans|Correct\s*Answer|เฉลย|คำตอบ|ข้อที่ถูก|ตอบ)(?:\*\*)?\s*[:\-]?\s*[\(\[]?([A-Da-dก-งกขคง1-4๑-๔])[\)\]\.]?(?:\s*(?:[\-\:]\s*)?(.*))?/i;

  // Match explanation: "Explanation: ...", "คำอธิบาย: ...", "เหตุผล: ..."
  const explanationRegex = /^\s*(?:\*\*)?(?:Explanation|Explain|Reason|คำอธิบาย|เหตุผล|อธิบาย)(?:\*\*)?\s*[:\-]?\s*(.*)$/i;

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

    // 2. Check for Choice (A, B, C, D or ก, ข, ค, ง)
    const choiceMatch = line.match(choiceRegex);
    if (choiceMatch) {
      const normalizedLetter = normalizeChoiceLetter(choiceMatch[1]);
      const text = choiceMatch[2] ? choiceMatch[2].trim() : "";

      switch (normalizedLetter) {
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
      const normAns = normalizeChoiceLetter(ansMatch[1]);
      if (normAns) {
        currentDraft.correctAnswer = normAns;
      }
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
 * Standard AI Prompt Template for copying to clipboard (English)
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

/**
 * Standard AI Prompt Template for copying to clipboard (Thai - ก ข ค ง)
 */
export const AI_PROMPT_TEMPLATE_TH = `ช่วยสร้างข้อสอบปรนัย 4 ตัวเลือกโดยใช้รูปแบบนี้เท่านั้น:

1. [โจทย์คำถาม]
   ก. [ตัวเลือก ก]
   ข. [ตัวเลือก ข]
   ค. [ตัวเลือก ค]
   ง. [ตัวเลือก ง]
   เฉลย: [ก/ข/ค/ง]
   คำอธิบาย: [คำอธิบายสั้นๆ ว่าทำไมข้อนี้ถึงถูก]

2. [โจทย์คำถามข้อถัดไป]
...

สร้างทั้งหมด [จำนวนข้อ] ข้อ
ห้ามใส่ข้อความเกริ่นนำหรือข้อความอื่นนอกเหนือจากรูปแบบนี้`;

/**
 * Sample questions in Thai
 */
export const SAMPLE_QUESTIONS_TH = `1. ใครเป็นนายกรัฐมนตรีคนแรกของประเทศไทย?
   ก. พระยามโนปกรณ์นิติธาดา
   ข. พันเอก พระยาพหลพลพยุหเสนา
   ค. จอมพล ป. พิบูลสงคราม
   ง. นายปรีดี พนมยงค์
   เฉลย: ก
   คำอธิบาย: พระยามโนปกรณ์นิติธาดา ดำรงตำแหน่งนายกรัฐมนตรีคนแรกของสยามหลังการเปลี่ยนแปลงการปกครอง พ.ศ. 2475

2. คำราชาศัพท์สำหรับคำว่า "กิน" ที่ใช้สำหรับพระมหากษัตริย์คือข้อใด?
   ก. เสวย
   ข. พระกระยาหาร
   ค. ทรงพระเจริญ
   ง. บังคมทูล
   เฉลย: ก
   คำอธิบาย: "เสวย" เป็นคำกริยาราชาศัพท์หมายถึง รับประทาน หรือ กิน

3. ข้อใดคือแม่น้ำที่ยาวที่สุดในโลก?
   ก. แม่น้ำไนล์
   ข. แม่น้ำแอมะซอน
   ค. แม่น้ำแยงซี
   ง. แม่น้ำมิสซิสซิปปี
   เฉลย: ก
   คำอธิบาย: แม่น้ำไนล์ในทวีปแอฟริกาเป็นแม่น้ำที่ยาวที่สุดในโลก โดยมีความยาวประมาณ 6,650 กิโลเมตร`;

