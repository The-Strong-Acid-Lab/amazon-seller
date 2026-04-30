import { HomeConsole } from "@/components/home-console";
import { requireUser } from "@/lib/auth";
import { getProjectsListData } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = await getProjectsListData(user.id);

  return (
    <HomeConsole
      projects={projects}
      userEmail={user.email ?? null}
    />
  );
}

