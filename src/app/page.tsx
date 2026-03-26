import { HomeConsole } from "@/components/home-console";
import { getProjectsListData } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await getProjectsListData();
  return <HomeConsole projects={projects} />;
}
