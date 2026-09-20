"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, FileText, User, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function CreateMockPage() {
  const { info, error } = useToast();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [nickname, setNickname] = useState("");
  const [errors, setErrors] = useState<{ title?: string; nickname?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { title?: string; nickname?: string } = {};

    if (!title.trim()) {
      newErrors.title = "Mock title is required";
    }
    if (!nickname.trim()) {
      newErrors.nickname = "Host nickname is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      error("Please fill in the required fields.", "Validation Error");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      info(
        "Phase 1 Preview: Form validated! Actual room creation and AI import will be enabled in Phase 2.",
        "UI Scaffolding Active"
      );
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-xl space-y-6">
        {/* Top bar back link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>

        <form onSubmit={handleMockSubmit}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary-accent mb-1 text-xs font-semibold uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Host Setup</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl">Create a Mock Test</CardTitle>
              <CardDescription>
                Set up your room details. Friends will join using your room code.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Mock Title Input */}
              <Input
                label="Mock Title *"
                placeholder="e.g., Biology 101 Midterm Drill"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                error={errors.title}
                leftIcon={<FileText className="w-4 h-4" />}
                maxLength={60}
              />

              {/* Subject Input */}
              <Input
                label="Subject (Optional)"
                placeholder="e.g., Cellular Biology"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                leftIcon={<BookOpen className="w-4 h-4" />}
                maxLength={40}
              />

              {/* Host Nickname Input */}
              <Input
                label="Your Nickname *"
                placeholder="e.g., Alex"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (errors.nickname) setErrors((prev) => ({ ...prev, nickname: undefined }));
                }}
                error={errors.nickname}
                leftIcon={<User className="w-4 h-4" />}
                maxLength={20}
              />

              {/* AI Import Visual Placeholder */}
              <div className="pt-2">
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] p-4 text-left">
                  <div className="flex items-center gap-2 text-primary-accent text-xs font-semibold uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-4 h-4 text-primary-accent" />
                    <span>Upcoming: AI Question Import</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    In Phase 2, you will be able to paste AI-generated questions directly here. Nécessaire will format and distribute them to everyone in the room.
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
                Cancel
              </Link>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
              >
                Create Room
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
