import { useEffect, useState } from "react";
import { loadScreenshotUrl } from "../services/screenshotService";

interface ProjectCoverProps {
  screenshotId: string | null;
  title: string;
}

export default function ProjectCover({ screenshotId, title }: ProjectCoverProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let nextUrl: string | null = null;
    void loadScreenshotUrl(screenshotId).then((url) => {
      if (!isActive) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      nextUrl = url;
      setImageUrl(url);
    });
    return () => {
      isActive = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [screenshotId]);

  return <div className="relative h-28 overflow-hidden bg-gradient-to-br from-slate-800 to-zinc-950">
    {imageUrl && <img src={imageUrl} alt={`${title}项目封面`} className="h-full w-full object-cover" />}
    {!imageUrl && <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-black text-white/15">{title.slice(0, 2)}</span>}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
  </div>;
}
