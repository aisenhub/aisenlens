import TutorialsContent from "../features/tutorials/components/TutorialsContent";

interface TutorialsPageProps {
  onNavigate: (page: number) => void;
}

export default function TutorialsPage({ onNavigate }: TutorialsPageProps) {
  return <TutorialsContent onNavigate={onNavigate} />;
}
