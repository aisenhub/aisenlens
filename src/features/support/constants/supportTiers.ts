import type { SupportTier } from "../types";
import wechatFlowerQr from "../../../assets/payments/wechat-flower-9-9.jpg";

export const SUPPORT_TIERS: SupportTier[] = [
  { id: "flower", amountLabel: "¥9.9", emoji: "🌷", title: "送我一朵花", description: "一朵小花，代表你的小小心意。", colorClassName: "border-pink-500/25 hover:border-pink-500/50", badgeClassName: "text-pink-400", paymentQrUrls: { wechat: wechatFlowerQr, alipay: null } },
  { id: "burger", amountLabel: "¥19.9", emoji: "🍔", title: "请我吃个汉堡", description: "让开发者今天的午餐有点着落。", colorClassName: "border-orange-500/25 hover:border-orange-500/50", badgeClassName: "text-orange-400", paymentQrUrls: { wechat: null, alipay: null } },
  { id: "coffee", amountLabel: "¥29.9", emoji: "☕", title: "请我喝杯咖啡", description: "一杯咖啡，驱动功能迭代与 Bug 修复。", colorClassName: "border-amber-500/25 hover:border-amber-500/50", badgeClassName: "text-amber-400", paymentQrUrls: { wechat: null, alipay: null } },
  { id: "movie", amountLabel: "¥49.9", emoji: "🎬", title: "请我看场电影", description: "用一场电影回馈电影人。", colorClassName: "border-blue-500/25 hover:border-blue-500/50", badgeClassName: "text-blue-400", paymentQrUrls: { wechat: null, alipay: null } },
  { id: "meal", amountLabel: "¥99", emoji: "🍽️", title: "请我吃顿好的", description: "感谢你为项目持续发展提供能量。", colorClassName: "border-green-500/25 hover:border-green-500/50", badgeClassName: "text-green-400", paymentQrUrls: { wechat: null, alipay: null } },
  { id: "patron", amountLabel: "¥199", emoji: "🌟", title: "成为共创支持者", description: "感谢你对 AisenLens 的长期信任。", colorClassName: "border-violet-500/25 hover:border-violet-500/50", badgeClassName: "text-violet-400", paymentQrUrls: { wechat: null, alipay: null } },
];
