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
    // Normalize trailing slash (Next trailingSlash:true yields "/login/")
    const normalized = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
    const isPublic = PUBLIC_ROUTES.includes(normalized);

    if (!isPublic && !isAuthenticated()) {
      router.replace("/login");
    } else if (isPublic && isAuthenticated()) {
      // Already logged in, redirect away from login
      router.replace("/");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  // Show branded loading screen until auth check is complete
  if (!checked) {
    return (
      <div className="app-loader">
        <div className="app-loader-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Opus_Inspection.png" alt="Opus Inspection" className="app-loader-logo" />
          <div className="app-loader-spinner" />
          <p className="app-loader-text">Loading TalkSuite…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
