"use client";
import { usePathname } from "next/navigation";
import Shell from "@/components/Shell";
import AuthGuard from "@/components/AuthGuard";

const PUBLIC_ROUTES = ["/login"];

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  return (
    <AuthGuard>
      {isPublicRoute ? (
        // Login page renders without the Shell sidebar
        <>{children}</>
      ) : (
        // Protected pages render inside the Shell
        <Shell>{children}</Shell>
      )}
    </AuthGuard>
  );
}
