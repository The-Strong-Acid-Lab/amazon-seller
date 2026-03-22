"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AnalyzeProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "分析失败。");
      }

      router.refresh();
    } catch (analysisError) {
      setError(
        analysisError instanceof Error ? analysisError.message : "分析失败。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button className="rounded-full px-5" disabled={isLoading} onClick={handleAnalyze}>
        {isLoading ? "正在分析评论..." : "开始 LLM 分析"}
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>分析失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
