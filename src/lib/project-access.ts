import { createAdminSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

export class ProjectAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function assertProjectOwnership(projectId: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new ProjectAccessError(401, "请先登录。");
  }

  const supabase = createAdminSupabaseClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new ProjectAccessError(500, error.message);
  }

  if (!project || project.user_id !== user.id) {
    throw new ProjectAccessError(404, "Project not found.");
  }

  return { user, project };
}

