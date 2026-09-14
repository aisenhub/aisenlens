import { useState } from "react";
import { Button } from "../../../components/ui/button";

const BG = "#080d14";
const C1 = "#3b82f6";

/* ═══════════════════════════════════════════════════
   景别  Shot Size  (7 + 空镜 = 8)
═══════════════════════════════════════════════════ */
const SHOT_SIZES = [
  {
    id: "empty", zh: "空镜", en: "Empty Shot",
    desc: "无人物，纯粹展现环境、物体或自然景观。常用于叙事间隔、情绪渲染或象征表达。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <polygon points="0,70 25,38 50,52 80,22 110,40 120,35 120,70" fill="#102030" />
        <polygon points="0,70 15,45 40,58 75,32 105,48 120,42 120,70" fill="#0c1a28" />
        <circle cx="95" cy="14" r="6" fill="#f59e0b" opacity="0.5" />
        <line x1="88" y1="14" x2="60" y2="14" stroke="#f59e0b" strokeWidth="0.5" opacity="0.2" />
        <line x1="88" y1="14" x2="70" y2="28" stroke="#f59e0b" strokeWidth="0.4" opacity="0.15" />
        <rect x="1" y="1" width="118" height="68" rx="1" fill="none" stroke={C1} strokeWidth="0.5" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "ext", zh: "远景", en: "Extreme Wide",
    desc: "广阔场景主导，人物极小或缺席，建立宏大空间与环境关系。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <polygon points="0,70 30,28 60,50 90,18 120,40 120,70" fill="#1a2f4a" />
        <polygon points="0,70 20,38 45,55 70,30 100,45 120,35 120,70" fill="#112339" />
        <rect x="57" y="59" width="2" height="5" rx="0.5" fill={C1} opacity="0.7" />
        <line x1="40" y1="0" x2="40" y2="70" stroke="#fff" strokeWidth="0.3" opacity="0.06" strokeDasharray="3 2" />
        <line x1="80" y1="0" x2="80" y2="70" stroke="#fff" strokeWidth="0.3" opacity="0.06" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    id: "full", zh: "全景", en: "Full Shot",
    desc: "人物全身入画，头顶脚底留有空间，展现完整动态与环境关系。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <rect x="0" y="62" width="120" height="8" fill="#112339" />
        <circle cx="60" cy="10" r="6" fill="none" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="16" x2="60" y2="46" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="24" x2="50" y2="34" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="24" x2="70" y2="34" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="46" x2="53" y2="60" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="46" x2="67" y2="60" stroke={C1} strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: "medium", zh: "中景", en: "Medium Shot",
    desc: "腰部以上，人物与场景平衡，最接近人眼自然观察，对话场景常用。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="60" cy="16" r="8" fill="none" stroke={C1} strokeWidth="1.5" />
        <path d="M52 24 Q60 32 68 24" fill="none" stroke={C1} strokeWidth="1.5" />
        <rect x="50" y="30" width="20" height="25" rx="3" fill="none" stroke={C1} strokeWidth="1.5" />
        <line x1="50" y1="34" x2="40" y2="48" stroke={C1} strokeWidth="1.5" />
        <line x1="70" y1="34" x2="80" y2="48" stroke={C1} strokeWidth="1.5" />
        <line x1="0" y1="55" x2="120" y2="55" stroke={C1} strokeWidth="0.8" strokeDasharray="4 2" opacity="0.35" />
        <text x="6" y="63" fill={C1} fontSize="7" opacity="0.4" fontFamily="monospace">CUT</text>
      </svg>
    ),
  },
  {
    id: "mcu", zh: "近景", en: "Medium Close-Up",
    desc: "胸部以上，聚焦表情与上半身，情感交流的标准景别。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="60" cy="22" r="14" fill="none" stroke={C1} strokeWidth="1.6" />
        <line x1="54" y1="20" x2="57" y2="20" stroke={C1} strokeWidth="1" opacity="0.8" />
        <line x1="63" y1="20" x2="66" y2="20" stroke={C1} strokeWidth="1" opacity="0.8" />
        <path d="M55 27 Q60 31 65 27" fill="none" stroke={C1} strokeWidth="1" opacity="0.8" />
        <path d="M30 55 Q40 42 60 40 Q80 42 90 55" fill="none" stroke={C1} strokeWidth="1.6" />
        <line x1="0" y1="55" x2="120" y2="55" stroke={C1} strokeWidth="0.8" strokeDasharray="4 2" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "cu", zh: "特写", en: "Close-Up",
    desc: "脸部特写，情绪细节极度放大，传递强烈的情感冲击。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <ellipse cx="60" cy="40" rx="50" ry="55" fill="none" stroke={C1} strokeWidth="1.6" />
        <ellipse cx="44" cy="28" rx="8" ry="5" fill="none" stroke={C1} strokeWidth="1.2" />
        <ellipse cx="76" cy="28" rx="8" ry="5" fill="none" stroke={C1} strokeWidth="1.2" />
        <circle cx="44" cy="28" r="3" fill={C1} opacity="0.5" />
        <circle cx="76" cy="28" r="3" fill={C1} opacity="0.5" />
        <path d="M46 44 Q60 52 74 44" fill="none" stroke={C1} strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: "ecu", zh: "大特写", en: "Extreme Close-Up",
    desc: "单一细节：眼、唇、指尖。极度聚焦制造张力或诗意冲击。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <ellipse cx="60" cy="35" rx="55" ry="30" fill="none" stroke={C1} strokeWidth="1.6" />
        <circle cx="60" cy="35" r="16" fill="none" stroke={C1} strokeWidth="1.4" />
        <circle cx="60" cy="35" r="8" fill={C1} opacity="0.2" />
        <circle cx="60" cy="35" r="3.5" fill={C1} opacity="0.7" />
        <circle cx="63" cy="32" r="1" fill="#fff" opacity="0.6" />
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════
   运镜  Camera Movement  (12)
═══════════════════════════════════════════════════ */
type MoveItem = { id: string; zh: string; en: string; icon: string; color: string; desc: string };
const MOVEMENTS: MoveItem[] = [
  { id: "fixed",   zh: "固定镜头", en: "Fixed Shot",    icon: "⊡", color: "#64748b", desc: "摄影机完全静止，画面稳定庄重，强调主体本身的运动与变化，纪实与仪式感场景常用。" },
  { id: "push",    zh: "推镜头",   en: "Dolly In",      icon: "→", color: C1,        desc: "镜头向主体推进，心理距离拉近，营造紧张感或强调情绪细节。" },
  { id: "pull",    zh: "拉镜头",   en: "Dolly Out",     icon: "←", color: "#818cf8", desc: "镜头远离主体，揭示更大背景环境，常表达孤立、失落或宏观视角。" },
  { id: "track",   zh: "移镜头",   en: "Tracking",      icon: "⟷", color: "#f59e0b", desc: "镜头平行于主体横向移动，展示空间广度与连续动态，追随或并行主体。" },
  { id: "follow",  zh: "跟镜头",   en: "Follow Shot",   icon: "▷", color: "#34d399", desc: "摄影机保持与主体相对固定距离跟随运动，强调主观代入感与动态叙事。" },
  { id: "pan",     zh: "摇镜头",   en: "Pan",           icon: "↔", color: "#38bdf8", desc: "镜头以固定轴水平旋转，追踪移动主体或建立空间内不同元素的关联。" },
  { id: "whip",    zh: "甩镜头",   en: "Whip Pan",      icon: "⤳", color: "#fb923c", desc: "极速摇镜，中间产生动感模糊，常作为快速转场或强调突然事件。" },
  { id: "crane",   zh: "升降镜头", en: "Crane / Jib",   icon: "↑", color: "#f472b6", desc: "镜头垂直升降，从宏观到微观（或反向），常用于开场大气揭示或收尾感叹。" },
  { id: "orbit",   zh: "环绕镜头", en: "Orbit / Arc",   icon: "◎", color: "#a78bfa", desc: "摄影机围绕主体做弧形运动，全方位展现主体或制造时间冻结的英雄感。" },
  { id: "rotate",  zh: "旋转镜头", en: "Dutch / Spin",  icon: "↻", color: "#e879f9", desc: "镜头自身旋转或荷兰角度倾斜，制造心理失衡感、混乱或强烈戏剧张力。" },
  { id: "handheld",zh: "手持镜头", en: "Handheld",      icon: "≋", color: "#fb923c", desc: "摄影机手持，自然抖动带来真实粗粝的临场感，纪录片与写实风格首选。" },
  { id: "through", zh: "穿梭镜头", en: "Pass Through",  icon: "⟼", color: "#06b6d4", desc: "镜头穿过门洞、隧道、窗户等障碍物，衔接两个场景并制造强烈空间转换感。" },
];

function MovementCard({ m }: { m: MoveItem }) {
  const [on, setOn] = useState(false);
  const c = m.color;

  const Diagram = () => {
    switch (m.id) {
      case "fixed": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <rect x="24" y="12" width="72" height="48" rx="2" fill="none" stroke={c} strokeWidth="1.2" opacity="0.8" />
          <line x1="24" y1="36" x2="96" y2="36" stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 2" />
          <line x1="60" y1="12" x2="60" y2="60" stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 2" />
          <circle cx="60" cy="28" r="7" fill="none" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="35" x2="60" y2="50" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="40" x2="53" y2="47" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="40" x2="67" y2="47" stroke={c} strokeWidth="1.3" />
          <circle cx="60" cy="66" r="3" fill={c} opacity="0.3" />
          <line x1="54" y1="68" x2="60" y2="63" stroke={c} strokeWidth="1" opacity="0.3" />
          <line x1="66" y1="68" x2="60" y2="63" stroke={c} strokeWidth="1" opacity="0.3" />
          <line x1="60" y1="68" x2="60" y2="63" stroke={c} strokeWidth="1" opacity="0.3" />
        </svg>
      );
      case "push": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <rect x={on ? 32 : 42} y={on ? 16 : 22} width={on ? 56 : 36} height={on ? 40 : 28}
            rx="2" fill="none" stroke={c} strokeWidth="1"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <circle cx="60" cy={on ? 30 : 33} r={on ? 6 : 4} fill="none" stroke={c} strokeWidth="1.1"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <line x1="60" y1={on ? 36 : 37} x2="60" y2={on ? 50 : 45} stroke={c} strokeWidth="1.1"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <line x1="105" y1="36" x2={on ? 94 : 88} y2="36" stroke={c} strokeWidth="1" opacity="0.5"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <polygon points={`${on?86:80},33 ${on?94:88},36 ${on?86:80},39`} fill={c} opacity="0.5"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <rect x={on ? 99 : 104} y="29" width="14" height="10" rx="1.5" fill="#1e293b" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <circle cx={on ? 106 : 111} cy="34" r="2.5" fill="none" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.7s ease-in-out" }} />
        </svg>
      );
      case "pull": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <rect x={on ? 22 : 36} y={on ? 12 : 22} width={on ? 76 : 48} height={on ? 48 : 28}
            rx="2" fill="none" stroke={c} strokeWidth="1"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <circle cx="60" cy="34" r="5" fill="none" stroke={c} strokeWidth="1.1" />
          <line x1="60" y1="39" x2="60" y2="50" stroke={c} strokeWidth="1.1" />
          <line x1={on ? 20 : 24} y1="36" x2={on ? 28 : 32} y2="36" stroke={c} strokeWidth="1" opacity="0.5"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <polygon points={`${on?22:26},33 ${on?14:18},36 ${on?22:26},39`} fill={c} opacity="0.5"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <rect x={on ? 6 : 10} y="29" width="14" height="10" rx="1.5" fill="#1e293b" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.7s ease-in-out" }} />
          <circle cx={on ? 13 : 17} cy="34" r="2.5" fill="none" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.7s ease-in-out" }} />
        </svg>
      );
      case "track": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          {[8,22,36,50,64,78,92,106].map((x, i) => (
            <line key={i} x1={x} y1="62" x2={x} y2="70" stroke={c} strokeWidth="0.8" opacity="0.2" />
          ))}
          <line x1="4" y1="63" x2="116" y2="63" stroke={c} strokeWidth="0.8" opacity="0.2" />
          <line x1="4" y1="67" x2="116" y2="67" stroke={c} strokeWidth="0.8" opacity="0.2" />
          <circle cx="60" cy="30" r="7" fill="none" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="37" x2="60" y2="54" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="42" x2="54" y2="48" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="42" x2="66" y2="48" stroke={c} strokeWidth="1.3" />
          <rect x={on ? 80 : 8} y="54" width="22" height="10" rx="2" fill="#1e293b" stroke={c} strokeWidth="1"
            style={{ transition: "all 1s ease-in-out" }} />
          <circle cx={on ? 84 : 12} cy="65" r="2.5" fill={c} opacity="0.5"
            style={{ transition: "all 1s ease-in-out" }} />
          <circle cx={on ? 98 : 26} cy="65" r="2.5" fill={c} opacity="0.5"
            style={{ transition: "all 1s ease-in-out" }} />
          <circle cx={on ? 91 : 19} cy="57" r="3" fill="none" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 1s ease-in-out" }} />
        </svg>
      );
      case "follow": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <path d={on ? "M10 50 Q40 20 70 36 Q90 48 110 30" : "M10 36 Q40 36 70 36 Q90 36 110 36"}
            fill="none" stroke={c} strokeWidth="1" strokeDasharray="4 2" opacity="0.3"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <circle cx={on ? 75 : 60} cy={on ? 33 : 36} r="7" fill="none" stroke={c} strokeWidth="1.3"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <line x1={on ? 75 : 60} y1={on ? 40 : 43} x2={on ? 75 : 60} y2={on ? 54 : 57} stroke={c} strokeWidth="1.3"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <polygon points={`${on?75:60},${on?33:36} ${on?68:53},${on?27:30} ${on?82:67},${on?27:30}`}
            fill="none" stroke={c} strokeWidth="0.8" opacity="0.4"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <rect x={on ? 90 : 75} y={on ? 29 : 32} width="14" height="10" rx="1.5" fill="#1e293b" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <circle cx={on ? 97 : 82} cy={on ? 34 : 37} r="2.5" fill="none" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.9s ease-in-out" }} />
        </svg>
      );
      case "pan": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <rect x={on ? 18 : 42} y="20" width="20" height="30" rx="1" fill="#1a2f4a" stroke={c} strokeWidth="0.7" opacity="0.7"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <rect x={on ? 48 : 72} y="26" width="16" height="24" rx="1" fill="#1a2f4a" stroke={c} strokeWidth="0.7" opacity="0.5"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <rect x="30" y="14" width="60" height="44" rx="2" fill="none" stroke={c} strokeWidth="1.2" opacity="0.8" />
          <path d={on ? "M30 10 Q60 2 90 10" : "M90 10 Q60 2 30 10"}
            fill="none" stroke={c} strokeWidth="1" opacity="0.4"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <circle cx="60" cy="58" r="2.5" fill={c} opacity="0.4" />
          <line x1="60" y1="60" x2="50" y2="70" stroke={c} strokeWidth="1" opacity="0.3" />
          <line x1="60" y1="60" x2="70" y2="70" stroke={c} strokeWidth="1" opacity="0.3" />
          <line x1="60" y1="60" x2="60" y2="70" stroke={c} strokeWidth="1" opacity="0.3" />
        </svg>
      );
      case "whip": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          {on && [2,4,6,8].map(k => (
            <rect key={k} x={10+k*2} y={12+k} width={100-k*4} height={48-k*2} rx="2"
              fill="none" stroke={c} strokeWidth="0.4" opacity={0.08} />
          ))}
          <rect x={on ? 70 : 25} y="16" width="25" height="40" rx="2" fill="#1a2f4a" stroke={c} strokeWidth="0.9" opacity="0.8"
            style={{ transition: "all 0.25s ease-in-out" }} />
          <rect x={on ? 25 : 70} y="16" width="25" height="40" rx="2" fill="#0c1a28" stroke={c} strokeWidth="0.9" opacity="0.5"
            style={{ transition: "all 0.25s ease-in-out" }} />
          {on && [1,2,3].map(k => (
            <rect key={k} x={28+k*14} y="16" width="6" height="40" rx="1"
              fill={c} opacity={0.04 - k*0.01} />
          ))}
          <line x1="60" y1="8" x2={on ? 96 : 24} y2="8" stroke={c} strokeWidth="1.2" opacity="0.5"
            style={{ transition: "all 0.25s ease-in-out" }} />
          <polygon points={`${on?92:28},5 ${on?98:22},8 ${on?92:28},11`} fill={c} opacity="0.5"
            style={{ transition: "all 0.25s ease-in-out" }} />
        </svg>
      );
      case "crane": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <line x1="18" y1="68" x2={on ? 96 : 84} y2={on ? 8 : 24} stroke={c} strokeWidth="1.5" opacity="0.35"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <circle cx="18" cy="68" r="4" fill={c} opacity="0.25" />
          <rect x={on ? 90 : 77} y={on ? 2 : 18} width="14" height="10" rx="1.5" fill="#1e293b" stroke={c} strokeWidth="1"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <circle cx={on ? 97 : 84} cy={on ? 7 : 23} r="2.5" fill="none" stroke={c} strokeWidth="1"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <circle cx="45" cy="54" r="5" fill="none" stroke={c} strokeWidth="1.1" opacity="0.5" />
          <line x1="45" y1="59" x2="45" y2="68" stroke={c} strokeWidth="1.1" opacity="0.5" />
          <line x1="97" y1="8" x2="97" y2="30" stroke={c} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.25" />
        </svg>
      );
      case "orbit": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <ellipse cx="60" cy="40" rx="35" ry="18" fill="none" stroke={c} strokeWidth="0.7" opacity="0.3"
            strokeDasharray="3 2" />
          <circle cx="60" cy="32" r="8" fill="none" stroke={c} strokeWidth="1.3" />
          <circle cx="60" cy="26" r="4.5" fill="none" stroke={c} strokeWidth="1" opacity="0.8" />
          <line x1="60" y1="30.5" x2="60" y2="40" stroke={c} strokeWidth="1" />
          <rect
            x={on ? 90 : 24}
            y={on ? 37 : 37}
            width="12" height="9" rx="1.5"
            fill="#1e293b" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 1.2s ease-in-out" }} />
          <circle
            cx={on ? 96 : 30}
            cy={on ? 41.5 : 41.5}
            r="2" fill="none" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 1.2s ease-in-out" }} />
          <line
            x1={on ? 90 : 36} y1={on ? 41.5 : 41.5}
            x2="60" y2="40"
            stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="2 1"
            style={{ transition: "all 1.2s ease-in-out" }} />
        </svg>
      );
      case "rotate": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <g transform={on ? "rotate(-20, 60, 36)" : "rotate(0, 60, 36)"}
            style={{ transition: "all 0.8s ease-in-out", transformOrigin: "60px 36px" }}>
            <rect x="22" y="14" width="76" height="44" rx="2" fill="none" stroke={c} strokeWidth="1.2" opacity="0.8" />
            <line x1="22" y1="36" x2="98" y2="36" stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 2" />
            <circle cx="60" cy="28" r="6" fill="none" stroke={c} strokeWidth="1.2" />
            <line x1="60" y1="34" x2="60" y2="50" stroke={c} strokeWidth="1.2" />
            <line x1="60" y1="39" x2="54" y2="45" stroke={c} strokeWidth="1.2" />
            <line x1="60" y1="39" x2="66" y2="45" stroke={c} strokeWidth="1.2" />
          </g>
          <path d="M88 12 A32 32 0 0 1 96 28" fill="none" stroke={c} strokeWidth="1.2" opacity="0.5" />
          <polygon points="92,27 96,28 94,23" fill={c} opacity="0.5" />
        </svg>
      );
      case "handheld": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          {on && [[-4,-2],[3,3],[-2,4],[4,-3]].map(([dx,dy], i) => (
            <rect key={i} x={33+dx} y={16+dy} width="54" height="40" rx="2" fill="none"
              stroke={c} strokeWidth="0.4" opacity={0.08} />
          ))}
          <rect x={on ? 35 : 33} y={on ? 14 : 16} width="54" height="40" rx="2"
            fill="none" stroke={c} strokeWidth="1.3"
            style={{ transition: "all 0.1s" }} />
          <circle cx="60" cy="30" r="7" fill="none" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="37" x2="60" y2="52" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="43" x2="53" y2="49" stroke={c} strokeWidth="1.3" />
          <line x1="60" y1="43" x2="67" y2="49" stroke={c} strokeWidth="1.3" />
        </svg>
      );
      case "through": return (
        <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}>
          <rect width="120" height="72" fill={BG} />
          <rect x="0" y="0" width="42" height="72" fill="#0a141e" />
          <rect x="78" y="0" width="42" height="72" fill="#0a141e" />
          <rect x="42" y="0" width="36" height="72" fill="#0d1a28" />
          <rect x="46" y="4" width="28" height="64" rx="1" fill="none" stroke={c} strokeWidth="1" opacity="0.5" />
          <rect x="0" y="0" width="42" height="72" fill="none" stroke={c} strokeWidth="0.5" opacity="0.2" />
          <rect x="78" y="0" width="42" height="72" fill="none" stroke={c} strokeWidth="0.5" opacity="0.2" />
          <rect x={on ? 86 : 2} y="29" width="12" height="9" rx="1.5" fill="#1e293b" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.9s ease-in-out" }} />
          <circle cx={on ? 92 : 8} cy="33.5" r="2" fill="none" stroke={c} strokeWidth="0.9"
            style={{ transition: "all 0.9s ease-in-out" }} />
          {on && <line x1="4" y1="33.5" x2="44" y2="33.5" stroke={c} strokeWidth="0.5" opacity="0.3" strokeDasharray="3 2" />}
        </svg>
      );
      default: return <svg viewBox="0 0 120 72" style={{ width: "100%", height: "100%" }}><rect width="120" height="72" fill={BG} /></svg>;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-bg-card overflow-hidden hover:border-accent/30 transition-colors">
      <div className="relative bg-bg-deep border-b border-border cursor-pointer select-none"
        style={{ height: 90 }} onClick={() => setOn(v => !v)} title="点击切换演示">
        <div style={{ width: "100%", height: "100%" }}><Diagram /></div>
        <div className="absolute bottom-1.5 right-2">
          <span className="text-xs font-mono" style={{ color: c, opacity: 0.6 }}>
            {on ? "▐▐ 暂停" : "▶ 演示"}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-base font-bold" style={{ color: c }}>{m.icon}</span>
          <h3 className="font-display font-bold text-base text-white">{m.zh}</h3>
          <span className="font-mono text-xs text-text-muted">{m.en}</span>
        </div>
        <p className="text-text-muted text-xs leading-relaxed">{m.desc}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   构图  Composition  (8)
