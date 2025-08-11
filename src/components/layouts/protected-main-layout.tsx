import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { MainLayout } from "./main-layout";

interface ProtectedMainLayoutProps {
  children: ReactNode;
}

export async function ProtectedMainLayout({ children }: ProtectedMainLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/v1/login");
  }

  return <MainLayout>{children}</MainLayout>;
}
