import { DatabaseZap, RotateCcw } from "lucide-react";
import ModalShell from "../../../components/ui/modal-shell";
import { Button } from "../../../components/ui/button";
import type { ProjectRecoverySnapshot } from "../types";

interface ProjectStorageDialogProps { snapshots: ProjectRecoverySnapshot[]; usage: { usage: number; quota: number } | null; isBusy: boolean; onClose: () => void; onRestore: (snapshotId: string) => void; onClearCache: () => void; }

function formatBytes(bytes: number) { if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export default function ProjectStorageDialog({ snapshots, usage, isBusy, onClose, onRestore, onClearCache }: ProjectStorageDialogProps) {
  return <ModalShell title="恢复与存储" description="恢复快照只保存分镜与分析数据，不重复保存视频、截图和派生缓存。" onClose={onClose} closeDisabled={isBusy} className="max-w-xl"><div className="space-y-5"><section><div className="flex items-center justify-between"><p className="font-mono text-xs tracking-wider text-text-muted">浏览器存储</p>{usage && <span className="text-xs text-text-muted">{formatBytes(usage.usage)} / {formatBytes(usage.quota)}</span>}</div>{usage ? <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-input"><div className="h-full bg-accent" style={{ width: `${Math.min(100, usage.quota ? usage.usage / usage.quota * 100 : 0)}%` }} /></div> : <p className="mt-2 text-xs text-text-muted">当前浏览器未提供存储容量估算。</p>}<Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onClearCache} className="mt-3"><DatabaseZap />清理可再生成缓存</Button><p className="mt-1 text-xs text-text-muted">清理波形和时间线缩略图，不会删除项目、视频或截图。</p></section><section><p className="font-mono text-xs tracking-wider text-text-muted">自动恢复快照</p><div className="mt-2 space-y-2">{snapshots.length ? snapshots.map((snapshot) => <div key={snapshot.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-deep p-3"><span className="text-xs text-text-dim">{new Date(snapshot.createdAt).toLocaleString("zh-CN")}</span><Button type="button" variant="outline" size="xs" disabled={isBusy} onClick={() => onRestore(snapshot.id)}><RotateCcw />恢复此版本</Button></div>) : <p className="rounded-lg border border-dashed border-border p-3 text-xs text-text-muted">暂无快照；编辑器每 30 秒会自动保留最近三份。</p>}</div></section></div></ModalShell>;
}
