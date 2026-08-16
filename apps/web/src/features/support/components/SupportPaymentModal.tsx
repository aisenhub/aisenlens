import { useEffect, useRef, useState } from "react";
import { Clock3, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import SurfaceCard from "../../../components/ui/surface-card";
import type { PaymentChannel, SupportTier } from "../types";

interface SupportPaymentModalProps {
  tier: SupportTier;
  paymentChannel: PaymentChannel;
  qrCodeUrl: string;
  isProcessing: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onClaimPaid: (paymentReferenceLast4: string) => void;
  onExpire: () => void;
}

function formatRemainingTime(remainingSeconds: number) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function SupportPaymentModal({ tier, paymentChannel, qrCodeUrl, isProcessing, errorMessage, onCancel, onClaimPaid, onExpire }: SupportPaymentModalProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [paymentReferenceLast4, setPaymentReferenceLast4] = useState("");
  const hasReportedExpiry = useRef(false);
  const paymentChannelLabel = paymentChannel === "wechat" ? "微信支付" : "支付宝";
  const isExpired = remainingSeconds === 0;

  useEffect(() => {
    const intervalId = window.setInterval(() => setRemainingSeconds((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isExpired || hasReportedExpiry.current) return;
    hasReportedExpiry.current = true;
    onExpire();
  }, [isExpired, onExpire]);

  const handlePaymentReferenceChange = (value: string) => {
    setPaymentReferenceLast4(value.replace(/\D/g, "").slice(0, 4));
  };

  const canSubmit = paymentReferenceLast4.length === 4 && !isExpired && !isProcessing;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="关闭付款窗口" disabled={isProcessing || isExpired} onClick={onCancel} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <SurfaceCard role="dialog" aria-modal="true" aria-labelledby="support-payment-title" className="relative w-full max-w-sm overflow-hidden border-border-mid shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="font-mono text-xs tracking-widest text-accent">SUPPORT AISENLENS</p>
            <h2 id="support-payment-title" className="mt-1 font-display text-2xl font-black text-white">{tier.amountLabel} · {paymentChannelLabel}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="关闭付款窗口" disabled={isProcessing || isExpired} onClick={onCancel} className="text-text-muted hover:bg-white/6 hover:text-white"><X /></Button>
        </div>
        <div className="p-6">
          <div className="mx-auto flex aspect-square w-full max-w-60 items-center justify-center rounded-xl bg-white p-3"><img src={qrCodeUrl} alt={`${tier.amountLabel} ${paymentChannelLabel}收款码`} className="h-full w-full object-contain" /></div>
          <div className={`mt-5 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${isExpired ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-accent/20 bg-accent/5 text-accent"}`}>
            <Clock3 className="size-4" />
            {isExpired ? "本次付款已超时，请重新发起" : `请在 ${formatRemainingTime(remainingSeconds)} 内完成支付并提交`}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-dim">付款完成后，请填写支付订单号后四位。</p>
          <label className="mt-4 block text-sm font-medium text-white" htmlFor="support-payment-reference">订单号后四位</label>
          <Input id="support-payment-reference" inputMode="numeric" pattern="[0-9]{4}" autoComplete="off" placeholder="请输入 4 位数字" value={paymentReferenceLast4} disabled={isProcessing || isExpired} onChange={(event) => handlePaymentReferenceChange(event.target.value)} className="mt-2 h-11 rounded-xl border-border bg-bg-deep px-3 text-center font-mono text-base tracking-[0.35em] text-white placeholder:text-left placeholder:font-sans placeholder:tracking-normal" />
          <p className="mt-3 text-center text-xs leading-relaxed text-text-muted">提交前请确认订单号后四位填写无误。</p>
          {errorMessage && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{errorMessage}</p>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" disabled={isProcessing || isExpired} onClick={onCancel} className="h-11 rounded-xl border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white">取消</Button>
            <Button type="button" disabled={!canSubmit} onClick={() => onClaimPaid(paymentReferenceLast4)} className="h-11 rounded-xl bg-accent text-white hover:bg-accent/90">{isProcessing ? "正在提交…" : "确认支付并提交"}</Button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
