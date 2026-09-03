const LOGS = [
  {
    version: "v0.3.0",
    date: "2026-08-30",
    tag: "自动分镜",
    tagColor: "text-accent border-accent/30 bg-accent/10",
    items: [
      "重构自动分镜算法。",
    ],
  },
  {
    version: "v0.2.0",
    date: "2026-08-15",
    tag: "项目重构",
    tagColor: "text-accent border-accent/30 bg-accent/10",
    items: [
      "完成 UI 与项目框架重构。",
      "优化页面结构与开发配置。",
    ],
  },
  {
    version: "v0.1.0",
    date: "2026-07-01",
    tag: "初始版本",
    tagColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    items: [
      "AisenLens 初始版本发布。",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-12">
        <p className="font-mono text-accent/60 text-xs tracking-widest mb-3">CHANGELOG</p>
        <h1 className="font-display font-black text-white mb-3" style={{ fontSize: "clamp(2.4rem,5vw,3.5rem)" }}>
          更新日志
        </h1>
        <p className="text-text-dim leading-relaxed">记录每一次迭代的功能、优化与修复。</p>
      </div>

      <div className="relative flex flex-col gap-0">
        {/* vertical line */}
        <div className="absolute left-[7px] top-2 bottom-0 w-px bg-border" />

        {LOGS.map((log, idx) => (
          <div key={log.version} className="relative flex gap-6 pb-10 last:pb-0">
            {/* dot */}
            <div className="relative z-10 mt-1.5 shrink-0">
              <div className={`w-3.5 h-3.5 rounded-full border-2 ${idx === 0 ? "border-accent bg-accent/40" : "border-border bg-bg"}`} />
            </div>

            <SurfaceCard className="flex-1 min-w-0 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-mono font-bold text-white text-sm">{log.version}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${log.tagColor}`}>{log.tag}</span>
                <span className="text-text-muted text-xs font-mono">{log.date}</span>
              </div>
              <ul className="flex flex-col gap-2">
                {log.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-dim leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-text-muted shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </div>
        ))}
      </div>
    </div>
  );
}
import SurfaceCard from "../components/ui/surface-card";
