"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/api";

const PUBLIC_ROUTES = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!isPublic && !isAuthenticated()) {
      router.replace("/login");
    } else if (isPublic && isAuthenticated()) {
      // Already logged in, redirect away from login
      router.replace("/");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  // Don't render anything until auth check is complete (prevents flash)
  if (!checked) return null;

  return <>{children}</>;
}
