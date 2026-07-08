import { useEffect } from "react";

interface MetaConfig {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  canonical?: string;
  noindex?: boolean;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function useMeta({ title, description, ogTitle, ogDescription, canonical, noindex }: MetaConfig) {
  useEffect(() => {
    const fullTitle = title.includes("Texerra") ? title : `${title} | Texerra`;
    document.title = fullTitle;

    setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large");

    setMeta("og:title", ogTitle ?? fullTitle, "property");
    setMeta("og:description", ogDescription ?? description, "property");
    setMeta("twitter:title", ogTitle ?? fullTitle, "name");
    setMeta("twitter:description", ogDescription ?? description, "name");

    const canon = canonical ?? (typeof window !== "undefined" ? `https://texerra.site${window.location.pathname}` : "");
    if (canon) {
      setCanonical(canon);
      setMeta("og:url", canon, "property");
    }
  }, [title, description, ogTitle, ogDescription, canonical, noindex]);
}
