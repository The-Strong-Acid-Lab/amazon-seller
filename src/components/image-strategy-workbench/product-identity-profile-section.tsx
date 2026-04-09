"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProductIdentityProfile } from "@/components/image-strategy-workbench/types";

function StringList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        {title}
      </p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge className="rounded-full" key={item} variant="outline">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-stone-500">暂未识别</p>
      )}
    </div>
  );
}

export function ProductIdentityProfileSection({
  profile,
  sourceImageCount,
  isGenerating,
  isConfirming,
  onGenerate,
  onConfirm,
}: {
  profile: ProductIdentityProfile | null;
  sourceImageCount: number;
  isGenerating: boolean;
  isConfirming: boolean;
  onGenerate: () => void | Promise<void>;
  onConfirm: () => void | Promise<void>;
}) {
  const isConfirmed = profile?.status === "confirmed";

  return (
    <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-stone-900">商品身份识别</p>
            <Badge className="rounded-full" variant={isConfirmed ? "default" : "outline"}>
              {isConfirmed ? "已确认" : profile ? "待确认" : "未生成"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            先基于多张我的商品图识别“这到底是什么商品、哪些地方绝对不能变”，后续所有图片生成都会强绑定这份身份档案。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isGenerating || sourceImageCount === 0}
            onClick={() => void onGenerate()}
            size="sm"
            variant="outline"
          >
            {isGenerating
              ? "识别中..."
              : profile
                ? "重新识别商品身份"
                : "识别商品身份"}
          </Button>
          <Button
            disabled={!profile || isConfirmed || isConfirming}
            onClick={() => void onConfirm()}
            size="sm"
          >
            {isConfirming ? "确认中..." : "确认并用于生成"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            识别图片数
          </p>
          <p className="mt-2 text-sm text-stone-900">{profile?.source_image_count ?? sourceImageCount}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            商品类型
          </p>
          <p className="mt-2 text-sm text-stone-900">{profile?.product_type || "暂未识别"}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            类目
          </p>
          <p className="mt-2 text-sm text-stone-900">{profile?.category || "暂未识别"}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            主色 / 材质
          </p>
          <p className="mt-2 text-sm text-stone-900">
            {profile?.primary_color || "暂未识别"}
          </p>
        </div>
      </div>

      {profile ? (
        <div className="grid gap-3">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              身份摘要
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-800">
              {profile.identity_summary || "暂未识别到稳定摘要。"}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StringList items={profile.materials} title="材质" />
            <StringList items={profile.signature_features} title="标志性结构" />
            <StringList items={profile.must_keep} title="必须保留" />
            <StringList items={profile.can_change} title="允许变化" />
          </div>

          <StringList items={profile.must_not_change} title="绝对不能变" />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3">
          <p className="text-sm text-stone-600">
            先上传我的商品图片，再点“识别商品身份”。没有这一步，后面的图片生成仍然容易把你的商品画成别的类目。
          </p>
        </div>
      )}
    </div>
  );
}
