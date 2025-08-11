import * as React from "react";

import { toast } from "sonner";

type ToasterToast = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

const showErrorToast = (title?: string, description?: string) => {
  toast.error(title ?? description ?? "发生错误", {
    description: title && description ? description : undefined,
  });
};

const showSuccessToast = (title?: string, description?: string) => {
  toast.success(title ?? description ?? "操作成功", {
    description: title && description ? description : undefined,
  });
};

export const useToast = () => {
  const toastFn = React.useCallback(({ title, description, variant = "default" }: ToasterToast) => {
    if (variant === "destructive") {
      showErrorToast(title, description);
    } else {
      showSuccessToast(title, description);
    }
  }, []);

  return {
    toast: toastFn,
  };
};
