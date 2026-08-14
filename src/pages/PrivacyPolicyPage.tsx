const SECTIONS = [
  {
    title: "1. 概述",
    content: "AisenLens 高度重视您的隐私。本隐私政策说明了我们如何收集、使用、存储和保护您的信息。请在使用本产品前仔细阅读本政策。",
  },
  {
    title: "2. 我们收集的信息",
    content: "项目库：AisenLens 的项目数据（视频引用、分镜批注、分析内容）均存储于您的本地浏览器，不会上传至任何服务器。\n\n反馈表单：若您主动提交反馈，我们会保存您填写的内容，并将其关联至当前登录账号，用于处理反馈和必要沟通。",
  },
  {
    title: "3. 本地数据存储",
    content: "本产品使用浏览器本地存储（LocalStorage / IndexedDB）保存您的项目数据。这些数据仅存在于您的设备上，AisenLens 无法访问。清除浏览器数据将永久删除您的本地项目，请定期导出备份。",
  },
  {
    title: "4. Cookies 与追踪",
    content: "AisenLens 不使用任何第三方追踪脚本、广告 Cookie 或用户行为分析工具。我们可能使用必要的技术 Cookie 维持会话状态，这些 Cookie 不包含任何个人识别信息。",
  },
  {
    title: "5. 第三方服务",
    content: "本产品可能包含指向第三方网站的链接（如 B 站教程）。这些网站有其独立的隐私政策，AisenLens 不对其内容或隐私实践负责。建议您在访问第三方网站前阅读其隐私政策。",
  },
  {
    title: "6. 未成年人保护",
    content: "本产品面向 13 岁及以上用户。若您未满 13 岁，请在监护人的陪同和监督下使用本产品。若我们发现收集了未成年人的个人信息，将立即删除。",
  },
  {
    title: "7. 您的权利",
    content: "您对本地存储的数据拥有完全控制权，可随时通过浏览器设置清除所有数据。如您通过反馈表单提交了个人信息，可发邮件至 aisenhub@163.com 申请删除。",
  },
  {
    title: "8. 政策更新",
    content: "我们可能不定期更新本隐私政策。更新后的版本将在本页面公示，重大变更将提前通过站内通知告知。继续使用本产品即视为接受更新后的政策。",
  },
  {
    title: "9. 联系我们",
    content: "如对本隐私政策有任何疑问或建议，请发送邮件至 aisenhub@163.com，我们将在工作日 48 小时内回复。",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-12">
        <p className="font-mono text-accent/60 text-xs tracking-widest mb-3">LEGAL</p>
        <h1 className="font-display font-black text-white mb-3" style={{ fontSize: "clamp(2.4rem,5vw,3.5rem)" }}>
          隐私政策
        </h1>
        <p className="text-text-muted text-sm font-mono">最后更新：2026 年 8 月 11 日</p>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/5 px-6 py-4 mb-8 flex items-start gap-3">
        <span className="text-accent text-lg shrink-0 mt-0.5">◎</span>
        <p className="text-text-dim text-sm leading-relaxed">
          <span className="text-white font-medium">重要：</span>
          AisenLens 的项目数据均存储于您本地设备，我们无法访问。
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {SECTIONS.map((sec) => (
          <SurfaceCard key={sec.title} className="p-6">
            <h2 className="font-display font-bold text-white text-lg mb-3">{sec.title}</h2>
            <p className="text-text-dim text-sm leading-relaxed whitespace-pre-line">{sec.content}</p>
          </SurfaceCard>
        ))}
      </div>

      <div className="mt-10 py-6 border-t border-border text-center">
        <p className="text-text-muted text-xs font-mono">© 2026 AisenLens · 如有疑问请联系 aisenhub@163.com</p>
      </div>
    </div>
  );
}
import SurfaceCard from "../components/ui/surface-card";
