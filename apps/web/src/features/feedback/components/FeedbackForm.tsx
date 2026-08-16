import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { createFeedbackRequest } from "../../../services/supabase/feedback";
import { FEEDBACK_KINDS } from "../constants/feedbackOptions";
import type { FeedbackKind, FeedbackSource } from "../types";

interface FeedbackFormProps {
  isLoggedIn: boolean;
  onRequireAuth: () => void;
  onSuccess?: () => void;
  submitLabel?: string;
  source?: FeedbackSource;
}

function getFeedbackErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "反馈提交失败，请稍后重试。";
  return message.toLowerCase().includes("authentication is required") ? "请先登录，再提交反馈。" : message;
}

export default function FeedbackForm({ isLoggedIn, onRequireAuth, onSuccess, submitLabel = "提交反馈", source = "general" }: FeedbackFormProps) {
  const [kind, setKind] = useState<FeedbackKind>("feature");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedContent = content.trim();

    if (normalizedTitle.length < 3) {
      setErrorMessage("请填写至少 3 个字的反馈标题。");
      return;
    }
    if (normalizedContent.length < 10) {
      setErrorMessage("请填写至少 10 个字的反馈内容。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await createFeedbackRequest({ kind, title: normalizedTitle, content: normalizedContent, source });
      setTitle("");
      setContent("");
      toast.success("反馈已提交，感谢你的帮助。");
      onSuccess?.();
    } catch (error) {
      setErrorMessage(getFeedbackErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void submitFeedback(event)}>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((feedbackKind) => {
          const option = FEEDBACK_KINDS[feedbackKind];
          const isSelected = kind === feedbackKind;
          return (
            <Button
              key={feedbackKind}
              type="button"
              variant="outline"
              onClick={() => { setKind(feedbackKind); setErrorMessage(""); }}
              className={`h-auto min-w-0 items-start whitespace-normal rounded-xl px-3 py-3 text-left ${isSelected ? "border-accent/40 bg-accent/10 text-white hover:bg-accent/15 hover:text-white" : "border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white"}`}
            >
              <span className="min-w-0">
                <span className="block break-words text-sm font-medium">{option.label}</span>
                <span className="mt-1 block break-words text-xs leading-relaxed text-text-muted">{option.description}</span>
              </span>
            </Button>
          );
        })}
      </div>

      <div className="mb-5">
        <label htmlFor="feedback-title" className="mb-2 block font-mono text-xs tracking-wider text-text-muted">反馈标题</label>
        <div className="relative">
          <Input id="feedback-title" value={title} onChange={(event) => { setTitle(event.target.value.slice(0, 80)); setErrorMessage(""); }} maxLength={80} placeholder="用一句话概括你的反馈" className="h-11 rounded-xl border-border bg-bg-input px-4 pr-14 text-text-base placeholder:text-text-muted" />
          <span className="pointer-events-none absolute right-4 top-3.5 font-mono text-xs text-text-muted">{title.length}/80</span>
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="feedback-content" className="mb-2 block font-mono text-xs tracking-wider text-text-muted">详细内容</label>
        <div className="relative">
          <Textarea id="feedback-content" value={content} onChange={(event) => { setContent(event.target.value.slice(0, 2000)); setErrorMessage(""); }} rows={8} maxLength={2000} placeholder={FEEDBACK_KINDS[kind].placeholder} className="min-h-48 resize-none rounded-xl border-border bg-bg-input px-4 py-3 pb-8 leading-relaxed text-text-base placeholder:text-text-muted" />
          <span className="pointer-events-none absolute bottom-3 right-4 font-mono text-xs text-text-muted">{content.length}/2000</span>
        </div>
      </div>

      {errorMessage && <p role="alert" className="mb-5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{errorMessage}</p>}
      <Button type="submit" disabled={isSubmitting || title.trim().length < 3 || content.trim().length < 10} className="h-11 w-full rounded-xl bg-accent font-semibold text-white hover:bg-accent/90">{isSubmitting ? "正在提交…" : submitLabel}</Button>
    </form>
  );
}
