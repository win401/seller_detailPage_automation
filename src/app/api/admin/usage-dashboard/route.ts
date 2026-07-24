import { AuthError, requireAdmin } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

export type AdminUsageStats = {
  totalUsers: number;
  totalProjects: number;
  totalGenerations: number;
  totalZipDownloads: number;
};

export type AdminRecentProject = {
  id: string;
  title: string;
  category: string;
  selectedPlatform: string;
  ownerEmail: string | null;
  createdAt: string;
};

type AdminUsageStatsRow = {
  total_users: number;
  total_projects: number;
  total_generations: number;
  total_zip_downloads: number;
};

type AdminRecentProjectRow = {
  id: string;
  title: string;
  category: string;
  selected_platform: string;
  owner_email: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  let supabase;
  try {
    ({ supabase } = await requireAdmin(request));
  } catch (error) {
    if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const [statsResult, recentResult] = await Promise.all([
    supabase.rpc("admin_usage_stats").single(),
    supabase.rpc("admin_recent_projects", { result_limit: 20 }),
  ]);

  if (statsResult.error || !statsResult.data) {
    return Response.json({ error: "사용량 통계를 불러오지 못했습니다." }, { status: 500 });
  }
  if (recentResult.error) {
    return Response.json({ error: "최근 프로젝트 목록을 불러오지 못했습니다." }, { status: 500 });
  }

  const statsRow = statsResult.data as AdminUsageStatsRow;
  const stats: AdminUsageStats = {
    totalUsers: Number(statsRow.total_users),
    totalProjects: Number(statsRow.total_projects),
    totalGenerations: Number(statsRow.total_generations),
    totalZipDownloads: Number(statsRow.total_zip_downloads),
  };

  const recentRows = (recentResult.data ?? []) as AdminRecentProjectRow[];
  const recentProjects: AdminRecentProject[] = recentRows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    selectedPlatform: row.selected_platform,
    ownerEmail: row.owner_email,
    createdAt: row.created_at,
  }));

  return Response.json({ stats, recentProjects });
}
