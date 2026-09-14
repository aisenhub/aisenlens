import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import ChangelogPage from "../pages/ChangelogPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import UserAgreementPage from "../pages/UserAgreementPage";
import LandingContent from "../features/marketing/components/LandingContent";
import SeoContentPage from "../features/marketing/components/SeoContentPage";
import { getSeoContentPage } from "../features/marketing/seo/seoContent";
import usePageMetadata from "../features/marketing/seo/usePageMetadata";
import TutorialsContent from "../features/tutorials/components/TutorialsContent";
import { webAppUrl } from "../config/urls";

const PUBLIC_PATHS = new Set([
  "/",
  "/tutorials",
  "/changelog",
  "/privacy",
  "/terms",
]);

function navigateFromLegacyPage(page: number, navigate: ReturnType<typeof useNavigate>) {
  if (page === 2) {
    window.location.assign(webAppUrl("/projects"));
    return;
  }
  if (page === 4) {
    navigate("/tutorials");
    return;
  }
  if (page === 8) {
    navigate("/changelog");
    return;
  }
  if (page === 9) {
    navigate("/terms");
    return;
  }
  if (page === 10) {
    navigate("/privacy");
    return;
  }
  navigate("/");
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const seoPage = getSeoContentPage(location.pathname);
  const isKnownPath = PUBLIC_PATHS.has(location.pathname) || Boolean(seoPage);

  usePageMetadata(location.pathname);

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  if (!isKnownPath) return <Navigate to="/" replace />;

  const onNavigate = (page: number) => navigateFromLegacyPage(page, navigate);

  let content: React.ReactNode;
  if (location.pathname === "/") {
    content = <LandingContent onNavigate={onNavigate} />;
  } else if (location.pathname === "/tutorials") {
    content = <TutorialsContent onNavigate={onNavigate} />;
  } else if (location.pathname === "/changelog") {
    content = <ChangelogPage />;
  } else if (location.pathname === "/privacy") {
    content = <PrivacyPolicyPage />;
  } else if (location.pathname === "/terms") {
    content = <UserAgreementPage />;
  } else if (seoPage) {
    content = <SeoContentPage page={seoPage} onStart={() => window.location.assign(webAppUrl("/projects"))} />;
  } else {
    return <Navigate to="/" replace />;
  }

  return <main className="min-h-screen bg-bg text-text-base">{content}</main>;
}
