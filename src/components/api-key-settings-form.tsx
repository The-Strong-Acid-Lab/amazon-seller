"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApiKeySettingsForm({
  initial,
}: {
  initial: {
    hasOpenAiKey: boolean;
    openAiLast4: string | null;
    hasGeminiKey: boolean;
    geminiLast4: string | null;
  };
}) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          openaiKey,
          geminiKey,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "保存 API Key 失败。");
      }

      setMessage(payload.message ?? "已保存 API Key。");
      setOpenaiKey("");
      setGeminiKey("");
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error ? caughtError.message : "保存 API Key 失败。";
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-stone-900"
          htmlFor="openai-key"
        >
          OpenAI API Key
        </label>
        <Input
          id="openai-key"
          onChange={(event) => setOpenaiKey(event.target.value)}
          placeholder={
            initial.hasOpenAiKey
              ? `sk-**********${initial.openAiLast4}`
              : "sk-**********"
          }
          value={openaiKey}
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-stone-900"
          htmlFor="gemini-key"
        >
          Gemini API Key
        </label>
        <Input
          id="gemini-key"
          onChange={(event) => setGeminiKey(event.target.value)}
          placeholder={
            initial.hasGeminiKey
              ? `AIza**********${initial.geminiLast4}`
              : "AIza..."
          }
          value={geminiKey}
        />
      </div>

      <Button disabled={submitting} type="submit">
        {submitting ? "保存中..." : "保存 API Key"}
      </Button>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
