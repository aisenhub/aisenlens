import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import ModalShell from "../../../components/ui/modal-shell";
import { requestPasswordReset, signInWithEmail, signUpWithEmail } from "../../../services/supabase/auth";

interface AuthModalProps { onClose: () => void; onComplete: () => void; }
type AuthMode = "login" | "register" | "recovery";

export default function AuthModal({ onClose, onComplete }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (nextMode: AuthMode) => { setMode(nextMode); setErrorMessage(""); setPasswordConfirmation(""); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || (mode !== "recovery" && !password.trim())) { setErrorMessage("请填写邮箱和密码。"); return; }
    if (mode === "register") { if (password.length < 8) { setErrorMessage("密码至少需要 8 个字符。"); return; } if (password !== passwordConfirmation) { setErrorMessage("两次输入的密码不一致。"); return; } if (!hasAcceptedTerms) { setErrorMessage("请先阅读并同意用户协议与隐私政策。"); return; } }
    setIsSubmitting(true); setErrorMessage("");
    try {
      if (mode === "recovery") { await requestPasswordReset(email.trim()); toast.success("如该邮箱已注册，重置邮件已发送。"); return; }
      const result = mode === "login"
        ? await signInWithEmail(email.trim(), password)
        : await signUpWithEmail({ email: email.trim(), password, displayName });
      if (!result.session) {
        toast.success("账号创建成功，请前往邮箱完成验证后再登录。");
        onClose();
        return;
      }
      onComplete(); onClose(); toast.success(mode === "login" ? "登录成功。" : "账号创建成功。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "认证请求失败，请稍后重试。";
      if (message.toLowerCase().includes("invalid login credentials")) setErrorMessage("邮箱或密码不正确。");
      else if (message.toLowerCase().includes("already registered")) setErrorMessage("该邮箱已注册，请直接登录。");
      else setErrorMessage(message);
    } finally { setIsSubmitting(false); }
  };
  const title = mode === "login" ? "欢迎回来" : mode === "register" ? "创建账号" : "找回密码";
  const description = mode === "login" ? "登录后继续你的拉片分析。" : mode === "register" ? "创建账号，开始记录每一帧灵感。" : "输入注册邮箱，我们会发送密码重置链接。";

  return <ModalShell title={title} description={description} onClose={onClose}>
    <p className="mb-5 font-mono text-xs tracking-widest text-accent">AISENLENS</p>
    {mode === "recovery" ? <Button type="button" variant="link" size="sm" onClick={() => switchMode("login")} className="mb-5 h-auto p-0 text-text-muted hover:text-text-dim">← 返回登录</Button> : <div className="mb-6 flex gap-2 rounded-xl border border-border bg-bg-deep p-1"><Button type="button" variant="ghost" size="sm" onClick={() => switchMode("login")} className={`flex-1 rounded-lg ${mode === "login" ? "bg-white/6 text-white hover:bg-white/8 hover:text-white" : "text-text-muted hover:text-white"}`}>登录</Button><Button type="button" variant="ghost" size="sm" onClick={() => switchMode("register")} className={`flex-1 rounded-lg ${mode === "register" ? "bg-white/6 text-white hover:bg-white/8 hover:text-white" : "text-text-muted hover:text-white"}`}>注册</Button></div>}
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode === "register" && <div><label htmlFor="auth-display-name" className="mb-1.5 block font-mono text-xs tracking-wider text-text-muted">昵称（可选）</label><Input id="auth-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" placeholder="如何称呼你？" className="h-11 rounded-xl border-border bg-bg-input px-4 text-white placeholder:text-text-muted" /></div>}
      <div><label htmlFor="auth-email" className="mb-1.5 block font-mono text-xs tracking-wider text-text-muted">邮箱地址</label><Input id="auth-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="your@email.com" className="h-11 rounded-xl border-border bg-bg-input px-4 text-white placeholder:text-text-muted" /></div>
      {mode !== "recovery" && <div><div className="mb-1.5 flex items-center justify-between"><label htmlFor="auth-password" className="font-mono text-xs tracking-wider text-text-muted">密码</label>{mode === "login" && <Button type="button" variant="link" size="sm" onClick={() => switchMode("recovery")} className="h-auto p-0 text-xs text-accent hover:text-white">忘记密码？</Button>}</div><Input id="auth-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "输入密码" : "至少 8 个字符"} className="h-11 rounded-xl border-border bg-bg-input px-4 text-white placeholder:text-text-muted" /></div>}
      {mode === "register" && <><div><label htmlFor="auth-password-confirmation" className="mb-1.5 block font-mono text-xs tracking-wider text-text-muted">确认密码</label><Input id="auth-password-confirmation" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} type="password" autoComplete="new-password" placeholder="再次输入密码" className="h-11 rounded-xl border-border bg-bg-input px-4 text-white placeholder:text-text-muted" /></div><label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-text-muted"><input type="checkbox" checked={hasAcceptedTerms} onChange={(event) => setHasAcceptedTerms(event.target.checked)} className="editor-checkbox mt-0.5" /><span>我已阅读并同意<a href="#" className="mx-1 text-accent hover:underline">用户协议</a>和<a href="#" className="mx-1 text-accent hover:underline">隐私政策</a>。</span></label></>}
      {errorMessage && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{errorMessage}</p>}
      <Button type="submit" disabled={isSubmitting} className="mt-1 h-11 w-full rounded-xl bg-accent text-white hover:bg-accent/90">{isSubmitting ? "正在处理中…" : mode === "login" ? "登录" : mode === "register" ? "创建账号" : "发送重置邮件"}</Button>
      {mode !== "recovery" && <p className="text-center text-xs text-text-muted">{mode === "login" ? "还没有 AisenLens 账号？" : "已经有 AisenLens 账号？"}<Button type="button" variant="link" size="sm" onClick={() => switchMode(mode === "login" ? "register" : "login")} className="ml-1 h-auto p-0 text-accent hover:text-white">{mode === "login" ? "立即注册" : "返回登录"}</Button></p>}
    </form>
  </ModalShell>;
}
