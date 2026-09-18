import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";

interface ModalShellProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeDisabled?: boolean;
  density?: "default" | "compact";
}

export default function ModalShell({ title, description, onClose, children, className, closeDisabled = false, density = "default" }: ModalShellProps) {
  const isCompact = density === "compact";
  return (
    <Dialog open onOpenChange={(open) => {
      if (!open && !closeDisabled) onClose();
    }}>
      <DialogContent
        showCloseButton={false}
        aria-label={title}
        className={cn("gap-0 overflow-hidden border-border-mid p-0 shadow-[var(--shadow-modal)] sm:max-w-md", className)}
      >
        <DialogHeader className={cn("relative flex-row items-start justify-between gap-4 border-b border-border", isCompact ? "px-5 py-3.5" : "px-6 py-5")}>
          <div className="min-w-0">
            <DialogTitle className={cn("font-display font-semibold text-text-base", isCompact ? "editor-page-title" : "text-xl")}>{title}</DialogTitle>
            {description && <DialogDescription className={cn("mt-1 text-text-muted", isCompact ? "editor-meta" : "text-sm")}>{description}</DialogDescription>}
          </div>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="关闭窗口" disabled={closeDisabled} onClick={onClose} className="shrink-0 text-text-muted hover:bg-bg-hover hover:text-text-base"><X /></Button>
        </DialogHeader>
        <div className={isCompact ? "p-4" : "p-6"}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
