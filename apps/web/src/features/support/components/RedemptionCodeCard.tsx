import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import SurfaceCard from "../../../components/ui/surface-card";
import { redeemSupportCode } from "../../../services/supabase/redemption";

interface RedemptionCodeCardProps {
  isLoggedIn: boolean;
  onRequireAuth: () => void;
}

const REDEMPTION_CODE_PATTERN = /^AL-[0-9A-F]{20}$/;

function getRedemptionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("authentication is required")) return "请先登录，再兑换支持码。";
  if (message.includes("already redeemed")) return "你已领取过这个兑换活动。";
  if (message.includes("no longer available")) return "该兑换码已被使用或已失效。";
  if (message.includes("campaign is unavailable") || message.includes("campaign has reached")) return "该兑换活动暂不可用。";
  if (message.includes("invalid redemption code")) return "兑换码无效，请检查后重试。";
  return "兑换失败，请稍后重试。";
}

export default function RedemptionCodeCard({ isLoggedIn, onRequireAuth }: RedemptionCodeCardProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setErrorMessage("请输入兑换码。");
      return;
    }

    if (!REDEMPTION_CODE_PATTERN.test(normalizedCode)) {
      setErrorMessage("兑换码格式不正确，应为 AL- 加 20 位字符。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await redeemSupportCode(normalizedCode);
      setCode("");
      toast.success("已领取支持者身份。");
    } catch (error) {
      setErrorMessage(getRedemptionErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SurfaceCard className="mb-10 p-6 sm:p-8">
      <p className="font-mono text-xs tracking-widest text-accent">REDEEM CODE</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-white">兑换支持码</h2>
      <form onSubmit={(event) => void submit(event)} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="例如 AL-XXX" autoComplete="off" maxLength={23} className="h-11 flex-1 border-border bg-bg-input px-4 font-mono text-white placeholder:text-text-muted" />
        <Button type="submit" disabled={isSubmitting} className="h-11 rounded-xl bg-accent px-7 font-semibold text-white hover:bg-accent/90">{isSubmitting ? "兑换中…" : "立即兑换"}</Button>
      </form>
      {errorMessage && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{errorMessage}</p>}
    </SurfaceCard>
  );
}
