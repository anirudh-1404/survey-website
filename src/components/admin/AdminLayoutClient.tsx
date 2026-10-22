"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { UserSafeResponse } from "@/models/User";

export function AdminLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: UserSafeResponse;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#07080c] text-zinc-100">
      {/* Sidebar */}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          title="PULSE Editorial Administration"
          user={user}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
