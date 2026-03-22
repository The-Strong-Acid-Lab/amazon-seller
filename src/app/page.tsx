import { Badge } from "@/components/ui/badge";
import { ImportWorkbench } from "@/components/import-workbench";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="pb-10">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-[11px] tracking-[0.24em] text-stone-600"
          >
            AMAZON SELLER RESEARCH CONSOLE
          </Badge>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            先定义目标商品，再把评论作为证据导入进来。
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-stone-600 sm:text-lg">
            这一页的任务很单一：把评论文件正确挂到目标商品或竞品商品上，完成入库，
            然后再进入 LLM 分析和策略生成。
          </p>
        </section>

        <ImportWorkbench />
      </div>
    </main>
  );
}
