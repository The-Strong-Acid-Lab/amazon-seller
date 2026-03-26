"use client";

import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ExportProjectReportButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchReportText() {
    const response = await fetch(`/api/projects/${projectId}/export`);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "导出失败。");
    }

    return response.text();
  }

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/export`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "导出失败。");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);

      anchor.href = url;
      anchor.download = filenameMatch?.[1] ?? "project-report.md";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setMessage("报告已下载。");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "导出失败。");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleCopy() {
    setIsCopying(true);
    setError(null);
    setMessage(null);

    try {
      const reportText = await fetchReportText();
      await navigator.clipboard.writeText(reportText);
      setMessage("报告摘要已复制到剪贴板。");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败。");
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          className="rounded-full px-5"
          disabled={disabled || isCopying || isDownloading}
          onClick={handleCopy}
          variant="outline"
        >
          {isCopying ? "正在复制..." : "复制摘要"}
        </Button>
        <Button
          className="rounded-full px-5"
          disabled={disabled || isCopying || isDownloading}
          onClick={handleDownload}
          variant="secondary"
        >
          {isDownloading ? "正在导出..." : "下载报告"}
        </Button>
      </div>

      {message ? (
        <Alert>
          <AlertTitle>已完成</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>导出失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
