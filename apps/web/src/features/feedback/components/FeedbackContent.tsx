import PageIntro from "../../../components/layout/PageIntro";
import SurfaceCard from "../../../components/ui/surface-card";
import FeedbackForm from "./FeedbackForm";

interface FeedbackContentProps {
  isLoggedIn: boolean;
  onRequireAuth: () => void;
}

export default function FeedbackContent({ isLoggedIn, onRequireAuth }: FeedbackContentProps) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageIntro className="mb-12 max-w-2xl" eyebrow="FEEDBACK" title="反馈与建议" description="将问题、想法和真实体验告诉我们。每一条具体反馈，都会帮助 AisenLens 持续变得更好。" />

      <SurfaceCard className="p-6 sm:p-8">
        <div className="mb-7">
          <h2 className="font-display text-2xl font-bold text-white">提交反馈</h2>
          <p className="mt-1 text-sm text-text-muted">反馈会关联当前登录账号，无需重复填写联系方式。</p>
        </div>
        <FeedbackForm isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} />
      </SurfaceCard>
    </div>
  );
}
