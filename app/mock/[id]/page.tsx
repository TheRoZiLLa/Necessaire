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

  const [mock, setMock] = useState<MockWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);

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
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-gray-400">Loading mock test...</p>
      </div>
    );
  }

  if (!mock) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <HelpCircle className="w-10 h-10 text-gray-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Mock Test Not Found</h2>
          <p className="text-xs sm:text-sm text-gray-400">
            This test could not be located in storage. It may have been cleared or created in another session.
          </p>
          <div className="pt-2">
            <Link href="/create">
              <Button variant="primary" size="sm">
                Create a New Mock
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
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border/60 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary-accent border border-primary/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mock Test Ready
            </span>
            {mock.subject && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-card text-gray-300 border border-card-border">
                <BookOpen className="w-3 h-3 text-gray-400" />
                {mock.subject}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {mock.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              {mock.questions.length} Questions
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
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
            leftIcon={
              showAnswers ? (
                <EyeOff className="w-4 h-4 text-gray-400" />
              ) : (
                <Eye className="w-4 h-4 text-primary-accent" />
              )
            }
          >
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </Button>

          <Link href="/create">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              New Mock
            </Button>
          </Link>

          {/* Create Room Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsHostModalOpen(true)}
            leftIcon={<Users className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Create Room
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
            <Card key={q.id}>
              <CardHeader className="py-3 px-4 sm:px-6 bg-card-border/10 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-md bg-card-border/60 font-mono text-xs font-bold flex items-center justify-center text-gray-200">
                    #{q.questionNumber}
                  </span>
                  <CardTitle className="text-base text-gray-200 font-medium">
                    Question {q.questionNumber}
                  </CardTitle>
                </div>
                {showAnswers && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-success/15 text-success border border-success/30">
                    Answer: {q.correctAnswer}
                  </span>
                )}
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Question Text */}
                <p className="text-sm sm:text-base text-white font-medium whitespace-pre-line leading-relaxed">
                  {q.questionText}
                </p>

                {/* Choices Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {choices.map((c) => {
                    const isCorrect = showAnswers && q.correctAnswer === c.key;

                    return (
                      <div
                        key={c.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-xs sm:text-sm ${
                          isCorrect
                            ? "bg-success/10 border-success/50 text-white font-medium shadow-sm"
                            : "bg-[#0F1117] border-card-border text-gray-300"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect
                              ? "bg-success text-black font-extrabold"
                              : "bg-card-border/50 text-gray-400"
                          }`}
                        >
                          {c.key}
                        </span>
                        <span className="leading-snug pt-0.5">{c.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showAnswers && q.explanation && (
                  <div className="mt-3 p-3.5 rounded-lg bg-card-border/20 border border-card-border text-xs sm:text-sm text-gray-300 space-y-1">
                    <span className="text-xs font-semibold text-primary-accent block uppercase tracking-wider">
                      Explanation
                    </span>
                    <p className="text-gray-300 whitespace-pre-line leading-relaxed">
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
        title="Host a Mock Test Session"
        description="Choose your host nickname to create a room code for your friends."
      >
        <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
          <Input
            label="Your Host Nickname *"
            placeholder="e.g., Dome"
            value={hostNickname}
            onChange={(e) => {
              setHostNickname(e.target.value);
              if (nicknameError) setNicknameError(undefined);
            }}
            error={nicknameError}
            leftIcon={<User className="w-4 h-4" />}
            maxLength={20}
            autoFocus
          />

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsHostModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreatingRoom}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Room
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
