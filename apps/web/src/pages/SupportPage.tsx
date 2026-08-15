import SupportContent from "../features/support/components/SupportContent";

interface SupportPageProps {
  onNavigate?: (page: number) => void;
}

export default function SupportPage({ onNavigate }: SupportPageProps) {
  return <SupportContent onNavigate={onNavigate} />;
}
