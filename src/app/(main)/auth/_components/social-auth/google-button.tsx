"use client";

import { siGoogle } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style-utils";

export function GoogleButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const handleGoogleLogin = async () => {
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success && result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  return (
    <Button variant="secondary" className={cn(className)} onClick={handleGoogleLogin} type="button" {...props}>
      <SimpleIcon icon={siGoogle} className="size-4" />
      使用 Google 继续
    </Button>
  );
}
