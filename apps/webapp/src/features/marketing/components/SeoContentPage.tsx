import { Link } from "react-router-dom";
import { Button, buttonVariants } from "../../../components/ui/button";
import SurfaceCard from "../../../components/ui/surface-card";
import type { SeoContentPageDefinition } from "../seo/seoContent";

interface SeoContentPageProps {
  page: SeoContentPageDefinition;
  onStart: () => void;
}

export default function SeoContentPage({ page, onStart }: SeoContentPageProps) {
  return (
    <article className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.2em] text-accent">{page.eyebrow}</p>
        <h1 className="mt-4 font-display text-4xl font-black text-white sm:text-6xl">{page.title}</h1>
        <p className="mt-6 text-lg leading-8 text-text-dim">{page.description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={onStart}>免费开始拉片</Button>
          <Link to="/tutorials" className={buttonVariants({ variant: "outline" })}>查看拉片教程</Link>
        </div>
      </header>

      <div className="mt-16 space-y-6">
        {page.sections.map((section) => (
          <SurfaceCard key={section.heading} className="p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-white">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 leading-8 text-text-dim">{paragraph}</p>)}
            {section.items && (
              <ol className="mt-5 space-y-3 text-text-dim">
                {section.items.map((item, index) => <li key={item} className="flex gap-3"><span className="font-mono text-accent">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}
              </ol>
            )}
          </SurfaceCard>
        ))}
      </div>
    </article>
  );
}
