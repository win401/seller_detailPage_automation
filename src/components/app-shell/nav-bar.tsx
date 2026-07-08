"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSwitch } from "./theme-switch";

const NAV_LINKS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/styles", label: "스타일 세트" },
] as const;

export function NavBar() {
  const pathname = usePathname();

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
        <Avatar className="size-[30px]">
          <AvatarFallback className="text-[11px]">SW</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
