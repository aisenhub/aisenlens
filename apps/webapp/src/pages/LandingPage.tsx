import LandingContent from "../features/marketing/components/LandingContent";

interface Props {
  onNavigate: (page: number) => void;
}

export default function LandingPage(props: Props) {
  return <LandingContent {...props} />;
}
