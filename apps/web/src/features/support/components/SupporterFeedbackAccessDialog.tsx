import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

interface SupporterFeedbackAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToFeedback: () => void;
}

export default function SupporterFeedbackAccessDialog({ open, onOpenChange, onNavigateToFeedback }: SupporterFeedbackAccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border bg-bg-card p-6 text-text-base sm:max-w-md">
        <DialogHeader>
          <p className="font-mono text-xs tracking-widest text-accent">SUPPORTER FEEDBACK</p>
          <DialogTitle className="font-display text-2xl font-bold text-white">暂未获得支持者身份</DialogTitle>
          <DialogDescription className="leading-relaxed text-text-muted">专属反馈通道仅向支持者开放。你仍可以前往反馈页面提交建议或问题。</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-3 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-border text-text-dim hover:bg-white/4 hover:text-white">暂不反馈</Button>
          <Button type="button" onClick={onNavigateToFeedback} className="rounded-xl bg-accent text-white hover:bg-accent/90">前往反馈页面</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
