import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import PageIntro from "../../../components/layout/PageIntro";
import { Button } from "../../../components/ui/button";
import SurfaceCard from "../../../components/ui/surface-card";
import { canAccessSupporterFeedback } from "../../../services/supabase/feedback";
import { createSupportRequest, recordSupportRequestEvent } from "../../../services/supabase/support";
import { SUPPORT_TIERS } from "../constants/supportTiers";
import type { PaymentChannel } from "../types";
import RedemptionCodeCard from "./RedemptionCodeCard";
import SupportPaymentModal from "./SupportPaymentModal";
import SupporterFeedbackAccessDialog from "./SupporterFeedbackAccessDialog";
import SupporterFeedbackDialog from "./SupporterFeedbackDialog";

function getSupportErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "打赏请求提交失败，请稍后重试。";
  return message.toLowerCase().includes("authentication is required") ? "请先登录，再发起打赏。" : message;
}

interface SupportContentProps {
  isLoggedIn: boolean;
  onRequireAuth: () => void;
  onNavigate: (page: number) => void;
}

export default function SupportContent({ isLoggedIn, onRequireAuth, onNavigate }: SupportContentProps) {
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("wechat");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isFeedbackAccessDeniedOpen, setIsFeedbackAccessDeniedOpen] = useState(false);
  const [isCheckingFeedbackAccess, setIsCheckingFeedbackAccess] = useState(false);

  const selectedTier = SUPPORT_TIERS[0] ?? null;
  const qrCodeUrl = selectedTier?.paymentQrUrls[paymentChannel] ?? null;

  const startSupport = async () => {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    if (!selectedTier) return;
    if (!qrCodeUrl) {
      const channelLabel = paymentChannel === "wechat" ? "微信" : "支付宝";
      setErrorMessage(`${selectedTier.amountLabel} 的${channelLabel}收款码尚未配置。`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      setActiveRequestId(await createSupportRequest({ paymentChannel }));
    } catch (error) {
      setErrorMessage(getSupportErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordPaymentEvent = async (
    eventType: "payment_cancelled" | "payment_claimed_paid" | "payment_expired",
    paymentReferenceLast4?: string,
  ) => {
    if (!activeRequestId) return;
    setIsProcessingPayment(true);
    setErrorMessage("");
    try {
      const status = await recordSupportRequestEvent(activeRequestId, eventType, paymentReferenceLast4);
      setActiveRequestId(null);
      if (status === "expired") {
        toast.info("本次付款已超时，请重新发起。");
      } else if (eventType === "payment_claimed_paid") {
        toast.success("感谢你的支持，付款信息已提交。");
      } else {
        toast.success("已记录本次取消操作。");
      }
    } catch (error) {
      setErrorMessage(getSupportErrorMessage(error));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openSupporterFeedback = async () => {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    setIsCheckingFeedbackAccess(true);
    try {
      if (await canAccessSupporterFeedback()) {
        setIsFeedbackDialogOpen(true);
      } else {
        setIsFeedbackAccessDeniedOpen(true);
      }
    } catch {
      toast.error("暂时无法验证支持者身份，请稍后重试。");
    } finally {
      setIsCheckingFeedbackAccess(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:py-16">
      <PageIntro
        className="mx-auto mb-10 max-w-3xl"
        align="center"
        eyebrow="SUPPORT"
        title="支持 AisenLens"
        description="如果 AisenLens 对你有所帮助，欢迎支持我们继续打磨它。"
      />

      <SurfaceCard className="mb-6 flex flex-col justify-between border-accent/20 bg-accent/[0.04] p-6 sm:flex-row sm:items-end sm:gap-8">
        <div>
          <p className="font-mono text-xs tracking-widest text-accent">CO-CREATION</p>
          <h2 className="mt-3 font-display text-2xl font-bold text-white">支持者共创通道</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">你的建议会帮助我们确定产品优化方向。欢迎分享真实体验、提出功能想法，或报名优先体验测试功能。</p>
        </div>
        <Button type="button" disabled={isCheckingFeedbackAccess} onClick={() => void openSupporterFeedback()} className="mt-7 h-11 w-full shrink-0 rounded-xl bg-accent font-semibold text-white hover:bg-accent/90 sm:mt-0 sm:w-auto">
          <MessageSquarePlus className="size-4" />
          {isCheckingFeedbackAccess ? "正在验证身份…" : "提交专属反馈"}
        </Button>
      </SurfaceCard>

      {selectedTier && (
        <SurfaceCard className="mb-10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-3xl">{selectedTier.emoji}</span>
              <div>
                <p className="font-mono text-xs tracking-widest text-accent">SUPPORT</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-white">请开发者喝一杯咖啡</h2>
              </div>
            </div>
            <span className={`self-start rounded-full border px-3 py-1 font-mono text-sm font-bold sm:self-auto ${selectedTier.colorClassName} ${selectedTier.badgeClassName}`}>{selectedTier.amountLabel}</span>
          </div>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 font-mono text-xs tracking-wider text-text-muted">支付方式</p>
              <div className="flex flex-wrap gap-3">
                {(["wechat", "alipay"] as const).map((channel) => (
                  <Button key={channel} type="button" variant="outline" onClick={() => { setPaymentChannel(channel); setErrorMessage(""); }} className={`rounded-xl ${paymentChannel === channel ? "border-accent bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent" : "border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white"}`}>
                    {channel === "wechat" ? "微信支付" : "支付宝"}
                  </Button>
                ))}
              </div>
            </div>
            <Button type="button" onClick={() => void startSupport()} disabled={isSubmitting} className="h-11 rounded-xl bg-accent px-8 font-semibold text-white hover:bg-accent/90">
              {isSubmitting ? "正在创建请求…" : `去支持 ${selectedTier.amountLabel}`}
            </Button>
          </div>

          {errorMessage && <p role="alert" className="mt-5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{errorMessage}</p>}
        </SurfaceCard>
      )}

      <RedemptionCodeCard isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} />

      <div className="border-t border-border py-10 text-center">
        <p className="mb-3 font-mono text-xs text-text-muted">Made with ♥ by</p>
        <p className="mb-2 font-display text-2xl font-black text-white">AisenLens</p>
      </div>

      <SupporterFeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} />
      <SupporterFeedbackAccessDialog open={isFeedbackAccessDeniedOpen} onOpenChange={setIsFeedbackAccessDeniedOpen} onNavigateToFeedback={() => { setIsFeedbackAccessDeniedOpen(false); onNavigate(6); }} />
      {activeRequestId && selectedTier && qrCodeUrl && <SupportPaymentModal tier={selectedTier} paymentChannel={paymentChannel} qrCodeUrl={qrCodeUrl} isProcessing={isProcessingPayment} errorMessage={errorMessage} onCancel={() => void recordPaymentEvent("payment_cancelled")} onClaimPaid={(paymentReferenceLast4) => void recordPaymentEvent("payment_claimed_paid", paymentReferenceLast4)} onExpire={() => void recordPaymentEvent("payment_expired")} />}
    </div>
  );
}
