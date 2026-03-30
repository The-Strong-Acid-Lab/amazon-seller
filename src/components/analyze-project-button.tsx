"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AnalysisRunStatus = "queued" | "running" | "completed" | "failed";

type AnalysisResponse = {
  error?: string;
  runId?: string;
  runStatus?: AnalysisRunStatus;
};

type AnalyzeProjectButtonProps = {
  projectId: string;
  initialRunStatus: AnalysisRunStatus | null;
  initialRunError: string | null;
};

export function AnalyzeProjectButton({
  projectId,
  initialRunStatus,
  initialRunError,
}: AnalyzeProjectButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runStatus, setRunStatus] = useState<AnalysisRunStatus | null>(
    initialRunStatus,
  );
  const [error, setError] = useState<string | null>(initialRunError);

  useEffect(() => {
    setRunStatus(initialRunStatus);
  }, [initialRunStatus]);

  useEffect(() => {
    setError(initialRunError);
  }, [initialRunError]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`analysis-runs:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "analysis_runs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const run = payload.new as
            | {
                status?: AnalysisRunStatus;
                error_message?: string | null;
              }
            | undefined;

          if (!run?.status) {
            return;
          }

          setRunStatus(run.status);
          setError(run.error_message ?? null);
          setIsSubmitting(false);

          if (run.status === "completed" || run.status === "failed") {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  const isAnalyzing = useMemo(
    () => isSubmitting || runStatus === "queued" || runStatus === "running",
    [isSubmitting, runStatus],
  );

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }

    const refreshTimer = window.setInterval(() => {
      router.refresh();
    }, 4000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [isAnalyzing, router]);

  const buttonLabel = useMemo(() => {
    if (isAnalyzing) {
      return "正在分析评论...";
    }

    if (runStatus === "failed" || runStatus === "completed") {
      return "重新分析";
    }

    return "开始分析";
  }, [isAnalyzing, runStatus]);

  async function handleAnalyze() {
    if (isAnalyzing) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
      });

      const payload = (await response.json()) as AnalysisResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "分析失败。");
      }

      setRunStatus(payload.runStatus ?? "queued");
      router.refresh();
    } catch (analysisError) {
      setError(
        analysisError instanceof Error ? analysisError.message : "分析失败。",
      );
      setRunStatus((currentStatus) =>
        currentStatus === "queued" || currentStatus === "running"
          ? currentStatus
          : "failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button
        className="rounded-full px-5"
        disabled={isAnalyzing}
        onClick={handleAnalyze}
      >
        {buttonLabel}
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
