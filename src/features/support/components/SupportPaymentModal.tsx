import { X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import SurfaceCard from "../../../components/ui/surface-card";
import type { PaymentChannel, SupportTier } from "../types";

interface SupportPaymentModalProps {
  tier: SupportTier;
  paymentChannel: PaymentChannel;
  qrCodeUrl: string;
  isProcessing: boolean;
  onCancel: () => void;
  onClaimPaid: () => void;
}

export default function SupportPaymentModal({ tier, paymentChannel, qrCodeUrl, isProcessing, onCancel, onClaimPaid }: SupportPaymentModalProps) {
  const paymentChannelLabel = paymentChannel === "wechat" ? "微信支付" : "支付宝";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="关闭付款窗口" disabled={isProcessing} onClick={onCancel} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <SurfaceCard role="dialog" aria-modal="true" aria-labelledby="support-payment-title" className="relative w-full max-w-sm overflow-hidden border-border-mid shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div><p className="font-mono text-xs tracking-widest text-accent">SUPPORT AISENLENS</p><h2 id="support-payment-title" className="mt-1 font-display text-2xl font-black text-white">{tier.amountLabel} · {paymentChannelLabel}</h2></div>
          <Button type="button" variant="ghost" size="icon" aria-label="关闭付款窗口" disabled={isProcessing} onClick={onCancel} className="text-text-muted hover:bg-white/6 hover:text-white"><X /></Button>
        </div>
        <div className="p-6">
          <div className="mx-auto flex aspect-square w-full max-w-60 items-center justify-center rounded-xl bg-white p-3"><img src={qrCodeUrl} alt={`${tier.amountLabel} ${paymentChannelLabel}收款码`} className="h-full w-full object-contain" /></div>
          <p className="mt-5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-text-dim">建议在付款备注中填写你的用户名，方便开发者人工核验。</p>
          <p className="mt-3 text-center text-xs leading-relaxed text-text-muted">点击“我已支付”只会提交付款声明；开发者核对收款记录后才会更新角色。</p>
          <div className="mt-6 grid grid-cols-2 gap-3"><Button type="button" variant="outline" disabled={isProcessing} onClick={onCancel} className="h-11 rounded-xl border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white">取消</Button><Button type="button" disabled={isProcessing} onClick={onClaimPaid} className="h-11 rounded-xl bg-accent text-white hover:bg-accent/90">{isProcessing ? "正在提交…" : "我已支付"}</Button></div>
        </div>
      </SurfaceCard>
    </div>
  );
}
