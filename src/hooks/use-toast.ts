import * as React from "react";
import { toast } from "sonner";

type ToasterToast = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

const TOAST_LIMIT = 1;

export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  const toastFn = React.useCallback(
    ({ title, description, variant = "default", ...props }: ToasterToast) => {
      if (variant === "destructive") {
        toast.error(title || description || "发生错误", {
          description: title && description ? description : undefined,
        });
      } else {
        toast.success(title || description || "操作成功", {
          description: title && description ? description : undefined,
        });
      }
    },
    []
  );

  return {
    toast: toastFn,
    toasts,
  };
};