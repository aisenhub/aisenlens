import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import ModalShell from "../../../components/ui/modal-shell";
import { USER_ROLE_LABELS } from "../constants/userRoles";
import type { UserProfile } from "../types";
import { getCurrentProfile, updateCurrentDisplayName } from "../../../services/supabase/profiles";

interface UserCenterModalProps { onClose: () => void; onProfileUpdated: (profile: UserProfile) => void; }
const formatDate = (date: string) => new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(date));

export default function UserCenterModal({ onClose, onProfileUpdated }: UserCenterModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { void getCurrentProfile().then((current) => { setProfile(current); setDisplayName(current?.displayName ?? ""); }).catch((error) => setErrorMessage(error instanceof Error ? error.message : "用户资料加载失败。" )).finally(() => setIsLoading(false)); }, []);
  const saveProfile = async () => {
    if (!displayName.trim()) { setErrorMessage("昵称不能为空。"); return; }
    setIsSaving(true); setErrorMessage("");
    try { const updated = await updateCurrentDisplayName(displayName); setProfile(updated); setIsEditing(false); onProfileUpdated(updated); toast.success("昵称已更新。"); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : "昵称保存失败，请稍后重试。"); }
    finally { setIsSaving(false); }
  };
  const avatarLetter = profile?.displayName.slice(0, 1) || "A";

  return <ModalShell title="用户中心" onClose={onClose}>
    {isLoading ? <div className="py-12 text-center text-sm text-text-muted">正在加载用户资料…</div> : profile ? <div className="flex flex-col gap-5"><div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/20 text-xl font-bold text-accent">{avatarLetter}</div><div className="min-w-0"><p className="truncate font-medium text-white">{profile.displayName}</p><p className="truncate text-xs text-text-muted">{profile.email}</p></div></div><div className="flex shrink-0 flex-wrap justify-end gap-2"><span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium tracking-wide text-accent">{USER_ROLE_LABELS[profile.role]}</span></div></div><div className="h-px bg-border" /><div className="flex items-center justify-between gap-4 py-1"><span className="text-sm text-text-muted">用户昵称</span>{isEditing ? <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-9 w-48 border-border bg-bg-input text-right text-white" /> : <span className="text-sm font-mono text-white">{profile.displayName}</span>}</div><div className="flex items-center justify-between gap-4 py-1"><span className="text-sm text-text-muted">邮箱</span><span className="text-sm font-mono text-white">{profile.email}</span></div><div className="flex items-center justify-between gap-4 py-1"><span className="text-sm text-text-muted">注册时间</span><span className="text-sm font-mono text-white">{formatDate(profile.createdAt)}</span></div>{errorMessage && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{errorMessage}</p>}{isEditing ? <div className="flex gap-3"><Button type="button" variant="outline" onClick={() => { setDisplayName(profile.displayName); setIsEditing(false); setErrorMessage(""); }} className="h-10 flex-1 rounded-xl border-border text-text-dim hover:bg-white/4 hover:text-white">取消</Button><Button type="button" onClick={() => void saveProfile()} disabled={isSaving} className="h-10 flex-1 rounded-xl bg-accent text-white hover:bg-accent/90">{isSaving ? "保存中…" : "保存资料"}</Button></div> : <Button type="button" variant="outline" onClick={() => setIsEditing(true)} className="h-10 w-full rounded-xl border-border text-text-dim hover:bg-white/4 hover:text-white">修改昵称</Button>}</div> : <div className="py-12 text-center text-sm text-text-muted">未找到登录用户资料。</div>}
  </ModalShell>;
}
