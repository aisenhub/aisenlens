import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import ModalShell from "../../../components/ui/modal-shell";
import { EDITOR_SHORTCUT_DEFINITIONS } from "../shortcuts/definitions";

interface LiteSettingsModalProps { onClose: () => void; }
type LiteSettingsTab = "cache" | "shortcuts";

const tabs: { id: LiteSettingsTab; label: string }[] = [
  { id: "cache", label: "缓存管理" }, { id: "shortcuts", label: "快捷键" },
];

export default function LiteSettingsModal({ onClose }: LiteSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<LiteSettingsTab>("cache");
  const [liteCache, setLiteCache] = useState(128);
  return <ModalShell title="项目库设置" description="快速拉片" onClose={onClose} className="max-w-lg">
    <div className="-m-6 flex min-h-[380px]"><div className="flex w-36 shrink-0 flex-col gap-1 border-r border-border p-3">{tabs.map((tab) => <Button key={tab.id} type="button" variant="ghost" size="sm" onClick={() => setActiveTab(tab.id)} className={`justify-start rounded-lg ${activeTab === tab.id ? "bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent" : "text-text-dim hover:bg-white/4 hover:text-white"}`}>{tab.label}</Button>)}</div><div className="flex-1 overflow-y-auto p-5">
      {activeTab === "cache" && <div className="flex flex-col gap-4"><p className="editor-meta text-text-muted">缓存保存在本地设备，用于加速视频加载。清除后需要重新导入视频文件。</p><div className="rounded-xl border border-border bg-bg-deep p-4"><div className="mb-3 flex items-center justify-between"><div><p className="editor-body font-medium text-white">本地缓存</p><p className="mt-0.5 font-mono editor-meta text-text-muted">{liteCache} MB / 500 MB</p></div><span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono editor-micro text-accent">快速拉片</span></div><div className="mb-3 h-1.5 w-full rounded-full bg-border"><div className="h-full rounded-full bg-accent/60" style={{ width: `${(liteCache / 500) * 100}%` }} /></div><Button type="button" variant="destructive" size="sm" onClick={() => { setLiteCache(0); toast.success("本地缓存已清除。"); }} className="h-7 w-full justify-center editor-body font-normal">清除本地缓存</Button></div></div>}
      {activeTab === "shortcuts" && <div className="flex flex-col gap-1"><p className="mb-3 editor-meta text-text-muted">拉片编辑器内可用快捷键一览。</p>{EDITOR_SHORTCUT_DEFINITIONS.map(({ action, key, description }) => <div key={action} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0"><span className="editor-meta text-text-dim">{description}</span><kbd className="rounded-md border border-border bg-bg-deep px-2 py-0.5 font-mono editor-meta text-accent">{key}</kbd></div>)}</div>}
    </div></div>
  </ModalShell>;
}
