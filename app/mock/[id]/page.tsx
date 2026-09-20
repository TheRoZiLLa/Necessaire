"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Calendar,
  Layers,
  Eye,
  EyeOff,
  PlusCircle,
  HelpCircle,
  Users,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { getMockById } from "@/lib/storage";
import { createRoom } from "@/lib/room";
import { formatChoiceLetter } from "@/lib/parser";
import { useLanguage } from "@/context/LanguageContext";
import { MockWithQuestions, ChoiceLetter } from "@/types";

export default function MockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const mockId = resolvedParams.id;
  const router = useRouter();
  const { success, error } = useToast();
  const { t } = useLanguage();

  const [mock, setMock] = useState<MockWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [useThaiChoices, setUseThaiChoices] = useState(false);

  // Create Room Modal states
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [hostNickname, setHostNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | undefined>();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    async function loadMock() {
      setLoading(true);
      try {
        const data = await getMockById(mockId);
        setMock(data);
        if (data?.questions) {
          const hasThai = data.questions.some(
            (q) => /[\u0E00-\u0E7F]/.test(q.questionText) || /[\u0E00-\u0E7F]/.test(q.choiceA)
          );
          if (hasThai) {
            setUseThaiChoices(true);
          }
        }
      } catch (err) {
        console.error("Failed to load mock", err);
      } finally {
        setLoading(false);
      }
    }
    loadMock();
  }, [mockId]);

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostNickname.trim()) {
      setNicknameError("Please enter your nickname.");
      return;
    }

    setIsCreatingRoom(true);
    try {
      const res = await createRoom(mockId, hostNickname.trim());
      if (res.success && res.roomCode && res.hostPlayerId) {
        // Store player ID in sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`necessaire_player_${res.roomCode}`, res.hostPlayerId);
          sessionStorage.setItem(`necessaire_nickname_${res.roomCode}`, hostNickname.trim());
        }
        success(`Room ${res.roomCode} created! Joining lobby as Host...`, "Room Created");
        router.push(`/room/${res.roomCode}`);
      } else {
        error(res.error || "Failed to create room.", "Error");
      }
    } catch (err: any) {
      error(err.message || "An unexpected error occurred.", "Error");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-pencil border-t-transparent animate-spin" />
        <p className="text-sm font-body text-pencil/60">{t.mock.loading}</p>
      </div>
    );
  }

  if (!mock) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20">
        <Card className="max-w-md w-full text-center p-8 space-y-4 shadow-hard-lg">
          <HelpCircle className="w-10 h-10 text-pencil/50 mx-auto" />
          <h2 className="text-2xl font-heading font-bold text-pencil">{t.mock.notFoundTitle}</h2>
          <p className="text-sm font-body text-pencil/70">
            {t.mock.notFoundDesc}
          </p>
          <div className="pt-2">
            <Link href="/create">
              <Button variant="primary" size="sm" className="font-heading font-bold">
                {t.mock.createNewMock}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
      {/* Top back link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-pencil/70 hover:text-pencil transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>{t.mock.backHome}</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-dashed border-pencil/20 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-wobbly-sm text-xs font-heading font-bold bg-stamp-green/15 text-stamp-green border border-stamp-green">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.mock.mockReady}
            </span>
            {mock.subject && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-wobbly-sm text-xs font-heading font-bold bg-sticky-yellow text-pencil border border-pencil shadow-hard-sm">
                <BookOpen className="w-3 h-3 text-pencil" />
                {mock.subject}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-pencil tracking-tight">
            {mock.title}
          </h1>
          <div className="flex items-center gap-4 text-xs font-body text-pencil/70">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-pencil/60" />
              {t.mock.questionsCount.replace("{count}", String(mock.questions.length))}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-pencil/60" />
              {new Date(mock.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnswers(!showAnswers)}
            className="font-heading font-bold text-xs"
            leftIcon={
              showAnswers ? (
                <EyeOff className="w-4 h-4 text-pencil/60" />
              ) : (
                <Eye className="w-4 h-4 text-pencil" />
              )
            }
          >
            {showAnswers ? t.mock.hideAnswers : t.mock.showAnswers}
          </Button>

          {/* Toggle Thai / English Choices */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseThaiChoices(!useThaiChoices)}
            className="text-xs font-heading font-bold"
            title="สลับการแสดงผลตัวเลือก A-D และ ก-ง"
          >
            {t.mock.choiceToggle} <strong className="text-pen-blue ml-1">{useThaiChoices ? "ก ข ค ง" : "A B C D"}</strong>
          </Button>

          <Link href="/create">
            <Button
              variant="secondary"
              size="sm"
              className="font-heading font-bold text-xs"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              {t.mock.newMockBtn}
            </Button>
          </Link>

          {/* Create Room Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsHostModalOpen(true)}
            className="font-heading font-bold text-xs"
            leftIcon={<Users className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            {t.mock.createRoomBtn}
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {mock.questions.map((q) => {
          const choices: { key: ChoiceLetter; text: string }[] = [
            { key: "A", text: q.choiceA },
            { key: "B", text: q.choiceB },
            { key: "C", text: q.choiceC },
            { key: "D", text: q.choiceD },
          ];

          return (
            <Card key={q.id} className="shadow-hard-sm">
              <CardHeader className="py-3 px-4 sm:px-6 bg-paper flex flex-row items-center justify-between border-b-2 border-pencil/15">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-wobbly-sm bg-sticky-yellow border-2 border-pencil font-heading font-bold text-xs flex items-center justify-center text-pencil shadow-hard-sm">
                    #{q.questionNumber}
                  </span>
                  <CardTitle className="text-base text-pencil font-heading font-bold">
                    {t.mock.questionNumber.replace("{number}", String(q.questionNumber))}
                  </CardTitle>
                </div>
                {showAnswers && (
                  <span className="text-xs font-heading font-bold px-2.5 py-0.5 rounded-wobbly-sm bg-stamp-green/15 text-stamp-green border border-stamp-green">
                    {t.mock.answerLabel.replace("{answer}", formatChoiceLetter(q.correctAnswer, useThaiChoices))}
                  </span>
                )}
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Question Text */}
                <p className="text-base sm:text-lg text-pencil font-heading font-semibold whitespace-pre-line leading-relaxed">
                  {q.questionText}
                </p>

                {/* Choices Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {choices.map((c) => {
                    const isCorrect = showAnswers && q.correctAnswer === c.key;

                    return (
                      <div
                        key={c.key}
                        className={`flex items-start gap-3 p-3 rounded-wobbly-sm border-2 transition-all text-xs sm:text-sm ${
                          isCorrect
                            ? "bg-stamp-green/10 border-stamp-green text-pencil font-semibold"
                            : "bg-white border-pencil/30 text-pencil/80"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-wobbly-sm flex items-center justify-center font-heading font-bold text-xs shrink-0 ${
                            isCorrect
                              ? "bg-stamp-green text-white"
                              : "bg-paper border border-pencil/40 text-pencil"
                          }`}
                        >
                          {formatChoiceLetter(c.key, useThaiChoices)}
                        </span>
                        <span className="leading-snug pt-0.5 font-body">{c.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showAnswers && q.explanation && (
                  <div className="mt-3 p-3.5 rounded-wobbly-sm bg-sticky-yellow/40 border-2 border-dashed border-pencil/30 text-xs sm:text-sm text-pencil space-y-1">
                    <span className="text-xs font-heading font-bold text-pencil block uppercase tracking-wider">
                      💡 {t.mock.explanationLabel}
                    </span>
                    <p className="text-pencil/80 font-body whitespace-pre-line leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Host Modal to enter nickname & launch room */}
      <Modal
        isOpen={isHostModalOpen}
        onClose={() => setIsHostModalOpen(false)}
        title={t.mock.createRoomModalTitle}
        description={t.mock.createRoomModalDesc}
      >
        <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
          <Input
            label={t.mock.hostNicknameLabel}
            placeholder={t.mock.hostNicknamePlaceholder}
            value={hostNickname}
            onChange={(e) => {
              setHostNickname(e.target.value);
              if (nicknameError) setNicknameError(undefined);
            }}
            error={nicknameError}
            leftIcon={<User className="w-4 h-4 text-pencil/60" />}
            maxLength={20}
            autoFocus
          />

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsHostModalOpen(false)}
              className="font-heading font-bold"
            >
              {t.mock.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreatingRoom}
              className="font-heading font-bold"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t.mock.startRoomBtn}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
