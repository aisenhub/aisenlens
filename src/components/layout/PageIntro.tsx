import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PageIntroProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export default function PageIntro({ eyebrow, title, description, align = "left", className }: PageIntroProps) {
  return (
    <header className={cn(align === "center" && "mx-auto text-center", className)}>
      <p className="mb-3 font-mono text-xs tracking-widest text-accent/60">{eyebrow}</p>
      <h1 className="font-display font-black text-white" style={{ fontSize: "clamp(2.4rem, 5vw, 3.5rem)" }}>{title}</h1>
      {description && <p className={cn("mt-3 leading-relaxed text-text-dim", align === "center" && "mx-auto max-w-xl")}>{description}</p>}
    </header>
  );
}
