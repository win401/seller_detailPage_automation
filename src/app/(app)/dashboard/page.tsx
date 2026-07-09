"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mockProjectSummaries } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PLATFORM_LABELS, Platform, ProjectSummary } from "@/lib/types";

function isPlatform(value: string | null): value is Platform {
  return value === "coupang" || value === "smartstore" || value === "ably" || value === "zigzag";
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "-";
  const updatedAt = new Date(value).getTime();
  if (Number.isNaN(updatedAt)) return "-";
  const diffMinutes = Math.max(0, Math.round((Date.now() - updatedAt) / 60000));
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.round(diffHours / 24)}일 전`;
}

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>(mockProjectSummaries);
  const [projectSource, setProjectSource] = useState<"mock" | "supabase" | "loading">("loading");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // one-time fallback when Supabase env is not configured
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectSource("mock");
      return;
    }
    const client = supabase;
    let cancelled = false;

    async function loadProjects() {
      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        if (!cancelled) setProjectSource("mock");
        return;
      }

      const { data, error } = await client
        .from("detail_page_projects")
        .select("id, title, category, selected_platform, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        setProjectSource("mock");
        return;
      }

      const remoteProjects: ProjectSummary[] = (data ?? []).map((project) => ({
        id: project.id,
        name: project.title,
        category: project.category,
        platform: isPlatform(project.selected_platform)
          ? project.selected_platform
          : "smartstore",
        updatedAtLabel: formatUpdatedAt(project.updated_at),
      }));

      setProjects(remoteProjects.length ? remoteProjects : []);
      setProjectSource("supabase");
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.includes(q) || p.category.includes(q)
    );
  }, [projects, query]);

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">프로젝트</h1>
          <p className="text-[13.5px] text-muted-foreground">
            {projectSource === "supabase"
              ? "Supabase에 저장된 상세페이지 프로젝트를 관리하세요"
              : projectSource === "loading"
                ? "프로젝트 목록을 불러오는 중입니다"
                : "진행 중인 상세페이지 프로젝트를 관리하세요"}
          </p>
        </div>
        <Button
          render={<Link href="/projects/new" />}
          nativeButton={false}
          className="h-[38px] gap-1.5 px-4 text-[13.5px] font-bold"
        >
          <Plus className="size-4" />
          새 상세페이지 만들기
        </Button>
      </div>

      <div className="mb-5 flex gap-3">
        <div className="flex h-[38px] max-w-[360px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground">
          <Search className="size-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명, 카테고리로 검색"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Link
          href="/styles"
          className="flex h-[38px] items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-[13px] font-semibold"
        >
          스타일 세트 관리
        </Link>
        <span className="flex h-[38px] items-center rounded-lg border border-border bg-card px-3 text-[12px] font-bold text-muted-foreground">
          {projectSource === "supabase" ? "DB 동기화" : "mock 목록"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex border-b border-border bg-card-soft px-4.5 py-2.5 text-xs font-bold text-muted-foreground">
          <span className="flex-[2.4]">상품명</span>
          <span className="flex-[1.2]">카테고리</span>
          <span className="flex-1">플랫폼</span>
          <span className="flex-1">수정일</span>
          <span className="flex-[0.8]" />
        </div>
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex items-center border-b border-border px-4.5 py-3.5 text-[13.5px] last:border-b-0"
          >
            <span className="flex-[2.4] font-semibold">{p.name}</span>
            <span className="flex-[1.2] text-muted-foreground">{p.category}</span>
            <span className="flex-1">
              <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-accent">
                {PLATFORM_LABELS[p.platform]}
              </span>
            </span>
            <span className="flex-1 text-muted-foreground">{p.updatedAtLabel}</span>
            <span className="flex-[0.8] text-right">
              <Link
                href={`/projects/${p.id}/editor`}
                className="rounded-md border border-border px-3 py-1 text-[12.5px] font-semibold"
              >
                열기
              </Link>
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-4.5 py-10 text-center text-sm text-muted-foreground">
            {projectSource === "supabase"
              ? "아직 저장된 프로젝트가 없습니다."
              : "검색 결과가 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}
