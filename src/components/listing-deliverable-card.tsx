"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TITLE_MAX_LENGTH = 200;
const BULLET_MAX_LENGTH = 500;
const BULLET_SLOT_COUNT = 5;

type ListingDraft = {
  title_draft: string;
  title_rationale: string;
  bullet_drafts: string[];
  bullet_rationales: string[];
  positioning_statement: string;
};

type ListingSnapshot = {
  id: string;
  title_draft: string;
  bullet_drafts: string[];
  positioning_statement: string;
  source: string;
  created_at: string;
};

type ListingDeliverableCardProps = {
  projectId: string;
  analysisReportId: string | null;
  initialDraft?: ListingDraft;
  snapshots: ListingSnapshot[];
  analysisFreshness?: {
    status: "fresh" | "stale" | "missing";
    reasonText: string;
  };
};

type SnapshotResponse = {
  error?: string;
};

function normalizeBullets(value?: string[]) {
  const base = Array.from({ length: BULLET_SLOT_COUNT }, (_, index) => value?.[index] ?? "");
  return base.slice(0, BULLET_SLOT_COUNT);
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ListingDeliverableCard({
  projectId,
  analysisReportId,
  initialDraft,
  snapshots,
  analysisFreshness,
}: ListingDeliverableCardProps) {
  const router = useRouter();
  const [isCopying, setIsCopying] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copyingSnapshotId, setCopyingSnapshotId] = useState<string | null>(
    null,
  );
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const titleDraft = initialDraft?.title_draft ?? "";
  const bulletDrafts = useMemo(
    () => normalizeBullets(initialDraft?.bullet_drafts),
    [initialDraft?.bullet_drafts],
  );

  const titleCount = titleDraft.length;
  const titleTooLong = titleCount > TITLE_MAX_LENGTH;
  const bulletCounts = useMemo(
    () => bulletDrafts.map((item) => item.length),
    [bulletDrafts],
  );
  const hasOverLimitBullet = bulletCounts.some(
    (count) => count > BULLET_MAX_LENGTH,
  );
  const snapshotLimitReached = snapshots.length >= 5;

  const hasContent = useMemo(() => {
    return (
      titleDraft.trim().length > 0 ||
      bulletDrafts.some((item) => item.trim().length > 0)
    );
  }, [bulletDrafts, titleDraft]);

  const listingText = useMemo(() => {
    const lines: string[] = [];

    if (titleDraft.trim()) {
      lines.push(`标题: ${titleDraft.trim()}`);
    }

    const nonEmptyBullets = bulletDrafts
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (nonEmptyBullets.length > 0) {
      lines.push("五点描述:");
      nonEmptyBullets.forEach((bullet, index) => {
        lines.push(`${index + 1}. ${bullet}`);
      });
    }

    return lines.join("\n");
  }, [bulletDrafts, titleDraft]);

  async function handleCopyListing() {
    if (!listingText.trim()) {
      setError("当前没有可复制的 Listing 内容。");
      return;
    }

    setIsCopying(true);
    setError(null);
    setMessage(null);

    try {
      await navigator.clipboard.writeText(listingText);
      setMessage("Listing 草案已复制到剪贴板。");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败。");
    } finally {
      setIsCopying(false);
    }
  }

  function buildSnapshotText(snapshot: ListingSnapshot) {
    const lines: string[] = [];

    if (snapshot.title_draft.trim()) {
      lines.push(`标题: ${snapshot.title_draft.trim()}`);
    }

    if (snapshot.bullet_drafts.length > 0) {
      lines.push("五点描述:");
      snapshot.bullet_drafts.forEach((bullet, index) => {
        lines.push(`${index + 1}. ${bullet}`);
      });
    }

    return lines.join("\n");
  }

  async function handleCopySnapshot(snapshot: ListingSnapshot) {
    const snapshotText = buildSnapshotText(snapshot);

    if (!snapshotText.trim()) {
      setError("该快照没有可复制的内容。");
      return;
    }

    setCopyingSnapshotId(snapshot.id);
    setError(null);
    setMessage(null);

    try {
      await navigator.clipboard.writeText(snapshotText);
      setMessage("快照内容已复制到剪贴板。");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "复制失败。");
    } finally {
      setCopyingSnapshotId(null);
    }
  }

  async function handleRegenerateListing() {
    setIsRegenerating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/listing-draft`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "重新生成文案失败。");
      }

      setMessage("Listing 文案已更新。");
      router.refresh();
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "重新生成文案失败。",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleSaveSnapshot() {
    if (!hasContent) {
      setError("请先生成标题或 Bullet 后再保存。");
      return;
    }

    setIsSavingSnapshot(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/listing-snapshots`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            analysisReportId,
            titleDraft,
            bulletDrafts: bulletDrafts
              .map((item) => item.trim())
              .filter((item) => item.length > 0),
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as SnapshotResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "保存快照失败。");
      }

      setMessage("当前 Listing 已保存。");
      router.refresh();
    } catch (snapshotError) {
      setError(
        snapshotError instanceof Error
          ? snapshotError.message
          : "保存快照失败。",
      );
    } finally {
      setIsSavingSnapshot(false);
    }
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>Listing 可交付稿</CardTitle>
          <Button
            className="rounded-full px-5"
            disabled={isRegenerating}
            onClick={handleRegenerateListing}
            variant="outline"
          >
            {isRegenerating ? "正在加入队列..." : "重新生成文案"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {snapshotLimitReached ? (
          <Alert variant="warning">
            <AlertTitle>已达到快照上限</AlertTitle>
            <AlertDescription>
              当前项目暂时最多保留 5 条版本快照。
            </AlertDescription>
          </Alert>
        ) : null}

        {analysisFreshness?.status === "stale" ? (
          <Alert variant="warning">
            <AlertTitle>当前分析基础已过期</AlertTitle>
            <AlertDescription>
              {analysisFreshness.reasonText || "项目数据已经变化。"}{" "}
              如果变化较大，建议先重新分析项目，再更新 Listing 文案。
            </AlertDescription>
          </Alert>
        ) : null}

        {analysisFreshness?.status === "missing" ? (
          <Alert variant="warning">
            <AlertTitle>还没有分析结果</AlertTitle>
            <AlertDescription>
              先完成一次项目分析，再生成 Listing 文案会更准确。
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 rounded-2xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">标题</p>
            <p
              className={cn(
                "text-xs text-stone-600",
                titleTooLong && "font-semibold text-rose-600",
              )}
            >
              {titleCount}/{TITLE_MAX_LENGTH}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4">
            <p className="text-sm leading-7 text-stone-900">
              {titleDraft || "还没有生成标题。"}
            </p>
          </div>
          {initialDraft?.title_rationale ? (
            <p className="text-xs leading-6 text-stone-600">
              <span className="font-medium text-stone-900">角度意图:</span>{" "}
              {initialDraft.title_rationale}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-900">五点描述</p>
          {bulletDrafts.map((bullet, index) => {
            return (
              <div
                key={`bullet-${index}`}
                className="rounded-2xl border border-stone-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-900">
                    Bullet {index + 1}
                  </p>
                </div>
                <div className="mt-3 rounded-2xl bg-stone-50 px-4 py-4">
                  <p className="text-sm leading-7 text-stone-900">
                    {bullet || "还没有生成这一条 Bullet。"}
                  </p>
                </div>
                {initialDraft?.bullet_rationales[index] ? (
                  <p className="mt-3 text-xs leading-6 text-stone-600">
                    <span className="font-medium text-stone-900">
                      角度意图:
                    </span>{" "}
                    {initialDraft.bullet_rationales[index]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="rounded-full px-5"
            disabled={isCopying || !hasContent}
            onClick={handleCopyListing}
            variant="outline"
          >
            {isCopying ? "正在复制..." : "一键复制全套文案"}
          </Button>
          <Button
            className="rounded-full px-5"
            disabled={isSavingSnapshot || !hasContent || snapshotLimitReached}
            onClick={handleSaveSnapshot}
          >
            {isSavingSnapshot ? "正在保存..." : "保存"}
          </Button>
        </div>

        {titleTooLong || hasOverLimitBullet ? (
          <Alert variant="warning">
            <AlertTitle>存在字符超限</AlertTitle>
            <AlertDescription>
              标题建议不超过 {TITLE_MAX_LENGTH}，每条 Bullet 建议不超过{" "}
              {BULLET_MAX_LENGTH}
              ，避免发布时被截断或报错。
            </AlertDescription>
          </Alert>
        ) : null}

        {message ? (
          <Alert>
            <AlertTitle>已完成</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-semibold text-stone-900">
            版本快照（最多 5 条）
          </p>
          <div className="mt-3 grid gap-3">
            {snapshots.length > 0 ? (
              snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-900">
                      {formatTimestamp(snapshot.created_at)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-stone-700">
                    标题：{snapshot.title_draft || "（空）"}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">
                    Bullet 数：{snapshot.bullet_drafts.length}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      className="rounded-full px-4"
                      disabled={copyingSnapshotId === snapshot.id}
                      onClick={() => handleCopySnapshot(snapshot)}
                      size="sm"
                      variant="outline"
                    >
                      {copyingSnapshotId === snapshot.id
                        ? "正在复制..."
                        : "复制该快照"}
                    </Button>
                    <Button
                      className="rounded-full px-4"
                      onClick={() =>
                        setExpandedSnapshotId((current) =>
                          current === snapshot.id ? null : snapshot.id,
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      {expandedSnapshotId === snapshot.id
                        ? "收起详情"
                        : "查看详情"}
                    </Button>
                  </div>
                  {expandedSnapshotId === snapshot.id ? (
                    <div className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-white p-3">
                      <div className="grid gap-1">
                        <p className="text-xs font-semibold text-stone-900">
                          完整标题
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
                          {snapshot.title_draft || "（空）"}
                        </p>
                      </div>
                      <div className="grid gap-1">
                        <p className="text-xs font-semibold text-stone-900">
                          五点描述
                        </p>
                        {snapshot.bullet_drafts.length > 0 ? (
                          <div className="grid gap-2">
                            {snapshot.bullet_drafts.map((bullet, index) => (
                              <p
                                key={`${snapshot.id}-bullet-${index}`}
                                className="whitespace-pre-wrap text-sm leading-6 text-stone-700"
                              >
                                {index + 1}. {bullet}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-stone-500">（空）</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">
                还没有保存过 Listing 快照。
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
