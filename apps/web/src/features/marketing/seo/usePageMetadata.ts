import { useEffect } from "react";
import { DEFAULT_PAGE_METADATA, getPageMetadata, SITE_URL } from "./siteMetadata";

const setMeta = (attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
};

export default function usePageMetadata(pathname: string) {
  useEffect(() => {
    const metadata = getPageMetadata(pathname);
    const canonicalUrl = new URL(pathname, SITE_URL).toString();

    document.title = metadata.title;
    setMeta("name", "description", metadata.description);
    setMeta("name", "robots", metadata.indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow");
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("name", "twitter:title", metadata.title);
    setMeta("name", "twitter:description", metadata.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;

    const existingStructuredData = document.getElementById("aisenlens-software-application");
    if (pathname !== "/") {
      existingStructuredData?.remove();
      return;
    }

    const structuredData = existingStructuredData ?? document.createElement("script");
    structuredData.id = "aisenlens-software-application";
    structuredData.setAttribute("type", "application/ld+json");
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AisenLens",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web Browser",
      description: DEFAULT_PAGE_METADATA.description,
      url: SITE_URL,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
    });
    if (!existingStructuredData) document.head.append(structuredData);
  }, [pathname]);
}
