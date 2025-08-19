import { useEffect } from 'react';

export type SEOOptions = {
  title?: string;
  description?: string;
  url?: string; // absolute preferred
  image?: string; // absolute or /path
  siteName?: string;
  twitterHandle?: string; // like @handle
};

export function useSEO(opts: SEOOptions) {
  useEffect(() => {
    const {
      title,
      description,
      url = typeof window !== 'undefined' ? window.location.href : undefined,
      image,
      siteName,
      twitterHandle,
    } = opts || {};

    if (title) document.title = title;

    const ensure = (selector: string, create: () => HTMLElement) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) { el = create(); document.head.appendChild(el); }
      return el as HTMLElement;
    };

    if (description) {
      const metaDesc = ensure('meta[name="description"]', () => {
        const m = document.createElement('meta'); m.setAttribute('name', 'description'); return m;
      });
      metaDesc.setAttribute('content', description);
    }

    // Open Graph
    if (title) ensure('meta[property="og:title"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m; }).setAttribute('content', title);
    if (description) ensure('meta[property="og:description"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m; }).setAttribute('content', description);
    if (url) ensure('meta[property="og:url"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m; }).setAttribute('content', url);
    if (siteName) ensure('meta[property="og:site_name"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:site_name'); return m; }).setAttribute('content', siteName);
    if (image) ensure('meta[property="og:image"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:image'); return m; }).setAttribute('content', image);

    // Twitter
    if (title) ensure('meta[name="twitter:title"]', () => { const m = document.createElement('meta'); m.setAttribute('name', 'twitter:title'); return m; }).setAttribute('content', title);
    if (description) ensure('meta[name="twitter:description"]', () => { const m = document.createElement('meta'); m.setAttribute('name', 'twitter:description'); return m; }).setAttribute('content', description);
    if (image) ensure('meta[name="twitter:image"]', () => { const m = document.createElement('meta'); m.setAttribute('name', 'twitter:image'); return m; }).setAttribute('content', image);
    if (twitterHandle) ensure('meta[name="twitter:site"]', () => { const m = document.createElement('meta'); m.setAttribute('name', 'twitter:site'); return m; }).setAttribute('content', twitterHandle);
  }, [opts?.title, opts?.description, opts?.url, opts?.image, opts?.siteName, opts?.twitterHandle]);
}
