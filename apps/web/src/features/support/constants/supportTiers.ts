import alipaySupportQr from "../../../assets/payments/alipay.jpg";
import wechatSupportQr from "../../../assets/payments/wechat.jpg";
import type { SupportTier } from "../types";

export const SUPPORT_TIERS: SupportTier[] = [
  {
    id: "supporter_29_9",
    amountLabel: "¥29.9",
    emoji: "☕",
    title: "支持者",
    description: "请开发者喝一杯咖啡。",
    colorClassName: "border-blue-500/25 hover:border-blue-500/50",
    badgeClassName: "text-blue-400",
    paymentQrUrls: { wechat: wechatSupportQr, alipay: alipaySupportQr },
  },
];
