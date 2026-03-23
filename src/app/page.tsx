import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImportWorkbench } from "@/components/import-workbench";
import { ProjectsList } from "@/components/projects-list";
import { getProjectsListData } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await getProjectsListData();

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

        <section className="grid gap-6 pb-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                项目列表
              </h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                先按单用户模式管理项目。以后做会员时，可以在这里直接加项目额度限制，
                比如 `starter = 2`、`pro = 10`。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SummaryPill label="总项目数" value={String(projects.length)} />
              <SummaryPill
                label="已分析项目"
                value={String(projects.filter((project) => project.latestReportAt).length)}
              />
            </div>
          </div>

          {projects.length > 0 ? (
            <ProjectsList projects={projects} />
          ) : (
            <Card className="rounded-[2rem] border-dashed border-stone-300 bg-stone-50 shadow-none">
              <CardContent className="px-6 py-8">
                <p className="text-base font-medium text-stone-900">还没有项目</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  先在下面新建第一个项目，把目标商品和第一份评论文件导进来。
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="grid gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
              新建项目
            </h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              这里仍然只负责创建新项目并导入第一份评论。后续追加竞品评论在项目详情页里做。
            </p>
          </div>
          <ImportWorkbench />
        </section>
      </div>
    </main>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700">
      <span className="font-medium text-stone-900">{value}</span> {label}
    </div>
  );
}
