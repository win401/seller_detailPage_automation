"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // Avoid rendering theme-dependent active state before hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client mount flag, not a render loop
    setMounted(true);
  }, []);

  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && (theme ?? "system") === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
              active && "bg-card text-foreground shadow-sm"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
