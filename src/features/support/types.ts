export type PaymentChannel = "wechat" | "alipay";

export interface SupportTier {
  id: string;
  amountLabel: string;
  emoji: string;
  title: string;
  description: string;
  colorClassName: string;
  badgeClassName: string;
  paymentQrUrls: Record<PaymentChannel, string | null>;
}
