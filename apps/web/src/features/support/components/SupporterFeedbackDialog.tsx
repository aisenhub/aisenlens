import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import FeedbackForm from "../../feedback/components/FeedbackForm";

interface SupporterFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn: boolean;
  onRequireAuth: () => void;
}

export default function SupporterFeedbackDialog({ open, onOpenChange, isLoggedIn, onRequireAuth }: SupporterFeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border border-border bg-bg-card p-6 text-text-base sm:max-w-xl sm:p-8">
        <DialogHeader className="pr-8">
          <p className="font-mono text-xs tracking-widest text-accent">SUPPORTER</p>
          <DialogTitle className="font-display text-2xl font-bold text-white">支持者专属反馈</DialogTitle>
          <DialogDescription className="leading-relaxed text-text-muted">欢迎提出功能建议、分享使用体验或报告问题。你的反馈会直接进入 AisenLens 的产品优化流程。</DialogDescription>
        </DialogHeader>
        <FeedbackForm isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} source="supporter" submitLabel="提交专属反馈" onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
