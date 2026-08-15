import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import SurfaceCard from "./surface-card";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="关闭窗口" disabled={closeDisabled} onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <SurfaceCard role="dialog" aria-modal="true" aria-label={title} className={cn("relative w-full max-w-md overflow-hidden border-border-mid shadow-2xl", className)}>
        <div className={cn("flex items-start justify-between gap-4 border-b border-border", isCompact ? "px-5 py-3.5" : "px-6 py-5")}>
          <div><h2 className={cn("font-display font-black text-white", isCompact ? "editor-page-title" : "text-2xl")}>{title}</h2>{description && <p className={cn("mt-1 text-text-muted", isCompact ? "editor-meta" : "text-sm")}>{description}</p>}</div>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="关闭窗口" disabled={closeDisabled} onClick={onClose} className="text-text-muted hover:bg-white/6 hover:text-white"><X /></Button>
        </div>
        <div className={isCompact ? "p-4" : "p-6"}>{children}</div>
      </SurfaceCard>
    </div>
  );
}
