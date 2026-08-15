import { useEffect, useRef, useState } from "react";
import BrandLogo from "../../../components/branding/BrandLogo";
import { Button } from "../../../components/ui/button";

interface LandingContentProps {
  onNavigate: (page: number) => void;
}

/* ── data ── */
const AI_TABS = [
  { id: "cut",      label: "智能镜头切割"    },
  { id: "frame",    label: "逐帧解析"        },
  { id: "report",   label: "拉片报告生成"    },
  { id: "template", label: "分析模板自定义"  },
];

const AI_CONTENT: Record<string, { title: string; desc: string }> = {
  cut: {
    title: "智能分割镜头+手动精准调整",
    desc:  "镜头切换点识别误差小于 2 帧，一键生成可编辑的分镜结构，支持手动拖拽边界精准修正，节省 80% 人工整理时间。",
  },
  frame: {
    title: "精准到帧，捕捉每一个导演决策",
    desc:  "逐帧回放、批注标记、构图辅助线一键叠加，让你看得更快、分析得更深，最低支持 0.01× 超慢速播放。",
  },
  report: {
    title: "一键导出多种格式拉片分析报告",
    desc:  "整合多维度信息，支持导出 PDF / Excel / HTML / MP4 四种格式，满足不同场景需求。",
  },
  template: {
    title: "分析模板高度自定义，想怎么拆就怎么拆",
    desc:  "字段完全自由增删，拖拽排序，从零构建专属分析框架；也可在已有结构上二次修改，一次设置，反复复用。",
  },
};

const PRO_FEATURES = [
  { id: "playback", icon: "▶", label: "逐帧回放",   desc: "支持 0.01× 超慢速播放，精准定格任意帧，方便观察演员微表情与摄影机运动细节。" },
  { id: "annot",    icon: "✦", label: "多维度批注",  desc: "覆盖景别、运动、色调、声音、节奏、叙事功能共六大维度，建立结构化分析体系。" },
  { id: "rhythm",   icon: "≡", label: "节奏图谱",   desc: "将镜头时长映射为节奏曲线，与音乐 BPM 对齐，直观感受剪辑呼吸与情绪节拍。" },
  { id: "mark",     icon: "◈", label: "时间线标记",  desc: "在任意时间点插入书签与批注，支持颜色分类，快速跳转到关键镜头。" },
  { id: "audio",    icon: "♪", label: "音画对齐",   desc: "波形图与分镜条同步展示，分析音乐情绪与镜头切换的精确对应关系。" },
];

const STATS = [
  { zh: "自由",  en: "完全免费，无订阅" },
  { zh: "本地",  en: "数据存储本地，不上云" },
  { zh: "安全",  en: "隐私完全掌控" },
  { zh: "专业",  en: "专业级电影分析工具" },
];

