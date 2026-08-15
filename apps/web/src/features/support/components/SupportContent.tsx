import { useState } from "react";
import { toast } from "sonner";
import PageIntro from "../../../components/layout/PageIntro";
import { Button } from "../../../components/ui/button";
import SurfaceCard from "../../../components/ui/surface-card";
import { Textarea } from "../../../components/ui/textarea";
import { createSupportRequest, recordSupportRequestEvent } from "../../../services/supabase/support";
import { SUPPORT_TIERS } from "../constants/supportTiers";
import type { PaymentChannel, SupportTier } from "../types";
import SupportPaymentModal from "./SupportPaymentModal";

interface SupportContentProps { onNavigate?: (page: number) => void; }

function getSupportErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "打赏请求提交失败，请稍后重试。";
  return message.toLowerCase().includes("authentication is required") ? "请先登录，再发起打赏。" : message;
}

export default function SupportContent({ onNavigate }: SupportContentProps) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("wechat");
  const [message, setMessage] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedTier = SUPPORT_TIERS.find((tier) => tier.id === selectedTierId) ?? null;
  const qrCodeUrl = selectedTier?.paymentQrUrls[paymentChannel] ?? null;

  const chooseTier = (tier: SupportTier) => { setSelectedTierId(tier.id); setErrorMessage(""); };

  const startSupport = async () => {
    if (!selectedTier) return;
    if (!qrCodeUrl) { setErrorMessage(`${selectedTier.amountLabel} 的${paymentChannel === "wechat" ? "微信" : "支付宝"}收款码尚未配置。`); return; }
    setIsSubmitting(true); setErrorMessage("");
    try { setActiveRequestId(await createSupportRequest({ tierId: selectedTier.id, message: message.trim(), paymentChannel })); }
    catch (error) { setErrorMessage(getSupportErrorMessage(error)); }
    finally { setIsSubmitting(false); }
  };

  const recordPaymentEvent = async (eventType: "payment_cancelled" | "payment_claimed_paid") => {
    if (!activeRequestId) return;
    setIsProcessingPayment(true); setErrorMessage("");
    try {
      await recordSupportRequestEvent(activeRequestId, eventType);
      setActiveRequestId(null);
      toast.success(eventType === "payment_claimed_paid" ? "已提交付款声明，开发者将人工核验。" : "已记录本次取消操作。");
    } catch (error) { setErrorMessage(getSupportErrorMessage(error)); }
    finally { setIsProcessingPayment(false); }
  };

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <PageIntro className="mb-14" align="center" eyebrow="SUPPORT" title="支持 AisenLens" description="如果它帮助了你，欢迎随心打赏一份心意。" />
      <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORT_TIERS.map((tier) => { const isSelected = tier.id === selectedTierId; return <Button key={tier.id} type="button" variant="outline" onClick={() => chooseTier(tier)} className={`group relative h-auto items-start rounded-2xl bg-bg-card p-5 text-left transition-all duration-200 ${tier.colorClassName} ${isSelected ? "scale-[1.02] ring-1 ring-accent/30" : ""}`}><span>{isSelected && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent" />}<span className="mb-3 block text-3xl">{tier.emoji}</span><span className={`mb-0.5 block font-mono text-lg font-bold ${tier.badgeClassName}`}>{tier.amountLabel}</span><span className="mb-2 block text-sm font-medium text-white">{tier.title}</span><span className="block text-xs leading-relaxed text-text-muted">{tier.description}</span></span></Button>; })}
      </div>
      <SurfaceCard className="mb-10 p-6 sm:p-8">
        <h2 className="mb-6 font-display text-2xl font-bold text-white">完成打赏</h2>
        <div className="mb-6"><p className="mb-2 font-mono text-xs tracking-wider text-text-muted">支付方式</p><div className="flex gap-3">{(["wechat", "alipay"] as const).map((channel) => <Button key={channel} type="button" variant="outline" onClick={() => { setPaymentChannel(channel); setErrorMessage(""); }} className={`rounded-xl ${paymentChannel === channel ? "border-accent bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent" : "border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white"}`}>{channel === "wechat" ? "微信支付" : "支付宝"}</Button>)}</div></div>
        <div className="mb-6"><label htmlFor="support-message" className="mb-2 block font-mono text-xs tracking-wider text-text-muted">留言给开发者（可选）</label><Textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={3} maxLength={500} placeholder="感谢你打造了这个工具，让我的拉片效率翻倍…" className="resize-none rounded-xl border-border bg-bg-input px-4 py-3 leading-relaxed text-text-base placeholder:text-text-muted" /></div>
        {selectedTier && <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-bg-deep px-4 py-3"><span className="text-2xl">{selectedTier.emoji}</span><div><p className="text-sm font-medium text-white">{selectedTier.title} · {selectedTier.amountLabel}</p><p className="text-xs text-text-muted">点击后将生成一条待人工核验的打赏请求。</p></div></div>}
        {errorMessage && <p role="alert" className="mb-5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{errorMessage}</p>}
        <Button type="button" onClick={() => void startSupport()} disabled={!selectedTier || isSubmitting} className="h-11 rounded-xl bg-accent px-8 font-semibold text-white hover:bg-accent/90">{isSubmitting ? "正在创建请求…" : selectedTier ? `去打赏 ${selectedTier.amountLabel}` : "请先选择金额"}</Button>
      </SurfaceCard>
      <div className="border-t border-border py-10 text-center"><p className="mb-3 font-mono text-xs text-text-muted">Made with ♥ by</p><p className="mb-2 font-display text-2xl font-black text-white">AisenLens</p>{onNavigate && <p className="mt-4 text-sm text-text-muted">有问题或建议？<Button type="button" variant="link" size="sm" onClick={() => onNavigate(6)} className="ml-1 h-auto p-0 text-accent hover:text-white">前往反馈页面 →</Button></p>}</div>
      {activeRequestId && selectedTier && qrCodeUrl && <SupportPaymentModal tier={selectedTier} paymentChannel={paymentChannel} qrCodeUrl={qrCodeUrl} isProcessing={isProcessingPayment} onCancel={() => void recordPaymentEvent("payment_cancelled")} onClaimPaid={() => void recordPaymentEvent("payment_claimed_paid")} />}
    </div>
  );
}
