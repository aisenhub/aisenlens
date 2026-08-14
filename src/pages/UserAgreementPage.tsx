const SECTIONS = [
  {
    title: "1. 接受条款",
    content: "欢迎使用 AisenLens（以下简称「本产品」）。在使用本产品之前，请仔细阅读以下用户协议（以下简称「本协议」）。使用本产品即表示您已阅读、理解并同意受本协议的约束。",
  },
  {
    title: "2. 服务描述",
    content: "AisenLens 是一款面向影视爱好者与创作者的拉片分析工具，提供镜头分割、多维度批注、分析报告导出等功能。核心功能完全免费，无需注册即可使用。",
  },
  {
    title: "3. 用户行为规范",
    content: "您在使用本产品时，应遵守中华人民共和国及您所在国家或地区的法律法规。您不得利用本产品从事任何侵犯他人知识产权、隐私权或其他合法权益的行为，不得上传、存储或分享任何违法内容。",
  },
  {
    title: "4. 知识产权",
    content: "本产品的所有代码、设计、文案及功能均归 AisenLens 团队所有，受中华人民共和国著作权法及相关法律法规的保护。您上传至本产品的视频内容及分析数据归您所有，AisenLens 不主张对其所有权。",
  },
  {
    title: "5. 数据存储",
    content: "项目库中的所有项目数据均存储于您本地浏览器（IndexedDB / LocalStorage），AisenLens 服务器不存储您的视频文件或分析内容。清除浏览器缓存可能导致数据丢失，请注意定期导出。",
  },
  {
    title: "6. 免责声明",
    content: "本产品按「现状」提供，不作任何明示或暗示的保证。AisenLens 不对因使用本产品导致的任何直接或间接损失承担责任，包括但不限于数据丢失、服务中断等情形。",
  },
  {
    title: "7. 协议修改",
    content: "AisenLens 保留随时修改本协议的权利。修改后的协议将在本页面更新，继续使用本产品即视为您接受修改后的协议。如有重大变更，我们将通过站内通知提前告知。",
  },
  {
    title: "8. 联系我们",
    content: "如对本协议有任何疑问，请发送邮件至 aisenhub@163.com，我们将在工作日 48 小时内回复。",
  },
];

export default function UserAgreementPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-12">
        <p className="font-mono text-accent/60 text-xs tracking-widest mb-3">LEGAL</p>
        <h1 className="font-display font-black text-white mb-3" style={{ fontSize: "clamp(2.4rem,5vw,3.5rem)" }}>
          用户协议
        </h1>
        <p className="text-text-muted text-sm font-mono">最后更新：2026 年 8 月 11 日</p>
      </div>

      <div className="flex flex-col gap-8">
        {SECTIONS.map((sec) => (
          <SurfaceCard key={sec.title} className="p-6">
            <h2 className="font-display font-bold text-white text-lg mb-3">{sec.title}</h2>
            <p className="text-text-dim text-sm leading-relaxed">{sec.content}</p>
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
