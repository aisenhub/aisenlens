import FeedbackContent from "../features/feedback/components/FeedbackContent";

interface FeedbackPageProps {
  isLoggedIn: boolean;
  onRequireAuth: () => void;
}

export default function FeedbackPage({ isLoggedIn, onRequireAuth }: FeedbackPageProps) {
  return <FeedbackContent isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} />;
}
