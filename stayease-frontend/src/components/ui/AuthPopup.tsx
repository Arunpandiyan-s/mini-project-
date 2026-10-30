import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface AuthPopupConfig {
  open: boolean;
  title: string;
  message: string;
  variant?: "success" | "error" | "warning" | "info";
  actionText?: string;
  autoCloseMs?: number;
  onClose: () => void;
}

export function AuthPopup({
  open,
  title,
  message,
  variant = "info",
  actionText = "OK",
  autoCloseMs,
  onClose,
}: AuthPopupConfig) {
  useEffect(() => {
    if (open && autoCloseMs && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [open, autoCloseMs, onClose]);

  const IconComponent =
    variant === "success"
      ? CheckCircle2
      : variant === "error"
        ? XCircle
        : variant === "warning"
          ? AlertTriangle
          : Info;

  const iconColorClass =
    variant === "success"
      ? "bg-emerald-500/15 text-emerald-500"
      : variant === "error"
        ? "bg-destructive/15 text-destructive"
        : variant === "warning"
          ? "bg-amber-500/15 text-amber-500"
          : "bg-blue-500/15 text-blue-500";

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-xs rounded-3xl p-6 text-center sm:max-w-sm">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className={`mb-3 grid h-14 w-14 place-items-center rounded-2xl ${iconColorClass}`}>
            <IconComponent className="h-7 w-7" />
          </div>
          <AlertDialogTitle className="text-xl font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 flex justify-center sm:justify-center">
          <AlertDialogAction
            onClick={onClose}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold gradient-gold text-gold-foreground hover:opacity-90 active:scale-95 transition"
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
