"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  BookOpen,
  Copy,
  Check,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  parseQuestionsText,
  validateQuestionDraft,
  AI_PROMPT_TEMPLATE,
  AI_PROMPT_TEMPLATE_TH,
  SAMPLE_QUESTIONS_TH,
  THAI_CHOICE_MAP,
} from "@/lib/parser";
import { saveMockWithQuestions } from "@/lib/storage";
import { ChoiceLetter, ParsedQuestionDraft } from "@/types";

export default function CreateMockPage() {
  const router = useRouter();
  const { success, error, info } = useToast();

  // Form states
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionDraft[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Incomplete questions warning modal
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const [incompleteCount, setIncompleteCount] = useState(0);

  // Copy states
  const [copiedLang, setCopiedLang] = useState<"th" | "en" | null>(null);

  // Copy AI Prompt
  const handleCopyPrompt = async (lang: "th" | "en" = "th") => {
    try {
      const template = lang === "th" ? AI_PROMPT_TEMPLATE_TH : AI_PROMPT_TEMPLATE;
      await navigator.clipboard.writeText(template);
      setCopiedLang(lang);
      success(
        lang === "th"
          ? "คัดลอก AI Prompt (ภาษาไทย: ก ข ค ง) แล้ว! นำไปวางใน ChatGPT หรือ Claude ได้เลย"
          : "English AI Prompt copied to clipboard!",
        "Copied"
      );
      setTimeout(() => setCopiedLang(null), 2500);
    } catch {
      error("Failed to copy to clipboard", "Error");
    }
  };

  // Sample data insertion
  const handleInsertSample = (lang: "th" | "en" = "th") => {
    if (lang === "th") {
      setRawText(SAMPLE_QUESTIONS_TH);
      if (!title) setTitle("ข้อสอบจำลองความรู้ทั่วไป (ชุดที่ 1)");
      if (!subject) setSubject("ความรู้ทั่วไป / สังคมศึกษา");
      info("โหลดตัวอย่างข้อสอบภาษาไทยแล้ว กด 'Parse Questions' เพื่อดูตัวอย่าง", "Sample Loaded");
    } else {
      const sample = `1. ______ is your best friend?
   A. Who
   B. Whom
   C. Whose
   D. Which
   Answer: A
   Explanation: Who ใช้ถามถึงคนที่เป็นประธาน

2. This is the boy _____ bag was stolen.
   A. who
   B. whom
   C. whose
   D. which
   Answer: C
   Explanation: Whose ใช้แสดงความเป็นเจ้าของ`;

      setRawText(sample);
      if (!title) setTitle("English Grammar Diagnostic");
      if (!subject) setSubject("English 101");
      info("Sample questions loaded. Click 'Parse Questions' to preview.", "Sample Loaded");
    }
  };

  // Parse questions from raw textarea
  const handleParse = () => {
    if (!rawText.trim()) {
      error("Please paste your AI-generated questions into the box first.", "Empty Input");
      return;
    }

    const parsed = parseQuestionsText(rawText);
    if (parsed.length === 0) {
      error(
        "Could not detect questions in this text. Make sure questions start with numbers (e.g. 1.) and choices with A., B., C., D.",
        "Parsing Error"
      );
      return;
    }

    setParsedQuestions(parsed);
    setHasParsed(true);
    const validCount = parsed.filter((q) => q.isValid).length;
    const invalidCount = parsed.length - validCount;

    if (invalidCount > 0) {
      info(`Parsed ${parsed.length} questions (${validCount} valid, ${invalidCount} need attention).`, "Parsed");
    } else {
      success(`Successfully parsed all ${parsed.length} questions!`, "Parse Successful");
    }
  };

  // Update a specific question field and re-validate
  const handleUpdateDraft = (
    tempId: string,
    updates: Partial<ParsedQuestionDraft>
  ) => {
    setParsedQuestions((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;

        const updated = { ...item, ...updates };
        const validation = validateQuestionDraft({
          questionText: updated.questionText,
          choiceA: updated.choiceA,
          choiceB: updated.choiceB,
          choiceC: updated.choiceC,
          choiceD: updated.choiceD,
          correctAnswer: updated.correctAnswer,
          explanation: updated.explanation,
        });

        return {
          ...updated,
          validationErrors: validation.errors,
          isValid: validation.isValid,
        };
      })
    );
  };

  // Delete question
  const handleDeleteDraft = (tempId: string) => {
    setParsedQuestions((prev) => {
      const filtered = prev.filter((item) => item.tempId !== tempId);
      // Re-number
      return filtered.map((item, idx) => ({ ...item, questionNumber: idx + 1 }));
    });
  };

  // Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setParsedQuestions((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, questionNumber: idx + 1 }));
    });
  };

  // Move Down
  const handleMoveDown = (index: number) => {
    setParsedQuestions((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, questionNumber: idx + 1 }));
    });
  };

  // Add a blank question manually
  const handleAddQuestion = () => {
    const newDraft: ParsedQuestionDraft = {
      tempId: `draft-manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      questionNumber: parsedQuestions.length + 1,
      questionText: "",
      choiceA: "",
      choiceB: "",
      choiceC: "",
      choiceD: "",
      correctAnswer: "",
      explanation: "",
      validationErrors: [
        "Missing question text",
        "Missing choice A",
        "Missing choice B",
        "Missing choice C",
        "Missing choice D",
        "Missing answer",
      ],
      isValid: false,
    };
    setParsedQuestions((prev) => [...prev, newDraft]);
    setHasParsed(true);
  };

  // Import Handler
  const handleImport = async () => {
    if (!title.trim()) {
      error("Please give your mock test a title before importing.", "Missing Title");
      return;
    }

    if (parsedQuestions.length === 0) {
      error("No questions to import. Please parse questions first.", "No Questions");
      return;
    }

    // Check for incomplete questions
    const invalidItems = parsedQuestions.filter((q) => !q.isValid);
    if (invalidItems.length > 0) {
      setIncompleteCount(invalidItems.length);
      setIsIncompleteModalOpen(true);
      return;
    }

    setIsImporting(true);
    try {
      const result = await saveMockWithQuestions({ title, subject }, parsedQuestions);

      if (result.success && result.mockId) {
        success("Mock test created and saved successfully!", "Success");
        router.push(`/mock/${result.mockId}`);
      } else {
        error(result.error || "Failed to save mock test. Please try again.", "Save Error");
      }
    } catch (err: any) {
      error(err.message || "An unexpected error occurred", "Error");
    } finally {
      setIsImporting(false);
    }
  };

  const validQuestionsCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidQuestionsCount = parsedQuestions.length - validQuestionsCount;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
      {/* Top back link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary-accent mb-1 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Create & Import</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create Mock Test
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Paste your AI-generated multiple-choice questions, verify, and import.
          </p>
        </div>

        {/* Copy AI Prompt Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleCopyPrompt("th")}
            className="shrink-0 text-xs"
            leftIcon={
              copiedLang === "th" ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-primary-accent" />
              )
            }
          >
            {copiedLang === "th" ? "คัดลอกแล้ว!" : "Copy Prompt (ภาษาไทย: ก ข ค ง)"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCopyPrompt("en")}
            className="shrink-0 text-xs text-gray-400 hover:text-white"
            leftIcon={
              copiedLang === "en" ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-400" />
              )
            }
          >
            {copiedLang === "en" ? "Copied EN!" : "Prompt (EN)"}
          </Button>
        </div>
      </div>

      {/* Section 1: Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">1. Mock Information</CardTitle>
          <CardDescription>
            Specify the title and subject of this test.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Mock Title *"
            placeholder="e.g. ตะลุยโจทย์สังคมศึกษา ม.ปลาย"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            leftIcon={<FileText className="w-4 h-4" />}
            maxLength={80}
            required
          />
          <Input
            label="Subject (Optional)"
            placeholder="e.g. วิชาสามัญ สังคม"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            leftIcon={<BookOpen className="w-4 h-4" />}
            maxLength={40}
          />
        </CardContent>
      </Card>

      {/* Section 2: Paste Raw Questions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">2. Paste AI Questions</CardTitle>
              <CardDescription>
                รองรับทั้งตัวเลือกภาษาไทย (ก, ข, ค, ง) และภาษาอังกฤษ (A, B, C, D)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Insert Sample:</span>
              <button
                type="button"
                onClick={() => handleInsertSample("th")}
                className="text-xs text-primary-accent hover:underline focus:outline-none font-medium"
              >
                ภาษาไทย (ก-ง)
              </button>
              <span className="text-gray-600 text-xs">•</span>
              <button
                type="button"
                onClick={() => handleInsertSample("en")}
                className="text-xs text-gray-400 hover:text-white hover:underline focus:outline-none"
              >
                English (A-D)
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            rows={8}
            className="w-full bg-[#0F1117] text-gray-100 placeholder-gray-500 rounded-lg border border-card-border p-3.5 text-xs sm:text-sm font-mono leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            placeholder={`1. ใครเป็นนายกรัฐมนตรีคนแรกของประเทศไทย?
   ก. พระยามโนปกรณ์นิติธาดา
   ข. พันเอก พระยาพหลพลพยุหเสนา
   ค. จอมพล ป. พิบูลสงคราม
   ง. นายปรีดี พนมยงค์
   เฉลย: ก
   คำอธิบาย: พระยามโนปกรณ์นิติธาดา ดำรงตำแหน่งนายกรัฐมนตรีคนแรก พ.ศ. 2475

หรือภาษาอังกฤษ:
1. ______ is your best friend?
   A. Who
   B. Whom
   C. Whose
   D. Which
   Answer: A
   Explanation: Who ใช้ถามถึงคนที่เป็นประธาน`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <span className="text-xs text-gray-500">
              Need questions? Click <strong>&quot;Copy AI Prompt&quot;</strong> above and ask ChatGPT or Claude.
            </span>
            <Button
              type="button"
              variant="primary"
              onClick={handleParse}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Parse Questions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Questions Preview & Editor */}
      {hasParsed && (
        <div className="space-y-6">
          {/* Status & Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-card-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">
                Questions ({parsedQuestions.length})
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validQuestionsCount} Valid
              </span>
              {invalidQuestionsCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-error/15 text-error border border-error/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {invalidQuestionsCount} Needs Fix
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Question
              </Button>
            </div>
          </div>

          {/* List of Question Cards */}
          <div className="space-y-4">
            {parsedQuestions.map((q, index) => {
              const choices: ChoiceLetter[] = ["A", "B", "C", "D"];

              return (
                <Card
                  key={q.tempId}
                  className={q.isValid ? "border-card-border" : "border-error/50 bg-error/[0.02]"}
                >
                  <CardHeader className="py-3 px-4 sm:px-6 bg-card-border/10 flex flex-row items-center justify-between border-b border-card-border/60">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-md bg-card-border/60 font-mono text-xs font-bold flex items-center justify-center text-gray-200">
                        #{q.questionNumber}
                      </span>
                      {q.isValid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valid question
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {q.validationErrors.map((err) => (
                            <span
                              key={err}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-error/20 text-error border border-error/40"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {err}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions: Move Up, Move Down, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Move question up"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-card-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move question down"
                        disabled={index === parsedQuestions.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-card-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete question"
                        onClick={() => handleDeleteDraft(q.tempId)}
                        className="p-1.5 rounded text-gray-400 hover:text-error hover:bg-error/10 transition-colors ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 space-y-4">
                    {/* Question Text */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400">Question Text</label>
                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => handleUpdateDraft(q.tempId, { questionText: e.target.value })}
                        className="w-full bg-[#0F1117] text-gray-100 placeholder-gray-600 rounded-lg border border-card-border p-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder="Type question text..."
                      />
                    </div>

                    {/* Choices A - D */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 flex items-center justify-between">
                        <span>Choices (Click letter button to select correct answer)</span>
                        <span className="text-[11px] text-gray-500">
                          Current Correct Answer:{" "}
                          <strong className="text-primary-accent font-bold">
                            {q.correctAnswer
                              ? `${q.correctAnswer} (${THAI_CHOICE_MAP[q.correctAnswer as ChoiceLetter] || ""})`
                              : "None"}
                          </strong>
                        </span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {choices.map((letter) => {
                          const isCorrect = q.correctAnswer === letter;
                          const fieldName = `choice${letter}` as
                            | "choiceA"
                            | "choiceB"
                            | "choiceC"
                            | "choiceD";
                          const val = q[fieldName];
                          const thaiLetter = THAI_CHOICE_MAP[letter];

                          return (
                            <div
                              key={letter}
                              className={`flex items-center rounded-lg border transition-all ${
                                isCorrect
                                  ? "border-success/60 bg-success/[0.04]"
                                  : "border-card-border bg-[#0F1117]"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraft(q.tempId, { correctAnswer: letter })
                                }
                                title={`Set ${letter} (${thaiLetter}) as correct answer`}
                                className={`px-2.5 py-2 text-xs font-bold rounded-l-lg border-r transition-colors flex items-center gap-1 ${
                                  isCorrect
                                    ? "bg-success text-black border-success"
                                    : "bg-card-border/40 text-gray-400 hover:text-white hover:bg-card-border/70 border-card-border"
                                }`}
                              >
                                <span>{letter}</span>
                                <span className="text-[10px] opacity-75">({thaiLetter})</span>
                                {isCorrect && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                              <input
                                type="text"
                                value={val}
                                onChange={(e) =>
                                  handleUpdateDraft(q.tempId, { [fieldName]: e.target.value })
                                }
                                placeholder={`Choice ${letter} / ตัวเลือก ${thaiLetter}...`}
                                className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-600 outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-medium text-gray-400">Explanation</label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => handleUpdateDraft(q.tempId, { explanation: e.target.value })}
                        className="w-full bg-[#0F1117] text-gray-300 placeholder-gray-600 rounded-lg border border-card-border px-3 py-2 text-xs sm:text-sm outline-none focus:border-primary transition-colors"
                        placeholder="Add explanation for why the answer is correct..."
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bottom Import Actions */}
          <div className="sticky bottom-6 z-30 p-4 rounded-xl bg-card/95 border border-primary/40 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-semibold text-white">
                Ready to Import {parsedQuestions.length} Questions?
              </h4>
              <p className="text-xs text-gray-400">
                {invalidQuestionsCount === 0
                  ? "All questions are valid and ready to be saved."
                  : `${invalidQuestionsCount} questions need to be completed before importing.`}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleImport}
                isLoading={isImporting}
                className="w-full sm:w-auto"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Import Mock Test
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal when trying to import with incomplete questions */}
      <Modal
        isOpen={isIncompleteModalOpen}
        onClose={() => setIsIncompleteModalOpen(false)}
        title="Cannot Import Incomplete Questions"
        description="All questions must have valid text, choices A-D, and a chosen answer."
      >
        <div className="space-y-3 text-xs sm:text-sm text-gray-300">
          <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              There are currently <strong>{incompleteCount}</strong> question(s) with missing
              information.
            </span>
          </div>
          <p>
            Please review the highlighted items marked with <span className="text-error font-medium">⚠</span>. You must either fill in the missing fields (such as choice C or answer) or delete incomplete questions before importing.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsIncompleteModalOpen(false)}
          >
            Review & Fix
          </Button>
        </div>
      </Modal>
    </div>
  );
}
