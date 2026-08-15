const LOGS = [
  {
    version: "v0.9.2",
    date: "2026-08-11",
    tag: "新功能",
    tagColor: "text-accent border-accent/30 bg-accent/10",
    items: [
      "编辑器分镜列表支持截图更新与在播放头处分割当前分镜",
      "维度面板新增「参考」词库，每个选项附带场景说明",
      "批注面板移除 AI 分析区域，界面更简洁",
      "支持页面重新设计，移除高额档位，打赏名单实时更新",
    ],
  },
  {
    version: "v0.9.1",
    date: "2026-07-28",
    tag: "优化",
    tagColor: "text-green-400 border-green-500/30 bg-green-500/10",
    items: [
      "编辑器播放控件精简，去掉冗余按钮，居中显示",
      "工具栏图标统一风格，加入文字标签提升可读性",
      "首页功能介绍区删除色彩追踪（待重新设计后上线）",
      "反馈邮箱更新为 aisenhub@163.com",
    ],
  },
  {
    version: "v0.9.0",
    date: "2026-07-10",
    tag: "新功能",
    tagColor: "text-accent border-accent/30 bg-accent/10",
    items: [
      "编辑器全面重构：分镜列表、分析面板、时间线同步",
      "画面标签新增首帧/尾帧/截图三区段",
      "项目文件夹管理上线，支持按作品或主题整理本地拉片项目",
      "编辑器支持项目名称内联编辑",
    ],
  },
  {
    version: "v0.8.5",
    date: "2026-06-18",
    tag: "修复",
    tagColor: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    items: [
      "修复列表 key 缺失导致的 React 警告",
      "修复模板 AIVisual 死代码问题",
      "修复 useEffect 未导入引起的运行时报错",
    ],
  },
  {
    version: "v0.8.0",
    date: "2026-06-01",
    tag: "新功能",
    tagColor: "text-accent border-accent/30 bg-accent/10",
    items: [
      "术语页上线，包含景别、运镜、色调、构图等分类词条",
      "用户中心、项目库设置、快捷键面板",
      "首页新增项目案例展示与理念关键词区块",
      "网站 LOGO 全新 SVG 设计（A 字母 + 光圈环）",
    ],
  },
  {
    version: "v0.7.0",
    date: "2026-05-10",
    tag: "初始版本",
    tagColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    items: [
      "AisenLens 项目库正式上线",
      "基础拉片流程：导入视频 → 分镜 → 批注 → 导出",
      "首页、项目管理、编辑器、支持、反馈页面初版",
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
