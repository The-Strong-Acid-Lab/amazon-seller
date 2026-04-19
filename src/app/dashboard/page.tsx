import { HomeConsole } from "@/components/home-console";
import { requireUser } from "@/lib/auth";
import { getProjectsListData } from "@/lib/projects";
import { getUserApiKeySettings } from "@/lib/user-api-keys";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = await getProjectsListData(user.id);
  const apiKeySettings = await getUserApiKeySettings(user.id);

  return (
    <HomeConsole
      canCreateProject={apiKeySettings.hasOpenAiKey || apiKeySettings.hasGeminiKey}
      projects={projects}
      userEmail={user.email ?? null}
    />
  );
}

