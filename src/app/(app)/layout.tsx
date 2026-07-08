import { NavBar } from "@/components/app-shell/nav-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      {children}
    </div>
  );
}
