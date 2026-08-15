import type { ReactNode } from "react";
import PageIntro from "./PageIntro";

interface DocumentPageProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function DocumentPage({ eyebrow, title, subtitle, children }: DocumentPageProps) {
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-12"><PageIntro className="mb-12" eyebrow={eyebrow} title={title} description={subtitle} />{children}<footer className="mt-10 border-t border-border py-6 text-center"><p className="font-mono text-xs text-text-muted">© 2026 AisenLens · 如有疑问请联系 aisenhub@163.com</p></footer></main>;
}