/* ── particle canvas ── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = Math.min(window.innerHeight, 860);
    };
    resize(); window.addEventListener("resize", resize);
    type P = { x:number; y:number; vx:number; vy:number; r:number; a:number };
    const pts: P[] = Array.from({ length: 50 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * 860,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r:  Math.random() * 1.2 + 0.2,
      a:  Math.random() * 0.35 + 0.06,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        p.x = (p.x + p.vx + canvas.width)  % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${p.a})`; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${0.07 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />;
}

/* ── visual previews for AI tabs ── */
function AIVisual({ type }: { type: string }) {
  if (type === "frame") return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-bg-deep relative flex flex-col">
      {/* mock video frame */}
      <div className="flex-1 relative" style={{ background: "#0b1225" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 32% 52%, rgba(59,130,246,0.12) 0%, transparent 55%)" }} />
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 500 260">
          <line x1="250" y1="130" x2="0"   y2="0"   stroke="#3b82f6" strokeWidth="0.7" />
          <line x1="250" y1="130" x2="500" y2="0"   stroke="#3b82f6" strokeWidth="0.7" />
          <line x1="250" y1="130" x2="0"   y2="260" stroke="#3b82f6" strokeWidth="0.7" />
          <line x1="250" y1="130" x2="500" y2="260" stroke="#3b82f6" strokeWidth="0.7" />
          <rect x="210" y="108" width="80" height="44" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
        </svg>
        <div className="absolute inset-0 opacity-8 pointer-events-none"
          style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.15) 1px,transparent 1px)", backgroundSize:"33.33% 33.33%" }} />
        {/* HUD */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-accent/20 bg-accent/10">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-accent font-mono">大远景 · 固定镜头</span>
        </div>
        <div className="absolute bottom-3 right-3 font-mono text-xs text-white/30">00:12:44:08</div>
        <div className="absolute top-3 right-3 text-xs text-white/30 font-mono">F08</div>
      </div>
      {/* annotation row */}
      <div className="border-t border-border px-4 py-3 flex items-center gap-3 shrink-0">
        {["构图·单点透视","色调·冷蓝调","节奏·舒缓","声音·音乐主导"].map((t) => (
          <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-border-mid text-text-dim">{t}</span>
        ))}
      </div>
    </div>
  );

  if (type === "cut") return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-bg-deep flex flex-col gap-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted">自动分镜结构 · 47 个镜头</span>
        <span className="text-xs text-accent font-mono">识别中...</span>
      </div>
      {/* shot strips */}
      <div className="px-4 py-3 flex gap-1.5 flex-wrap">
        {[8,5,12,4,9,6,3,11,7,5,8,6,10,4,7,9,5,8].map((w, i) => (
          <div key={i} className="h-10 rounded relative"
            style={{
              width: `${w * 6}px`,
              flexShrink: 0,
              background: i === 3 || i === 8
                ? "#3b82f6"
                : `hsl(${214},${25+i%3*8}%,${13+i%4*3}%)`,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
            {(i === 3 || i === 8) && <div className="absolute top-0 inset-x-0 h-0.5 bg-white/50 rounded-t" />}
            <span className="absolute bottom-1 left-1 font-mono text-white/30" style={{ fontSize: 8 }}>{i+1}</span>
          </div>
        ))}
      </div>
      {/* table */}
      <div className="flex-1 px-4 flex flex-col gap-1.5 pb-3">
        {[
          { n:"04", type:"近景",   motion:"推镜", dur:"4.1s", color:"暖黄调" },
          { n:"09", type:"特写",   motion:"固定", dur:"2.8s", color:"冷蓝调" },
          { n:"12", type:"大远景", motion:"摇镜", dur:"8.3s", color:"中性"   },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-bg-card">
            <span className="font-mono text-xs text-accent w-5">#{s.n}</span>
            <span className="text-xs text-text-dim w-14">{s.type}</span>
            <span className="text-xs text-text-muted w-12">{s.motion}</span>
            <span className="text-xs text-text-muted w-10 font-mono">{s.dur}</span>
            <span className="text-xs text-text-muted">{s.color}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (type === "report") return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-bg-deep flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">《寄生虫》拉片报告</span>
        <span className="text-xs font-mono text-text-muted">奉俊昊 / 2019</span>
      </div>
      {/* bar chart */}
      <div className="flex items-end gap-2" style={{ height: 80 }}>
        {[
          { l:"大远景", h:20 }, { l:"远景",  h:38 }, { l:"全景",  h:58 },
          { l:"中景",   h:82 }, { l:"近景",  h:67 }, { l:"特写",  h:46 }, { l:"大特写",h:28 },
        ].map((b, i) => (
          <div key={b.l} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full rounded-t" style={{
              height: b.h,
              background: i === 3 ? "#3b82f6" : `rgba(59,130,246,${0.25 + i * 0.07})`,
            }} />
            <span className="text-text-muted" style={{ fontSize: 9 }}>{b.l}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l:"总镜头数", v:"407" }, { l:"平均镜长", v:"3.2s" }, { l:"最长镜头", v:"52s" },
        ].map((s) => (
          <div key={s.l} className="p-3 rounded-xl border border-border bg-bg-card text-center">
            <p className="text-sm font-mono font-semibold text-accent">{s.v}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (type === "template") return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-bg-deep flex flex-col gap-3 p-5">
      {/* header */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold text-white">自定义分析模板</span>
        <span className="text-xs font-mono text-accent px-2 py-0.5 rounded border border-accent/30 bg-accent/10">+ 新建</span>
      </div>

      {/* diagram: field builder */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        {/* template name row */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <span className="text-xs text-accent font-mono font-semibold">我的剧情片模板</span>
          <span className="ml-auto text-xs text-text-muted font-mono">6 字段</span>
        </div>

        {/* field rows */}
        {[
          { icon: "◈", label: "景别标注",   badge: "必填", color: "text-blue-400",   b: "border-blue-500/20 bg-blue-500/5" },
          { icon: "↗", label: "镜头运动",   badge: "必填", color: "text-blue-400",   b: "border-blue-500/20 bg-blue-500/5" },
          { icon: "◑", label: "色调分析",   badge: "可选", color: "text-text-muted", b: "border-border" },
          { icon: "♪", label: "声音设计",   badge: "可选", color: "text-text-muted", b: "border-border" },
          { icon: "✦", label: "叙事功能",   badge: "自定义", color: "text-accent",  b: "border-accent/25 bg-accent/5" },
        ].map((f) => (
          <div key={f.label} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${f.b}`}>
            <span className={`text-sm shrink-0 ${f.color}`}>{f.icon}</span>
            <span className="text-xs text-white flex-1">{f.label}</span>
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${f.color}`}>{f.badge}</span>
            <span className="text-text-muted text-xs cursor-grab">⠿</span>
          </div>
        ))}

        {/* add field button */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-text-muted hover:border-accent/30 hover:text-accent transition-colors cursor-pointer">
          <span className="text-xs">+</span>
          <span className="text-xs">添加自定义字段</span>
        </div>
      </div>

      {/* bottom hint */}
      <div className="shrink-0 flex items-center gap-1.5 text-text-muted">
        <span className="text-xs">⠿</span>
        <span className="text-xs">拖拽排序 · 字段完全自由增删</span>
      </div>
    </div>
  );

  return null;
}

/* ── pro feature right-side visual ── */
function ProVisual({ id }: { id: string }) {
  if (id === "playback") return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <div className="flex items-end gap-px" style={{ height: 64 }}>
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t-sm"
            style={{
              height: `${15 + Math.abs(Math.sin(i * 0.38) * Math.cos(i * 0.09)) * 80}%`,
              background: i < 28 ? `rgba(59,130,246,${0.4 + Math.abs(Math.sin(i*0.38))*0.4})` : "rgba(255,255,255,0.07)",
            }} />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-accent">00:00:22</span>
        <span className="text-text-muted">/ 02:29:00</span>
      </div>
      <div className="flex items-center justify-center gap-4">
        {["⏮","⏪","▶","⏩","⏭"].map((ic, i) => (
          <div key={i} className={`flex items-center justify-center rounded-lg ${i===2?"w-10 h-10 bg-accent text-white":"w-8 h-8 text-text-dim border border-border"}`}>
            {ic}
          </div>
        ))}
      </div>
    </div>
  );

  if (id === "annot") return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
      {[["景别","近景"],["运动","推镜"],["色调","冷蓝"],["声音","音乐"],["节奏","急促"],["叙事","转折"]].map(([k,v]) => (
        <div key={k} className="flex flex-col p-3 rounded-xl border border-border bg-bg-card">
          <span className="text-xs text-text-muted mb-1">{k}</span>
          <span className="text-sm font-medium text-white">{v}</span>
        </div>
      ))}
    </div>
  );

  if (id === "rhythm") return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      {[{ label:"镜头节奏", vals:[3,1,4,1,5,3,2,4,1,3,2,4], c:"rgba(59,130,246,0.6)" },
        { label:"音乐 BPM", vals:[2,2,3,3,4,4,3,3,2,2,3,3], c:"rgba(255,200,50,0.4)" }].map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted w-16 shrink-0">{row.label}</span>
          <div className="flex-1 flex items-end gap-0.5" style={{ height: 36 }}>
            {row.vals.map((v, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${v * 18}%`, background: row.c }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (id === "mark") return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      {[
        { t:"00:03:22", l:"构图精妙 — 单点透视极致运用", c:"bg-accent" },
        { t:"00:08:17", l:"音乐切入 — 情绪转折点",        c:"bg-yellow-500" },
        { t:"00:12:44", l:"特写爆发 — 演员微表情高光",    c:"bg-purple-500" },
      ].map((b) => (
        <div key={b.t} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-bg-card">
          <div className={`w-2 h-2 rounded-full shrink-0 ${b.c}`} />
          <span className="font-mono text-xs text-accent w-16 shrink-0">{b.t}</span>
          <span className="text-xs text-text-dim truncate">{b.l}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <div className="flex items-end gap-px" style={{ height: 40 }}>
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t-sm"
            style={{
              height: `${15 + Math.abs(Math.sin(i * 0.3) * Math.cos(i * 0.09)) * 80}%`,
              background: `rgba(245,158,11,${0.25 + Math.abs(Math.sin(i * 0.3)) * 0.45})`,
            }} />
        ))}
      </div>
      <div className="flex items-end gap-px" style={{ height: 28 }}>
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t-sm"
            style={{
              height: `${10 + Math.abs(Math.sin(i * 0.15)) * 70}%`,
              background: "rgba(59,130,246,0.4)",
            }} />
        ))}
      </div>
      <div className="flex justify-between text-xs font-mono">
        <span className="text-yellow-500/70">♪ 音乐</span>
        <span className="text-accent/70">🎙 人声</span>
      </div>
    </div>
  );
}

/* ── main ── */
export default function LandingContent({ onNavigate }: LandingContentProps) {
  const [aiTab, setAiTab]           = useState("cut");
  const [proFeature, setProFeature] = useState("playback");

  const active = PRO_FEATURES.find((f) => f.id === proFeature)!;

  return (
    <div className="overflow-x-hidden">

      {/* ════════════════ HERO ════════════════ */}
      <section className="relative min-h-[86vh] flex flex-col items-center justify-center overflow-hidden pt-8 pb-20">
        <ParticleCanvas />

        {/* subtle radial spot */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)" }} />

        {/* film strip rails */}
        {[0, 1].map((side) => (
          <div key={side} className={`absolute top-0 bottom-0 w-9 opacity-8 flex flex-col pointer-events-none ${side === 0 ? "left-0 border-r" : "right-0 border-l"} border-white/10`}>
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} className="flex-1 border-b border-white/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-sm bg-white/15" />
              </div>
            ))}
          </div>
        ))}

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-mid text-text-dim text-xs font-mono mb-8 animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            艾申拉片 · AisenLens
          </div>

          {/* headline — solid white, no gradient */}
          <h1 className="font-display font-black leading-none mb-6 animate-fade-up delay-100 text-white"
            style={{ fontSize: "clamp(3.5rem,9vw,8rem)" }}>
            拉片，精确到<br />
            <span className="text-accent">每一帧</span>
          </h1>

          <p className="text-text-dim text-lg mb-10 max-w-xl mx-auto leading-relaxed animate-fade-up delay-200">
            致力于构建创作者心中的理想拉片工具
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap animate-fade-up delay-300">
            <Button type="button" onClick={() => onNavigate(2)}
              className="h-12 rounded-xl bg-accent px-10 font-semibold text-white hover:bg-accent/90 glow-btn">
              免费开始拉片
            </Button>
            <Button type="button" variant="outline" onClick={() => onNavigate(4)}
              className="h-12 rounded-xl border-border-mid px-10 font-semibold text-text-dim hover:border-border hover:bg-white/4 hover:text-white">
              查看教程
            </Button>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-25 pointer-events-none">
          <div className="w-px h-8 bg-text-muted" />
          <span className="text-xs font-mono text-text-muted">SCROLL</span>
        </div>
      </section>

      {/* ════════════════ STATS ════════════════ */}
      <section className="py-14 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.zh} className="flex flex-col items-center text-center gap-1">
              <span className="font-display font-black text-3xl text-white">{s.zh}</span>
              <p className="text-text-muted text-xs leading-relaxed">{s.en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ AI TAB SWITCHER ════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-accent text-xs tracking-widest mb-3 opacity-60">AI FEATURES</p>
            <h2 className="font-display font-black text-white mb-4" style={{ fontSize: "clamp(2.4rem,5vw,4rem)" }}>
              工具赋能，拉片提效 10×
            </h2>
            <p className="text-text-dim max-w-md mx-auto">从智能识别到报告生成，让你专注于分析本身</p>
          </div>

          {/* tab bar */}
          <div className="flex justify-center gap-2 mb-10">
            {AI_TABS.map((tab) => (
              <Button key={tab.id} type="button" variant="outline" onClick={() => setAiTab(tab.id)}
                className={`rounded-full px-6 text-sm font-medium ${
                  aiTab === tab.id
                    ? "bg-accent text-white"
                    : "border border-border text-text-dim hover:text-white hover:border-border-mid"
                }`}>
                {tab.label}
              </Button>
            ))}
          </div>

          {/* content: left text + right preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="flex flex-col gap-6">
              <h3 className="font-display font-bold text-white leading-snug" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
                {AI_CONTENT[aiTab].title}
              </h3>
              <p className="text-text-dim leading-relaxed">{AI_CONTENT[aiTab].desc}</p>
              <Button type="button" onClick={() => onNavigate(2)}
                className="h-11 self-start rounded-xl bg-accent px-7 font-semibold text-white hover:bg-accent/90">
                立即体验 →
              </Button>
            </div>
            <div style={{ height: 340 }}>
              <AIVisual type={aiTab} />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ PRO FEATURE SWITCHER ════════════════
          左列表 + 右大预览（剪映核心交互）
      ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 border-y border-border bg-bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-accent text-xs tracking-widest mb-3 opacity-60">PROFESSIONAL TOOLS</p>
            <h2 className="font-display font-black text-white mb-4" style={{ fontSize: "clamp(2.4rem,5vw,4rem)" }}>
              专业级拉片工具链
            </h2>
            <p className="text-text-dim max-w-md mx-auto">每一个功能，都为深度影视分析而生</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

            {/* left list */}
            <div className="flex flex-col gap-1">
              {PRO_FEATURES.map((f) => {
                const on = proFeature === f.id;
                return (
                  <button key={f.id} onClick={() => setProFeature(f.id)}
                    className={`group w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 ${
                      on ? "border-accent/30 bg-accent/8" : "border-transparent hover:bg-bg-hover hover:border-border"
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-colors border ${
                      on ? "border-accent/30 bg-accent/15 text-accent" : "border-border text-text-muted group-hover:border-border-mid"
                    }`}>
                      {f.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-colors ${on ? "text-white" : "text-text-dim group-hover:text-white"}`}>
                        {f.label}
                      </p>
                      {on && (
                        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{f.desc}</p>
                      )}
                    </div>
                    {on && <div className="w-0.5 h-6 rounded-full bg-accent shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* right preview */}
            <div className="lg:sticky lg:top-20 rounded-2xl border border-border bg-bg-deep overflow-hidden"
              style={{ height: 400 }}>
              <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border border-border bg-bg-card text-accent">
                  {active.icon}
                </div>
                <div className="text-center">
                  <h4 className="font-display font-bold text-2xl text-white mb-2">{active.label}</h4>
                  <p className="text-text-dim text-sm leading-relaxed max-w-xs">{active.desc}</p>
                </div>
                <ProVisual id={proFeature} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ CTA ════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(59,130,246,0.03) 1px, transparent 1.2px)", backgroundSize: "28px 28px" }} />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display font-black text-white mb-6" style={{ fontSize: "clamp(2.6rem,6vw,5rem)", lineHeight: 1.05 }}>
            开始你的<br />电影解构之旅
          </h2>
          <p className="text-text-dim mb-10 text-base max-w-lg mx-auto leading-relaxed">
            核心功能完全免费，即刻开始
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button type="button" onClick={() => onNavigate(2)}
              className="h-13 rounded-xl bg-accent px-12 font-semibold text-white hover:bg-accent/90 glow-btn">
              免费开始拉片
            </Button>
            <Button type="button" variant="outline" onClick={() => onNavigate(4)}
              className="h-13 rounded-xl border-border px-8 font-semibold text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white">
              浏览拉片术语 →
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="border-t border-border bg-bg-panel">
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">

          {/* Top: brand + columns */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-10 md:gap-16 mb-12">

            {/* Brand */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <BrandLogo className="w-8 h-[27px]" />
                <span className="font-display font-black text-lg text-white">艾申拉片</span>
                <span className="text-text-muted text-xs font-mono">AisenLens</span>
              </div>
              <p className="text-text-muted text-sm leading-relaxed max-w-xs">
                AisenLens艾申拉片，一款专注深度研读影片的拉片工具。所有视频解析全部在本地完成，保护素材隐私。支持智能拆解、逐帧控制、个性化模板，搭配AI辅助分析能力。
              </p>
            </div>

            {/* Help — header smaller/dimmer, links larger/brighter */}
            <div className="flex flex-col gap-2">
              <p className="text-white text-sm font-medium mb-1">帮助</p>
              <button onClick={() => onNavigate(6)} className="text-xs text-text-muted hover:text-white transition-colors text-left">反馈</button>
              <button onClick={() => onNavigate(4)} className="text-xs text-text-muted hover:text-white transition-colors text-left">术语</button>
              <button onClick={() => onNavigate(8)} className="text-xs text-text-muted hover:text-white transition-colors text-left">更新日志</button>
              <a href="https://www.bilibili.com" target="_blank" rel="noreferrer"
                className="text-xs text-text-muted hover:text-white transition-colors text-left">使用教程</a>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-2">
              <p className="text-white text-sm font-medium mb-1">条款与隐私</p>
              <button onClick={() => onNavigate(9)} className="text-xs text-text-muted hover:text-white transition-colors text-left">用户协议</button>
              <button onClick={() => onNavigate(10)} className="text-xs text-text-muted hover:text-white transition-colors text-left">隐私政策</button>
            </div>

            {/* Support */}
            <div className="flex flex-col gap-2">
              <p className="text-white text-sm font-medium mb-1">支持</p>
              <button onClick={() => onNavigate(5)} className="text-xs text-text-muted hover:text-white transition-colors text-left">赞助我们</button>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-text-faint text-xs font-mono">© 2026 AisenLens</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onNavigate(9)} className="text-text-faint text-xs hover:text-text-muted transition-colors">用户协议</button>
              <span className="text-text-faint text-xs">·</span>
              <button onClick={() => onNavigate(10)} className="text-text-faint text-xs hover:text-text-muted transition-colors">隐私政策</button>
              <span className="text-text-faint text-xs">·</span>
              <span className="text-text-faint text-xs font-mono">All rights reserved</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
