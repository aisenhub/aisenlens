import SupportContent from "../features/support/components/SupportContent";

interface SupportPageProps {
  isLoggedIn: boolean;
  onRequireAuth: () => void;
  onNavigate: (page: number) => void;
}

export default function SupportPage({ isLoggedIn, onRequireAuth, onNavigate }: SupportPageProps) {
  return <SupportContent isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} onNavigate={onNavigate} />;
}
