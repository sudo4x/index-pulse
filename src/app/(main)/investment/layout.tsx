import { ReactNode } from "react";

import { ProtectedMainLayout } from "@/components/layouts/protected-main-layout";

export default function InvestmentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ProtectedMainLayout>{children}</ProtectedMainLayout>;
}