═══════════════════════════════════════════════════ */
const COMPOSITIONS = [
  {
    id: "center", zh: "中心构图", en: "Center Frame",
    desc: "主体居于画面正中，强调权威感、仪式感与稳定性。库布里克的标志用法，配合单点透视极为震撼。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <line x1="60" y1="0" x2="60" y2="70" stroke={C1} strokeWidth="0.5" opacity="0.25" strokeDasharray="3 2" />
        <line x1="0" y1="35" x2="120" y2="35" stroke={C1} strokeWidth="0.5" opacity="0.25" strokeDasharray="3 2" />
        <rect x="18" y="10" width="84" height="50" rx="1" fill="none" stroke={C1} strokeWidth="0.5" opacity="0.15" />
        <rect x="34" y="20" width="52" height="30" rx="1" fill="none" stroke={C1} strokeWidth="0.5" opacity="0.15" />
        <circle cx="60" cy="27" r="6" fill="none" stroke={C1} strokeWidth="1.3" />
        <line x1="60" y1="33" x2="60" y2="50" stroke={C1} strokeWidth="1.3" />
        <line x1="60" y1="39" x2="53" y2="46" stroke={C1} strokeWidth="1.3" />
        <line x1="60" y1="39" x2="67" y2="46" stroke={C1} strokeWidth="1.3" />
        <circle cx="60" cy="35" r="2" fill={C1} opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "sym", zh: "对称构图", en: "Symmetry",
    desc: "左右或上下画面完全对称，传递均衡感与仪式美。常见于建筑、廊道、倒影场景，安德森·韦斯最爱。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <rect x="10" y="8" width="100" height="54" rx="1" fill="none" stroke={C1} strokeWidth="0.5" opacity="0.2" />
        <line x1="60" y1="8" x2="60" y2="62" stroke={C1} strokeWidth="0.6" opacity="0.35" strokeDasharray="3 2" />
        <rect x="14" y="12" width="16" height="48" fill="#112030" />
        <rect x="90" y="12" width="16" height="48" fill="#112030" />
        <rect x="30" y="20" width="12" height="32" fill="#1a2f4a" opacity="0.8" />
        <rect x="78" y="20" width="12" height="32" fill="#1a2f4a" opacity="0.8" />
        <rect x="46" y="28" width="8" height="24" fill="#1e3a5f" opacity="0.6" />
        <rect x="66" y="28" width="8" height="24" fill="#1e3a5f" opacity="0.6" />
        <circle cx="60" cy="30" r="5" fill="none" stroke={C1} strokeWidth="1.2" />
        <line x1="60" y1="35" x2="60" y2="48" stroke={C1} strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: "lead", zh: "引导线构图", en: "Leading Lines",
    desc: "利用道路、栏杆、视线、光束等将观众目光引向主体或消失点，强化空间纵深与视觉动势。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <line x1="10" y1="70" x2="60" y2="28" stroke={C1} strokeWidth="1" opacity="0.5" />
        <line x1="110" y1="70" x2="60" y2="28" stroke={C1} strokeWidth="1" opacity="0.5" />
        <line x1="0" y1="55" x2="60" y2="28" stroke={C1} strokeWidth="0.6" opacity="0.25" />
        <line x1="120" y1="55" x2="60" y2="28" stroke={C1} strokeWidth="0.6" opacity="0.25" />
        <line x1="30" y1="70" x2="60" y2="28" stroke={C1} strokeWidth="0.6" opacity="0.2" />
        <line x1="90" y1="70" x2="60" y2="28" stroke={C1} strokeWidth="0.6" opacity="0.2" />
        <circle cx="60" cy="26" r="4.5" fill={C1} opacity="0.6" />
        <circle cx="60" cy="26" r="9" fill="none" stroke={C1} strokeWidth="0.8" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "framein", zh: "框架构图", en: "Frame in Frame",
    desc: "利用门洞、窗框、拱门、树枝等自然元素形成第二层画框，聚焦主体并增加层次与叙事深度。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <rect x="1" y="1" width="118" height="68" rx="1" fill="none" stroke={C1} strokeWidth="0.8" opacity="0.5" />
        <rect x="16" y="8" width="88" height="54" rx="1" fill="none" stroke={C1} strokeWidth="1.2" opacity="0.8" />
        <rect x="32" y="18" width="56" height="34" rx="1" fill="#0d1a28" />
        <circle cx="60" cy="33" r="7" fill="none" stroke={C1} strokeWidth="1.2" />
        <circle cx="60" cy="27" r="4" fill="none" stroke={C1} strokeWidth="1" opacity="0.8" />
        <line x1="60" y1="31" x2="60" y2="40" stroke={C1} strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "diag", zh: "对角线构图", en: "Diagonal",
    desc: "斜线打破画面均衡，传递动感、张力与不稳定性，常见于追逐、对峙、爆炸等高能场景。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <line x1="0" y1="70" x2="120" y2="0" stroke={C1} strokeWidth="1.5" opacity="0.6" />
        <line x1="0" y1="50" x2="80" y2="0" stroke={C1} strokeWidth="0.7" opacity="0.25" />
        <line x1="40" y1="70" x2="120" y2="20" stroke={C1} strokeWidth="0.7" opacity="0.25" />
        <circle cx="90" cy="14" r="7" fill="none" stroke={C1} strokeWidth="1.3" />
        <circle cx="90" cy="8" r="4" fill="none" stroke={C1} strokeWidth="1" opacity="0.8" />
        <line x1="90" y1="12" x2="90" y2="22" stroke={C1} strokeWidth="1" />
        <circle cx="28" cy="56" r="6" fill="none" stroke={C1} strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "thirds", zh: "三分法构图", en: "Rule of Thirds",
    desc: "画面横竖各三等分，主体置于交叉点，产生平衡且富有活力的视觉张力。最基础、最广泛的构图法则。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <line x1="40" y1="0" x2="40" y2="70" stroke={C1} strokeWidth="0.6" opacity="0.35" />
        <line x1="80" y1="0" x2="80" y2="70" stroke={C1} strokeWidth="0.6" opacity="0.35" />
        <line x1="0" y1="23" x2="120" y2="23" stroke={C1} strokeWidth="0.6" opacity="0.35" />
        <line x1="0" y1="47" x2="120" y2="47" stroke={C1} strokeWidth="0.6" opacity="0.35" />
        <circle cx="40" cy="23" r="3.5" fill={C1} opacity="0.85" />
        <circle cx="80" cy="23" r="3" fill={C1} opacity="0.35" />
        <circle cx="40" cy="47" r="3" fill={C1} opacity="0.35" />
        <circle cx="80" cy="47" r="3" fill={C1} opacity="0.35" />
        <circle cx="40" cy="16" r="4" fill="none" stroke={C1} strokeWidth="1" opacity="0.7" />
        <line x1="40" y1="20" x2="40" y2="30" stroke={C1} strokeWidth="1" opacity="0.7" />
        <line x1="40" y1="24" x2="34" y2="29" stroke={C1} strokeWidth="1" opacity="0.7" />
        <line x1="40" y1="24" x2="46" y2="29" stroke={C1} strokeWidth="1" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: "negative", zh: "留白构图", en: "Negative Space",
    desc: "主体周围保留大量空白，令画面「呼吸」，烘托孤独、渺小、沉默或思索的情绪氛围。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="24" cy="54" r="9" fill="none" stroke={C1} strokeWidth="1.4" />
        <circle cx="24" cy="47" r="5" fill="none" stroke={C1} strokeWidth="1.2" opacity="0.8" />
        <line x1="24" y1="52" x2="24" y2="63" stroke={C1} strokeWidth="1.2" />
        <line x1="24" y1="57" x2="18" y2="63" stroke={C1} strokeWidth="1.2" />
        <line x1="24" y1="57" x2="30" y2="63" stroke={C1} strokeWidth="1.2" />
        <text x="70" y="38" textAnchor="middle" fill={C1} fontSize="28" fontFamily="monospace" opacity="0.05">∞</text>
      </svg>
    ),
  },
  {
    id: "fg", zh: "前景构图", en: "Foreground Depth",
    desc: "在镜头前放置虚焦的前景物体，增加层次感与纵深感，制造偷窥视角或强烈临场感。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <rect x="28" y="18" width="64" height="40" rx="1" fill="#0d1a28" opacity="0.5" />
        <circle cx="60" cy="36" r="7" fill="none" stroke={C1} strokeWidth="1.2" />
        <circle cx="60" cy="30" r="4" fill="none" stroke={C1} strokeWidth="1" opacity="0.8" />
        <line x1="60" y1="34" x2="60" y2="44" stroke={C1} strokeWidth="1" />
        <ellipse cx="14" cy="58" rx="18" ry="22" fill="#0d1520" opacity="0.88" />
        <ellipse cx="106" cy="60" rx="20" ry="22" fill="#0d1520" opacity="0.88" />
        <ellipse cx="7" cy="20" rx="14" ry="28" fill="#0d1520" opacity="0.75" />
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════
   机位  Camera Position  (4)
═══════════════════════════════════════════════════ */
const POSITIONS = [
  {
    id: "front", zh: "正面机位", en: "Front",
    desc: "摄影机正对主体，直接展现面部表情，强调坦诚与对抗，或创造「注视观众」的间离效果。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="60" cy="24" r="10" fill="none" stroke={C1} strokeWidth="1.4" />
        <line x1="55" y1="22" x2="58" y2="22" stroke={C1} strokeWidth="1" opacity="0.8" />
        <line x1="62" y1="22" x2="65" y2="22" stroke={C1} strokeWidth="1" opacity="0.8" />
        <path d="M56 29 Q60 33 64 29" fill="none" stroke={C1} strokeWidth="1" opacity="0.8" />
        <line x1="60" y1="34" x2="60" y2="52" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="40" x2="50" y2="46" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="40" x2="70" y2="46" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="54" y2="62" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="66" y2="62" stroke={C1} strokeWidth="1.4" />
        <rect x="32" y="60" width="18" height="8" rx="1" fill="#1e293b" stroke={C1} strokeWidth="0.8" />
        <circle cx="41" cy="64" r="2" fill="none" stroke={C1} strokeWidth="0.7" />
        <line x1="41" y1="60" x2="41" y2="52" stroke={C1} strokeWidth="0.7" strokeDasharray="2 1" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "back", zh: "背面机位", en: "Rear",
    desc: "拍摄主体背面，隐藏面部、制造神秘感，让观众与主体同方向审视世界，代入感强。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="60" cy="24" r="10" fill="#0d1a28" stroke={C1} strokeWidth="1.4" />
        <path d="M50 34 Q60 30 70 34" fill="none" stroke={C1} strokeWidth="1.3" />
        <line x1="60" y1="34" x2="60" y2="52" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="40" x2="50" y2="46" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="40" x2="70" y2="46" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="54" y2="62" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="66" y2="62" stroke={C1} strokeWidth="1.4" />
        <rect x="76" y="60" width="18" height="8" rx="1" fill="#1e293b" stroke={C1} strokeWidth="0.8" />
        <circle cx="85" cy="64" r="2" fill="none" stroke={C1} strokeWidth="0.7" />
        <line x1="85" y1="60" x2="70" y2="52" stroke={C1} strokeWidth="0.7" strokeDasharray="2 1" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "side", zh: "侧面机位", en: "Side / Profile",
    desc: "90度侧面拍摄，完整呈现轮廓线条，常见于对话剪辑的反打镜头与跑动追逐场景。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="60" cy="22" r="10" fill="none" stroke={C1} strokeWidth="1.4" />
        <circle cx="63" cy="20" r="1.5" fill={C1} opacity="0.6" />
        <path d="M64 24 Q67 26 65 29" fill="none" stroke={C1} strokeWidth="1" />
        <line x1="60" y1="32" x2="60" y2="52" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="38" x2="48" y2="44" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="38" x2="68" y2="36" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="52" y2="62" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="66" y2="62" stroke={C1} strokeWidth="1.4" />
        <rect x="14" y="59" width="18" height="8" rx="1" fill="#1e293b" stroke={C1} strokeWidth="0.8" />
        <circle cx="23" cy="63" r="2" fill="none" stroke={C1} strokeWidth="0.7" />
        <line x1="32" y1="63" x2="48" y2="50" stroke={C1} strokeWidth="0.7" strokeDasharray="2 1" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "qtr", zh: "斜侧面机位", en: "3/4 View",
    desc: "约45度斜侧角度，兼顾面部细节与轮廓层次，是电影叙事中最常用的自然角度。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="62" cy="22" r="10" fill="none" stroke={C1} strokeWidth="1.4" />
        <circle cx="66" cy="20" r="1.5" fill={C1} opacity="0.6" />
        <line x1="58" y1="21" x2="61" y2="21" stroke={C1} strokeWidth="0.9" opacity="0.7" />
        <path d="M60 27 Q63 30 67 27" fill="none" stroke={C1} strokeWidth="1" />
        <line x1="62" y1="32" x2="60" y2="52" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="38" x2="50" y2="44" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="38" x2="70" y2="42" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="53" y2="62" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="52" x2="67" y2="62" stroke={C1} strokeWidth="1.4" />
        <rect x="22" y="60" width="18" height="8" rx="1" fill="#1e293b" stroke={C1} strokeWidth="0.8" />
        <circle cx="31" cy="64" r="2" fill="none" stroke={C1} strokeWidth="0.7" />
        <line x1="40" y1="64" x2="50" y2="52" stroke={C1} strokeWidth="0.7" strokeDasharray="2 1" opacity="0.4" />
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════
   转场  Transitions  (grouped)
═══════════════════════════════════════════════════ */
type TransItem = { id: string; zh: string; en: string; group: string; desc: string; visual: React.ReactNode };
const TRANSITIONS: TransItem[] = [
  {
    id: "cut", zh: "硬切", en: "Hard Cut", group: "静态",
    desc: "两镜头直接相接，无过渡，节奏干净利落，是最常见的剪辑方式。",
    visual: (
      <div className="flex items-center gap-0">
        <div className="flex-1 h-10 rounded-l bg-blue-900/50 border border-border flex items-center justify-center text-xs font-mono text-accent">A</div>
        <div className="w-0.5 h-10 bg-accent shrink-0" />
        <div className="flex-1 h-10 rounded-r bg-violet-900/50 border border-border flex items-center justify-center text-xs font-mono text-violet-400">B</div>
      </div>
    ),
  },
  {
    id: "emptytrans", zh: "空镜转场", en: "Cutaway", group: "静态",
    desc: "通过插入一个空镜头（景物、物件）来过渡两个场景，叙事缓冲，时空感跳跃流畅。",
    visual: (
      <div className="flex items-center gap-1">
        <div className="flex-1 h-10 rounded bg-blue-900/40 border border-border flex items-center justify-center text-xs font-mono text-accent">A</div>
        <div className="w-10 h-10 rounded border border-border bg-bg-deep flex items-center justify-center text-lg">🌿</div>
        <div className="flex-1 h-10 rounded bg-violet-900/40 border border-border flex items-center justify-center text-xs font-mono text-violet-400">B</div>
      </div>
    ),
  },
  {
    id: "match", zh: "动作匹配转场", en: "Match Cut",
    group: "动态",
    desc: "两个镜头在动作或构图上形成视觉呼应，流畅衔接。库布里克「骨头→太空船」是经典案例。",
    visual: (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-10 rounded bg-blue-900/40 border border-border flex items-center justify-center">
          <svg viewBox="0 0 30 16" style={{ width: 32, height: 18 }}>
            <ellipse cx="15" cy="8" rx="9" ry="4" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="text-accent text-sm font-mono font-bold">≈</span>
        <div className="flex-1 h-10 rounded bg-violet-900/40 border border-border flex items-center justify-center">
          <svg viewBox="0 0 30 16" style={{ width: 32, height: 18 }}>
            <ellipse cx="15" cy="8" rx="9" ry="4" fill="none" stroke="#818cf8" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    ),
  },
  {
    id: "eyeline", zh: "视线匹配转场", en: "Eyeline Match", group: "动态",
    desc: "人物望向某方向，切换到其所见场景，制造强烈因果感与心理连续性。",
    visual: (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-10 rounded bg-blue-900/40 border border-border flex items-center justify-center">
          <svg viewBox="0 0 40 20" style={{ width: 44, height: 22 }}>
            <circle cx="10" cy="10" r="7" fill="none" stroke="#3b82f6" strokeWidth="1.4" />
            <circle cx="10" cy="10" r="3" fill="#3b82f6" opacity="0.5" />
            <line x1="16" y1="10" x2="38" y2="10" stroke="#3b82f6" strokeWidth="1" opacity="0.5" strokeDasharray="3 2" />
            <polygon points="36,7 40,10 36,13" fill="#3b82f6" opacity="0.5" />
          </svg>
        </div>
        <div className="flex-1 h-10 rounded bg-violet-900/40 border border-border flex items-center justify-center text-violet-400 text-xs">👁</div>
      </div>
    ),
  },
  {
    id: "color", zh: "色彩匹配转场", en: "Color Match", group: "动态",
    desc: "前后两个镜头共享相似的主色调或某一显眼色块，形成视觉连接。",
    visual: (
      <div className="flex items-center gap-1">
        <div className="flex-1 h-10 rounded border border-border" style={{ background: "linear-gradient(135deg, #1e3a5f, #f59e0b)" }} />
        <div className="w-px h-6 bg-border" />
        <div className="flex-1 h-10 rounded border border-border" style={{ background: "linear-gradient(135deg, #f59e0b, #7c3aed)" }} />
      </div>
    ),
  },
  {
    id: "occlude", zh: "遮挡转场", en: "Wipe / Occlude", group: "动态",
    desc: "前景物体（人、物件、阴影）划过镜头，遮挡画面后切换到下一场景，时空感强。",
    visual: (
      <div className="relative flex items-center gap-0 overflow-hidden" style={{ height: 40 }}>
        <div className="flex-1 h-10 rounded-l bg-blue-900/40 border border-border flex items-center justify-center text-xs font-mono text-accent">A</div>
        <div className="absolute left-1/3 w-6 h-10 bg-bg-panel border-x border-border" style={{ zIndex: 2 }} />
        <div className="flex-1 h-10 rounded-r bg-violet-900/40 border border-border flex items-center justify-center text-xs font-mono text-violet-400">B</div>
      </div>
    ),
  },
  {
    id: "move", zh: "运镜转场", en: "Move Through", group: "动态",
    desc: "利用摄影机的运动（如旋转、推进）无缝连接两个场景，空间上的连续运动感极强。",
    visual: (
      <div className="flex items-center gap-1 h-10">
        <div className="flex-1 h-10 rounded bg-blue-900/40 border border-border flex items-center justify-center text-xs font-mono text-accent">A</div>
        <div className="w-8 flex items-center justify-center text-accent text-sm font-bold">→→</div>
        <div className="flex-1 h-10 rounded bg-violet-900/40 border border-border flex items-center justify-center text-xs font-mono text-violet-400">B</div>
      </div>
    ),
  },
  {
    id: "defocus", zh: "虚焦转场", en: "Defocus / Rack Focus", group: "动态",
    desc: "焦点由清晰变模糊（或反向），在虚焦状态下切换场景，优雅地模糊时空边界。",
    visual: (
      <div className="flex items-center gap-1 h-10">
        <div className="flex-1 h-10 rounded border border-border bg-blue-900/40 flex items-center justify-center">
          <span className="text-accent text-xs font-mono" style={{ filter: "blur(0px)" }}>清晰</span>
        </div>
        <div className="flex-1 h-10 rounded border border-border bg-violet-900/20 flex items-center justify-center">
          <span className="text-violet-400 text-xs font-mono" style={{ filter: "blur(2px)" }}>模糊</span>
        </div>
      </div>
    ),
  },
  {
    id: "sound", zh: "声音转场", en: "Sound Bridge", group: "动态",
    desc: "下一场景的声音提前出现于当前画面（或当前声音延续到下一画面），声画错位引导注意力流动。",
    visual: (
      <div className="flex flex-col gap-1 h-10 w-full">
        <div className="flex gap-0">
          <div className="w-3/5 h-3.5 rounded-l bg-blue-900/60 border border-border" />
          <div className="w-2/5 h-3.5 rounded-r bg-violet-900/60 border border-border" />
        </div>
        <div className="flex gap-0">
          <div className="w-2/5 h-3.5 rounded-l bg-blue-900/30 border border-dashed border-border" />
          <div className="w-3/5 h-3.5 rounded-r bg-violet-900/40 border border-dashed border-border" />
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-accent" style={{ fontSize: 9 }}>VIDEO</span><span className="text-violet-400" style={{ fontSize: 9 }}>AUDIO</span>
        </div>
      </div>
    ),
  },
  {
    id: "fade", zh: "淡入 / 淡出", en: "Fade In / Out", group: "特效",
    desc: "画面从黑暗逐渐出现（淡入）或逐渐消失为黑暗（淡出），常用于章节开始或结束，节奏缓慢庄重。",
    visual: (
      <div className="flex items-center gap-0 h-10 rounded overflow-hidden border border-border">
        <div className="w-8 h-full" style={{ background: "linear-gradient(to right, #000, #1a2f4a)" }} />
        <div className="flex-1 h-full bg-blue-900/50 flex items-center justify-center text-xs font-mono text-accent">SCENE</div>
        <div className="w-8 h-full" style={{ background: "linear-gradient(to right, #1a2f4a, #000)" }} />
      </div>
    ),
  },
  {
    id: "dissolve", zh: "叠化", en: "Dissolve", group: "特效",
    desc: "前镜头渐出同时后镜头渐入，两者短暂叠合，暗示时间流逝或情绪的自然过渡。",
    visual: (
      <div className="relative flex items-center h-10">
        <div className="absolute left-0 w-3/5 h-10 rounded bg-blue-900/50 border border-border flex items-center justify-center text-xs font-mono text-accent">A</div>
        <div className="absolute right-0 w-3/5 h-10 rounded bg-violet-900/50 border border-border flex items-center justify-center text-xs font-mono text-violet-400 opacity-70">B</div>
        <div className="absolute inset-x-1/5 h-10 rounded"
          style={{ background: "linear-gradient(90deg,rgba(59,130,246,0.25),rgba(139,92,246,0.25))" }} />
      </div>
    ),
  },
  {
    id: "flash", zh: "闪白 / 闪黑", en: "Flash Cut", group: "特效",
    desc: "镜头切换间插入极短的全白或全黑帧，制造视觉冲击感、记忆闪回或强烈的情绪刺激。",
    visual: (
      <div className="flex items-center gap-0 h-10 rounded overflow-hidden border border-border">
        <div className="flex-1 h-10 bg-blue-900/40 flex items-center justify-center text-xs font-mono text-accent">A</div>
        <div className="w-3 h-10 bg-white opacity-90" />
        <div className="flex-1 h-10 bg-violet-900/40 flex items-center justify-center text-xs font-mono text-violet-400">B</div>
      </div>
    ),
  },
];

/* ═══════════════════════════════════════════════════
   角度  Shooting Angle  (3: 平拍/仰拍/俯拍)
═══════════════════════════════════════════════════ */
const ANGLES = [
  {
    id: "eye", zh: "平拍", en: "Eye Level",
    desc: "摄影机与主体眼部同高，最接近正常人视角，客观中性，营造真实感与平等关系，是最常用的基础角度。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <line x1="0" y1="26" x2="120" y2="26" stroke={C1} strokeWidth="0.7" strokeDasharray="4 2" opacity="0.35" />
        <circle cx="60" cy="22" r="8" fill="none" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="30" x2="60" y2="50" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="37" x2="51" y2="44" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="37" x2="69" y2="44" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="50" x2="54" y2="60" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="50" x2="66" y2="60" stroke={C1} strokeWidth="1.4" />
        <rect x="16" y="20" width="12" height="8" rx="1" fill="#1e293b" stroke={C1} strokeWidth="0.9" />
        <circle cx="22" cy="24" r="2" fill="none" stroke={C1} strokeWidth="0.8" />
        <line x1="28" y1="24" x2="52" y2="24" stroke={C1} strokeWidth="0.6" opacity="0.35" strokeDasharray="2 1" />
        <text x="13" y="38" fill={C1} fontSize="7" opacity="0.5" fontFamily="monospace">EYE</text>
      </svg>
    ),
  },
  {
    id: "low", zh: "仰拍", en: "Low Angle",
    desc: "摄影机低于主体仰角拍摄，赋予主体权威感、力量感与压迫感，常用于英雄或反派的登场时刻。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <line x1="10" y1="62" x2="110" y2="62" stroke={C1} strokeWidth="0.5" opacity="0.2" />
        <circle cx="60" cy="20" r="8" fill="none" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="28" x2="60" y2="48" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="36" x2="50" y2="44" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="36" x2="70" y2="44" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="48" x2="53" y2="58" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="48" x2="67" y2="58" stroke={C1} strokeWidth="1.4" />
        <rect x="38" y="60" width="12" height="8" rx="1" fill="#1e293b" stroke={C1} strokeWidth="0.9" />
        <circle cx="44" cy="64" r="2" fill="none" stroke={C1} strokeWidth="0.8" />
        <line x1="44" y1="60" x2="54" y2="44" stroke={C1} strokeWidth="0.6" opacity="0.35" strokeDasharray="2 1" />
        <text x="20" y="68" fill={C1} fontSize="7" opacity="0.5" fontFamily="monospace">↑ CAM</text>
      </svg>
    ),
  },
  {
    id: "high", zh: "俯拍", en: "High Angle",
    desc: "摄影机高于主体俯角拍摄，使主体显得渺小、脆弱或被审视，营造全知视角与压抑感。",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <rect x="38" y="2" width="12" height="8" rx="1" fill="#1e293b" stroke={C1} strokeWidth="0.9" />
        <circle cx="44" cy="6" r="2" fill="none" stroke={C1} strokeWidth="0.8" />
        <line x1="44" y1="10" x2="56" y2="26" stroke={C1} strokeWidth="0.6" opacity="0.35" strokeDasharray="2 1" />
        <circle cx="60" cy="34" r="7" fill="none" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="41" x2="60" y2="56" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="46" x2="52" y2="52" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="46" x2="68" y2="52" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="56" x2="54" y2="65" stroke={C1} strokeWidth="1.4" />
        <line x1="60" y1="56" x2="66" y2="65" stroke={C1} strokeWidth="1.4" />
        <text x="20" y="14" fill={C1} fontSize="7" opacity="0.5" fontFamily="monospace">↓ CAM</text>
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════
   光线  Lighting  (5)
═══════════════════════════════════════════════════ */
const LIGHTINGS = [
  {
    id: "natural", zh: "自然光", en: "Natural Light",
    desc: "完全利用太阳、天空等环境光，无人工补光，还原真实氛围，常见于纪录片与写实剧情片。",
    color: "#f59e0b",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <circle cx="92" cy="12" r="7" fill="#f59e0b" opacity="0.45" />
        {[0,40,80,120,160,200,240,280].map((a, i) => (
          <line key={i}
            x1={92 + Math.cos(a*Math.PI/180)*9} y1={12 + Math.sin(a*Math.PI/180)*9}
            x2={92 + Math.cos(a*Math.PI/180)*14} y2={12 + Math.sin(a*Math.PI/180)*14}
            stroke="#f59e0b" strokeWidth="1" opacity="0.35" />
        ))}
        <line x1="92" y1="19" x2="60" y2="28" stroke="#f59e0b" strokeWidth="0.5" opacity="0.2" />
        <line x1="92" y1="19" x2="50" y2="30" stroke="#f59e0b" strokeWidth="0.5" opacity="0.15" />
        <circle cx="60" cy="30" r="8" fill="none" stroke="#d1a054" strokeWidth="1.4" />
        <line x1="60" y1="38" x2="60" y2="54" stroke="#d1a054" strokeWidth="1.4" />
        <line x1="60" y1="44" x2="52" y2="50" stroke="#d1a054" strokeWidth="1.4" />
        <line x1="60" y1="44" x2="68" y2="50" stroke="#d1a054" strokeWidth="1.4" />
        <rect x="0" y="62" width="120" height="8" fill="#1a0f05" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "top", zh: "顶光", en: "Top Light",
    desc: "光源从正上方直射，在眼窝与鼻下形成强烈阴影，制造神秘感、压迫感或超自然氛围。",
    color: "#f0f0f0",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        {[54,58,62,66].map(x => (
          <line key={x} x1={x} y1="2" x2={x} y2="18" stroke="#e5e7eb" strokeWidth="0.6" opacity="0.4" />
        ))}
        <rect x="48" y="0" width="24" height="3" rx="1" fill="#374151" />
        <circle cx="60" cy="26" r="9" fill="#0d1520" stroke="#9ca3af" strokeWidth="1.3" />
        <ellipse cx="60" cy="22" rx="3" ry="2" fill="#9ca3af" opacity="0.4" />
        <ellipse cx="55" cy="30" rx="2" ry="1" fill="#111827" />
        <ellipse cx="65" cy="30" rx="2" ry="1" fill="#111827" />
        <line x1="60" y1="35" x2="60" y2="55" stroke="#6b7280" strokeWidth="1.3" />
        <line x1="60" y1="42" x2="52" y2="49" stroke="#6b7280" strokeWidth="1.3" />
        <line x1="60" y1="42" x2="68" y2="49" stroke="#6b7280" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    id: "bottom", zh: "底光", en: "Under Light",
    desc: "光源从下方向上照射，产生鬼影效果，制造恐怖、邪恶或滑稽感，是经典的反常规打光法。",
    color: "#10b981",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        {[54,58,62,66].map(x => (
          <line key={x} x1={x} y1="52" x2={x} y2="68" stroke="#10b981" strokeWidth="0.6" opacity="0.4" />
        ))}
        <rect x="48" y="67" width="24" height="3" rx="1" fill="#374151" />
        <circle cx="60" cy="28" r="9" fill="#0d1520" stroke="#10b981" strokeWidth="1.3" />
        <ellipse cx="60" cy="34" rx="3.5" ry="2" fill="#10b981" opacity="0.4" />
        <ellipse cx="55" cy="26" rx="2" ry="1" fill="#111827" />
        <ellipse cx="65" cy="26" rx="2" ry="1" fill="#111827" />
        <ellipse cx="60" cy="24" rx="2" ry="1" fill="#111827" />
        <line x1="60" y1="37" x2="60" y2="55" stroke="#10b981" strokeWidth="1.3" opacity="0.6" />
        <line x1="60" y1="43" x2="52" y2="50" stroke="#10b981" strokeWidth="1.3" opacity="0.6" />
        <line x1="60" y1="43" x2="68" y2="50" stroke="#10b981" strokeWidth="1.3" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "back", zh: "背光", en: "Backlight",
    desc: "光源位于主体身后，将主体剪影化，轮廓光勾勒出边缘，营造神秘、浪漫或史诗感。",
    color: "#f97316",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        <radialGradient id="bk">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <ellipse cx="60" cy="8" rx="30" ry="20" fill="url(#bk)" />
        <ellipse cx="60" cy="28" rx="10" ry="12" fill="#020408" />
        <ellipse cx="60" cy="16" rx="7.5" ry="8.5" fill="#020408" />
        <ellipse cx="60" cy="28" rx="10" ry="12" fill="none" stroke="#f97316" strokeWidth="1.4" opacity="0.8" />
        <ellipse cx="60" cy="16" rx="7.5" ry="8.5" fill="none" stroke="#f97316" strokeWidth="1.4" opacity="0.8" />
        <line x1="60" y1="40" x2="60" y2="58" stroke="#f97316" strokeWidth="1.3" opacity="0.7" />
        <line x1="60" y1="46" x2="52" y2="53" stroke="#f97316" strokeWidth="1.3" opacity="0.7" />
        <line x1="60" y1="46" x2="68" y2="53" stroke="#f97316" strokeWidth="1.3" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: "side", zh: "侧光", en: "Side Light",
    desc: "光源从侧方照射，一半明亮一半阴影，强调立体感与戏剧张力，人物性格的明暗面常用此表达。",
    color: "#a78bfa",
    svg: (
      <svg viewBox="0 0 120 70" style={{ width: "100%", height: 70 }}>
        <rect width="120" height="70" fill={BG} />
        {[16,20,24,28].map(y => (
          <line key={y} x1="2" y1={y} x2="40" y2={y} stroke="#a78bfa" strokeWidth="0.6" opacity="0.25" />
        ))}
        <circle cx="60" cy="22" r="9" fill={BG} stroke="#a78bfa" strokeWidth="1.4" />
        <path d="M60 13 A9 9 0 0 0 60 31 Z" fill="#a78bfa" opacity="0.15" />
        <ellipse cx="57" cy="20" rx="2" ry="1.5" fill="#a78bfa" opacity="0.5" />
        <ellipse cx="63" cy="20" rx="2" ry="1.5" fill="#111827" opacity="0.6" />
        <path d="M56 26 Q60 29 64 26" fill="none" stroke="#a78bfa" strokeWidth="0.9" />
        <line x1="60" y1="31" x2="60" y2="52" stroke="#a78bfa" strokeWidth="1.4" />
        <line x1="60" y1="38" x2="50" y2="46" stroke="#a78bfa" strokeWidth="1.4" />
        <line x1="60" y1="38" x2="70" y2="46" stroke="#a78bfa" strokeWidth="1.4" />
        <rect x="10" y="22" width="3" height="18" rx="1" fill="#a78bfa" opacity="0.5" />
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════
   色调  Color Tone  (5)
═══════════════════════════════════════════════════ */
const TONES = [
  {
    id: "red", zh: "红色调", en: "Red Tone",
    desc: "激情、危险、爱、紧迫。用于战争、激烈情绪、爱情高潮或血腥场景，视觉冲击力极强。",
    stops: ["#4a0a0a", "#8b1515", "#c0392b"],
    accent: "#ef4444",
    examples: "《辛德勒的名单》红衣小女孩 / 《英雄》张曼玉",
  },
  {
    id: "yellow", zh: "黄色调", en: "Yellow / Amber",
    desc: "温暖、怀旧、亲密、希望或荒漠感。大量出现于回忆闪回、西部片、沙漠场景与家庭叙事。",
    stops: ["#2a1a00", "#5c3d00", "#a06000"],
    accent: "#f59e0b",
    examples: "《低俗小说》/ 《老无所依》/ 《破坏之王》",
  },
  {
    id: "blue", zh: "蓝色调", en: "Blue Tone",
    desc: "冷静、压抑、疏离、忧郁或科技感。常见于犯罪、悬疑、未来题材，传达理性与孤立。",
    stops: ["#050f1c", "#0c2340", "#1e4080"],
    accent: "#3b82f6",
    examples: "《黑客帝国》矩阵世界 / 《拆弹部队》",
  },
  {
    id: "green", zh: "绿色调", en: "Green Tone",
    desc: "病态、诡异、监控感或生机感。既可用于自然清新，也常见于末日、监狱或阴谋场景。",
    stops: ["#051a0a", "#0a3016", "#145228"],
    accent: "#22c55e",
    examples: "《黑客帝国》代码世界 / 《赛末点》",
  },
  {
    id: "purple", zh: "紫色调", en: "Purple Tone",
    desc: "神秘、奢华、幻觉、超自然。带有强烈的不真实感，常见于梦境、幻想或惊悚场景。",
    stops: ["#100520", "#1e0a40", "#36156e"],
    accent: "#a855f7",
    examples: "《银翼杀手2049》/ 《妈妈！》",
  },
  {
    id: "white", zh: "白色调", en: "High Key / White",
    desc: "纯净、天真、超现实、梦境或压迫感。大面积过曝的白，带来神圣、虚空或精神崩溃感。",
    stops: ["#c8d0d8", "#e4eaf0", "#f8fafc"],
    accent: "#cbd5e1",
    examples: "《八恶人》雪景 / 《禁闭岛》回忆段落",
  },
  {
    id: "black", zh: "黑色调", en: "Dark / Low Key",
    desc: "神秘、沉重、末日感、高对比度戏剧张力。阴影大面积覆盖，光源极少，强调视觉冲击。",
    stops: ["#000000", "#0a0a0a", "#141414"],
    accent: "#4b5563",
    examples: "Film Noir黑色电影 / 《蝙蝠侠：黑暗骑士》",
  },
];

/* ═══════════════════════════════════════════════════
   蒙太奇  Montage  (6)
═══════════════════════════════════════════════════ */
const MONTAGES = [
  {
    id: "parallel", zh: "平行蒙太奇", en: "Parallel Montage",
    color: "#3b82f6",
    desc: "展示发生在不同地点、同一时间的两条或多条叙事线，各自独立又互相映衬，最终汇合或形成对照。",
    example: "《教父》迈克尔受洗礼与刺杀同步进行",
    visual: (
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
          <div className="flex-1 h-4 rounded bg-blue-900/60 border border-border flex items-center justify-center text-xs font-mono text-accent" style={{ fontSize: 8 }}>线A</div>
          <div className="flex-1 h-4 rounded bg-blue-800/40 border border-border" />
          <div className="flex-1 h-4 rounded bg-blue-900/60 border border-border" />
          <div className="flex-1 h-4 rounded bg-blue-800/40 border border-border" />
        </div>
        <div className="flex gap-1">
          <div className="flex-1 h-4 rounded bg-violet-800/40 border border-border" />
          <div className="flex-1 h-4 rounded bg-violet-900/60 border border-border flex items-center justify-center text-xs font-mono text-violet-400" style={{ fontSize: 8 }}>线B</div>
          <div className="flex-1 h-4 rounded bg-violet-800/40 border border-border" />
          <div className="flex-1 h-4 rounded bg-violet-900/60 border border-border" />
        </div>
      </div>
    ),
  },
  {
    id: "cross", zh: "交叉蒙太奇", en: "Cross Cutting",
    color: "#f59e0b",
    desc: "两条线索快速交替剪切，逐渐向同一顶点汇聚，制造悬念与紧张感。是追逐、决斗场景的经典手法。",
    example: "《不可饶恕》克林特·伊斯特伍德最后对决",
    visual: (
      <div className="flex items-center gap-0 h-8">
        {[["A","blue"],["B","violet"],["A","blue"],["B","violet"],["A","blue"],["AB","green"]].map(([l, col], i) => (
          <div key={i} className="flex-1 h-8 border-r border-bg flex items-center justify-center"
            style={{
              background: col === "blue" ? "rgba(37,99,235,0.4)" : col === "violet" ? "rgba(109,40,217,0.4)" : "rgba(16,185,129,0.5)",
              fontSize: 8
            }}>
            <span className="font-mono text-white/50">{l}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "repeat", zh: "重复蒙太奇", en: "Repetitive Montage",
    color: "#a78bfa",
    desc: "同一画面或镜头在影片中反复出现，每次出现时获得新的叙事含义与情感重量。",
    example: "《教父》鱼的意象多次重复暗示死亡",
    visual: (
      <div className="flex items-center gap-1 h-8">
        {[1,2,3].map(i => (
          <div key={i} className="flex-1 h-8 rounded border border-violet-500/30 bg-violet-900/30 flex items-center justify-center">
            <svg viewBox="0 0 20 20" style={{ width: 14, height: 14 }}>
              <path d="M4 10 L10 4 L16 10 L12 10 L12 16 L8 16 L8 10 Z" fill="#a78bfa" opacity={0.3 + i * 0.2} />
            </svg>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "cont", zh: "连续蒙太奇", en: "Continuity Editing",
    color: "#34d399",
    desc: "按照动作与时间的逻辑顺序剪辑，维持空间连续性与因果关系，是主流叙事电影的基本语法。",
    example: "好莱坞经典剧情片的标准剪辑模式",
    visual: (
      <div className="flex items-center gap-0 h-8">
        {["A1","A2","A3","A4"].map((l, i) => (
          <div key={i} className={`flex-1 h-8 border-r border-bg flex items-center justify-center`}
            style={{ background: `rgba(52,211,153,${0.2 + i * 0.08})`, fontSize: 8 }}>
            <span className="font-mono text-white/50">{l}</span>
          </div>
        ))}
        <div className="w-3 flex items-center justify-center">
          <span className="text-green-400 text-xs">→</span>
        </div>
      </div>
    ),
  },
  {
    id: "contrast", zh: "对比蒙太奇", en: "Contrast Montage",
    color: "#fb923c",
    desc: "将内容或情绪相反的镜头并置，通过强烈对比产生新含义，引发观众深层联想与批判性思考。",
    example: "《现代时代》卓别林与羊群画面并置",
    visual: (
      <div className="flex items-center gap-1 h-8">
        <div className="flex-1 h-8 rounded border border-orange-500/30 bg-orange-900/30 flex items-center justify-center text-xs font-mono text-orange-300" style={{ fontSize: 8 }}>富裕</div>
        <div className="text-orange-400 text-sm">≠</div>
        <div className="flex-1 h-8 rounded border border-orange-500/20 bg-bg-deep flex items-center justify-center text-xs font-mono text-text-muted" style={{ fontSize: 8 }}>贫穷</div>
      </div>
    ),
  },
  {
    id: "meta", zh: "隐喻蒙太奇", en: "Metaphorical Montage",
    color: "#e879f9",
    desc: "通过象征性的画面连接，赋予场景超越字面意义的隐喻，传达思想或批判，爱森斯坦最善此道。",
    example: "爱森斯坦《战舰波将金号》石狮子起身隐喻革命",
    visual: (
      <div className="flex items-center gap-1 h-8">
        <div className="flex-1 h-8 rounded border border-fuchsia-500/30 bg-fuchsia-900/20 flex items-center justify-center text-lg">🦁</div>
        <div className="text-fuchsia-400 text-sm">→</div>
        <div className="flex-1 h-8 rounded border border-fuchsia-500/20 bg-fuchsia-900/10 flex items-center justify-center text-lg">⚡</div>
      </div>
    ),
  },
];

/* ═══════════════════════════════════════════════════
   CATEGORIES
═══════════════════════════════════════════════════ */
const CATEGORIES = [
  { id: "shots",      zh: "景别",   count: SHOT_SIZES.length              },
  { id: "movement",   zh: "运镜",   count: MOVEMENTS.length               },
  { id: "composition",zh: "构图",   count: COMPOSITIONS.length            },
  { id: "camerapos",  zh: "机位",   count: POSITIONS.length + ANGLES.length },
  { id: "transition", zh: "转场",   count: TRANSITIONS.length             },
  { id: "light",      zh: "光线",   count: LIGHTINGS.length               },
  { id: "tone",       zh: "色调",   count: TONES.length                   },
  { id: "montage",    zh: "蒙太奇", count: MONTAGES.length                },
];

/* ── shared card wrapper ── */
function DiagramCard({ zh, en, desc, svg }: { zh: string; en: string; desc: string; svg: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card overflow-hidden hover:border-accent/30 transition-colors">
      <div className="bg-bg-deep border-b border-border">{svg}</div>
      <div className="p-3">
        <div className="flex items-baseline gap-1.5 mb-1 flex-wrap">
          <h3 className="font-display font-bold text-base text-white">{zh}</h3>
          <span className="font-mono text-xs text-text-muted">{en}</span>
        </div>
        <p className="text-text-muted text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function SectionHeader({ zh, en, desc }: { zh: string; en: string; desc?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-display font-bold text-2xl text-white">{zh}</h2>
        <span className="text-text-muted text-sm font-mono">{en}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {desc && <p className="text-text-dim text-sm max-w-2xl">{desc}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════ */
interface TutorialsContentProps {
  onNavigate: (page: number) => void;
}

export default function TutorialsContent({ onNavigate }: TutorialsContentProps) {
  const [cat, setCat] = useState("shots");

  return (
    <div className="min-h-screen px-6 py-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-accent text-xs tracking-widest mb-2">FIELD GUIDE</p>
        <h1 className="font-display font-black text-white mb-2" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
          拉片术语图解
        </h1>
        <p className="text-text-dim text-sm mb-3">专业电影语言图解手册 · 点击运镜卡片可切换动态演示</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-card">
          <span className="text-amber-400/80 text-xs">⚠</span>
          <span className="text-text-muted text-xs">仅供学习参考，如需深入请查阅专业电影理论文献。</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {CATEGORIES.map((c) => (
          <Button key={c.id} type="button" variant="outline" onClick={() => setCat(c.id)}
            className={`rounded-full px-4 text-sm font-medium ${
              cat === c.id
                ? "bg-accent text-white"
                : "border border-border text-text-dim hover:text-white hover:border-border-mid"
            }`}>
            {c.zh}
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${
              cat === c.id ? "bg-white/20" : "bg-white/6 text-text-muted"
            }`}>{c.count}</span>
          </Button>
        ))}
      </div>

      {/* ── 景别 ── */}
      {cat === "shots" && (
        <>
          <SectionHeader zh="景别" en="Shot Size"
            desc="由摄影机与主体的距离决定，是导演控制信息量与情绪密度的核心工具。从宏观到微观，每种景别传递不同叙事意图。" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {SHOT_SIZES.map(s => <DiagramCard key={s.id} {...s} />)}
          </div>
          <div className="mt-8 p-5 rounded-2xl border border-border bg-bg-card">
            <p className="text-xs text-text-muted font-mono mb-3">景别连续谱 — 从环境优先到情绪优先</p>
            <div className="flex items-end gap-1" style={{ height: 52 }}>
              {SHOT_SIZES.map((s, i) => (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t" style={{
                    height: 8 + i * 6,
                    background: `rgba(59,130,246,${0.15 + i * 0.11})`,
                  }} />
                  <span className="text-center font-mono text-accent" style={{ fontSize: 7 }}>{s.zh}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-text-muted">
              <span>← 环境信息更多</span><span>情绪细节更强 →</span>
            </div>
          </div>
        </>
      )}

      {/* ── 运镜 ── */}
      {cat === "movement" && (
        <>
          <SectionHeader zh="运镜" en="Camera Movement"
            desc="摄影机的运动方式决定观众的视角参与感与情绪代入。点击每张卡片可切换动态演示。" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {MOVEMENTS.map(m => <MovementCard key={m.id} m={m} />)}
          </div>
        </>
      )}

      {/* ── 构图 ── */}
      {cat === "composition" && (
        <>
          <SectionHeader zh="构图" en="Composition"
            desc="构图决定观众的目光落点与情绪预期。每种构图法则背后，都是对人类视觉心理的精准把握。" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {COMPOSITIONS.map(c => <DiagramCard key={c.id} {...c} />)}
          </div>
        </>
      )}

      {/* ── 机位（角度 + 方位合并） ── */}
      {cat === "camerapos" && (
        <>
          <SectionHeader zh="机位" en="Camera Position"
            desc="机位由两个维度决定：垂直高低（角度）与水平方向（方位）。两者组合决定了观众与主体的完整空间关系。" />

          {/* 角度 */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-mono font-bold tracking-wider px-2 py-1 rounded border text-blue-400 border-blue-400/40 opacity-80">角度</span>
            <span className="text-text-muted text-xs">摄影机垂直高低 · 决定权力感与情绪立场</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {ANGLES.map(a => <DiagramCard key={a.id} {...a} />)}
          </div>

          {/* 方位 */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-mono font-bold tracking-wider px-2 py-1 rounded border text-green-400 border-green-400/40 opacity-80">方位</span>
            <span className="text-text-muted text-xs">摄影机水平方向 · 决定视角关系与心理立场</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {POSITIONS.map(p => <DiagramCard key={p.id} {...p} />)}
          </div>

          {/* 方位俯视示意图 */}
          <div className="p-5 rounded-2xl border border-border bg-bg-card">
            <p className="text-xs text-text-muted font-mono mb-4">方位示意图 — 俯视角度</p>
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 200 200" style={{ width: 200, height: 200 }}>
                <circle cx="100" cy="100" r="70" fill="none" stroke={C1} strokeWidth="0.6" opacity="0.2" strokeDasharray="4 2" />
                <circle cx="100" cy="100" r="12" fill="#1e293b" stroke={C1} strokeWidth="1.2" />
                <text x="100" y="104" textAnchor="middle" fill={C1} fontSize="8" fontFamily="monospace">主体</text>
                {[
                  { angle: 270, label: "正面" }, { angle: 90, label: "背面" },
                  { angle: 0, label: "侧面" },   { angle: 315, label: "斜侧面" },
                ].map(({ angle, label }) => {
                  const r = 70;
                  const rad = (angle - 90) * Math.PI / 180;
                  const cx2 = 100 + r * Math.cos(rad);
                  const cy2 = 100 + r * Math.sin(rad);
                  return (
                    <g key={label}>
                      <line x1="100" y1="100" x2={cx2} y2={cy2} stroke={C1} strokeWidth="0.5" opacity="0.2" />
                      <rect x={cx2 - 8} y={cy2 - 5} width="16" height="10" rx="1.5" fill="#1e293b" stroke={C1} strokeWidth="0.9" />
                      <circle cx={cx2} cy={cy2} r="2.5" fill="none" stroke={C1} strokeWidth="0.8" />
                      <text x={cx2 + (cx2 > 110 ? 14 : cx2 < 90 ? -14 : 0)}
                        y={cy2 + (cy2 > 110 ? 16 : cy2 < 90 ? -10 : 4)}
                        textAnchor="middle" fill={C1} fontSize="9" fontFamily="monospace" opacity="0.7">{label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </>
      )}

      {/* ── 转场 ── */}
      {cat === "transition" && (
        <>
          <SectionHeader zh="转场" en="Transitions"
            desc="镜头与镜头之间的衔接方式，决定时空跳跃的节奏感与观众对场景切换的感知。" />
          {["静态", "动态", "特效"].map(group => {
            const items = TRANSITIONS.filter(t => t.group === group);
            const groupColors: Record<string, string> = { "静态": "text-blue-400", "动态": "text-green-400", "特效": "text-purple-400" };
            return (
              <div key={group} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-mono font-bold tracking-wider px-2 py-1 rounded border ${groupColors[group]} border-current opacity-60`}>
                    {group}转场
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {items.map(t => (
                    <div key={t.id} className="rounded-2xl border border-border bg-bg-card overflow-hidden hover:border-accent/30 transition-colors">
                      <div className="p-4 bg-bg-deep border-b border-border">{t.visual}</div>
                      <div className="p-4">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <h3 className="font-display font-bold text-base text-white">{t.zh}</h3>
                          <span className="font-mono text-xs text-text-muted">{t.en}</span>
                        </div>
                        <p className="text-text-muted text-xs leading-relaxed">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── 光线 ── */}
      {cat === "light" && (
        <>
          <SectionHeader zh="光线" en="Lighting"
            desc="光是电影造型的核心语言。光源方向决定情绪氛围，明暗对比左右叙事张力。" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {LIGHTINGS.map(l => (
              <div key={l.id} className="rounded-2xl border border-border bg-bg-card overflow-hidden hover:border-accent/30 transition-colors">
                <div className="bg-bg-deep border-b border-border">{l.svg}</div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                    <h3 className="font-display font-bold text-base text-white">{l.zh}</h3>
                  </div>
                  <span className="font-mono text-xs text-text-muted block mb-1">{l.en}</span>
                  <p className="text-text-muted text-xs leading-relaxed">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-2xl border border-border bg-bg-card">
            <p className="text-xs font-mono text-text-muted mb-3">光线方向示意</p>
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 260 120" style={{ width: "100%", maxWidth: 480, height: "auto" }}>
                <circle cx="130" cy="60" r="22" fill="#1e293b" stroke={C1} strokeWidth="1" />
                <circle cx="130" cy="52" r="12" fill="none" stroke={C1} strokeWidth="0.8" opacity="0.5" />
                {[
                  { label:"顶光", x1:130, y1:2, x2:130, y2:38, lx:130, ly:115, ta:"middle" },
                  { label:"底光", x1:130, y1:82, x2:130, y2:118, lx:130, ly:10, ta:"middle" },
                  { label:"侧光", x1:2, y1:60, x2:108, y2:60, lx:230, ly:64, ta:"middle" },
                  { label:"背光", x1:258, y1:60, x2:152, y2:60, lx:20, ly:64, ta:"middle" },
                  { label:"自然光", x1:20, y1:10, x2:114, y2:42, lx:200, ly:108, ta:"middle" },
                ].map(({ label, x1, y1, x2, y2, lx, ly, ta }) => (
                  <g key={label}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C1} strokeWidth="1.2" opacity="0.45" strokeDasharray="4 2" />
                    <polygon points={`${x2-3},${y2} ${x2+3},${y2} ${x2},${y2+5}`}
                      fill={C1} opacity="0.5" transform={`rotate(${Math.atan2(y2-y1,x2-x1)*180/Math.PI+90},${x2},${y2})`} />
                    <text x={lx} y={ly} textAnchor={ta as "middle"} fill={C1} fontSize="9" opacity="0.6" fontFamily="monospace">{label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </>
      )}

      {/* ── 色调 ── */}
      {cat === "tone" && (
        <>
          <SectionHeader zh="色调" en="Color Tone"
            desc="色调是情绪的视觉化语言，导演通过色彩调色引导观众产生特定的情感反应与象征联想。" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TONES.map(t => (
              <div key={t.id} className="rounded-2xl border border-border bg-bg-card overflow-hidden hover:border-accent/30 transition-colors">
                <div className="relative border-b border-border" style={{ height: 80 }}>
                  <div className="absolute inset-0 rounded-t-2xl"
                    style={{ background: `linear-gradient(135deg, ${t.stops[0]} 0%, ${t.stops[1]} 50%, ${t.stops[2]} 100%)` }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display font-black text-4xl opacity-20" style={{ color: t.accent }}>{t.zh[0]}</span>
                  </div>
                  <div className="absolute bottom-2 left-3 flex gap-1">
                    {t.stops.map((s, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ background: s }} />
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="font-display font-bold text-lg text-white">{t.zh}</h3>
                    <span className="font-mono text-xs text-text-muted">{t.en}</span>
                  </div>
                  <p className="text-text-muted text-xs leading-relaxed mb-2">{t.desc}</p>
                  <p className="text-text-faint text-xs font-mono border-t border-border pt-2 leading-relaxed">{t.examples}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 蒙太奇 ── */}
      {cat === "montage" && (
        <>
          <SectionHeader zh="蒙太奇" en="Montage"
            desc="蒙太奇（Montage）是电影剪辑的核心理论——镜头的组合方式产生超越单个镜头的新含义。苏联导演爱森斯坦将其系统化为电影语法。" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {MONTAGES.map(m => (
              <div key={m.id} className="rounded-2xl border border-border bg-bg-card overflow-hidden hover:border-accent/30 transition-colors">
                <div className="p-4 bg-bg-deep border-b border-border">{m.visual}</div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.color }} />
                    <h3 className="font-display font-bold text-base text-white">{m.zh}</h3>
                    <span className="font-mono text-xs text-text-muted">{m.en}</span>
                  </div>
                  <p className="text-text-muted text-xs leading-relaxed mb-2">{m.desc}</p>
                  <p className="text-text-faint text-xs font-mono border-t border-border pt-2">↗ {m.example}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 rounded-2xl border border-border bg-bg-card">
            <p className="text-xs font-mono text-text-muted mb-3">蒙太奇基本原理 — 1+1&gt;2</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-bg-deep">
                <span className="text-2xl">🔪</span>
                <span className="text-xs text-text-dim">刀</span>
              </div>
              <span className="text-text-dim">+</span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-bg-deep">
                <span className="text-2xl">😊</span>
                <span className="text-xs text-text-dim">笑脸</span>
              </div>
              <span className="text-text-dim">=</span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-accent/30 bg-accent/8">
                <span className="text-2xl">😨</span>
                <span className="text-xs text-accent">恐惧感</span>
              </div>
              <span className="text-text-faint text-xs ml-2">— 库里肖夫效应</span>
            </div>
          </div>
        </>
      )}

      {/* bottom CTA */}
      <div className="mt-16 p-8 rounded-2xl border border-border bg-bg-card text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)" }} />
        <h2 className="relative font-display font-black text-3xl text-white mb-2">实战练手</h2>
        <p className="relative text-text-dim text-sm mb-6">理论读懂之后，直接在编辑器里对电影进行实战拉片</p>
        <Button type="button" onClick={() => onNavigate(2)} className="relative h-11 rounded-xl bg-accent px-8 font-semibold text-white hover:bg-accent/90">
          打开拉片编辑器 →
        </Button>
      </div>
    </div>
  );
}
