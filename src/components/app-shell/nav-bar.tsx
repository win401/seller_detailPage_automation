"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeSwitch } from "./theme-switch";

const NAV_LINKS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/styles", label: "스타일 세트" },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    async function loadUser() {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!cancelled) setEmail(user?.email ?? null);
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const fallback = (email?.slice(0, 2) || "SW").toUpperCase();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-7">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="size-[18px] rounded-[5px] bg-primary" />
          <span className="text-[15px] font-extrabold tracking-tight">셀러페이지 AI</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13.5px] font-semibold text-muted-foreground transition-colors",
                  active && "bg-accent-soft text-accent"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3.5">
        <ThemeSwitch />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="계정 메뉴 열기"
          >
            <Avatar className="size-[30px]">
              <AvatarFallback className="text-[11px]">{fallback}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-xs font-bold text-foreground">계정</span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
                {email ?? "데모 사용자"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer text-[13px]"
            >
              <Settings className="size-4" />
              설정
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              variant="destructive"
              className="cursor-pointer text-[13px]"
            >
              <LogOut className="size-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
