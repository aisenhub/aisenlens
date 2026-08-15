import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export default function SurfaceCard({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-border bg-bg-card", className)} {...props} />;
}
