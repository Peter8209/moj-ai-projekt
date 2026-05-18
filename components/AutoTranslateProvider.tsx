'use client';

import { useEffect, useRef } from 'react';
import { normalizeLanguage, type AppLanguage } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'SVG',
  'PATH',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
]);

function isValidLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldSkipText(value: string) {
  const text = cleanText(value);

  if (!text) return true;
  if (text.length < 2) return true;
  if (/^[\d\s.,€%+\-/:()]+$/.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[A-Z0-9_-]{2,20}$/.test(text)) return true;

  return false;
}

function isInsideSkippedElement(node: Node) {
  let current: Node | null = node.parentNode;

  while (current) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      SKIP_TAGS.has((current as HTMLElement).tagName)
    ) {
      return true;
    }

    const element = current as HTMLElement;

    if (element?.dataset?.noTranslate === 'true') {
      return true;
    }

    current = current.parentNode;
  }

  return false;
}

function collectTextNodes(root: ParentNode) {
  const nodes: Text[] = [];

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (isInsideSkippedElement(node)) {
          return NodeFilter.FILTER_REJECT;
        }

        const text = cleanText(node.textContent);

        if (shouldSkipText(text)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let current = walker.nextNode();

  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  return nodes;
}

function collectTranslatableAttributes(root: ParentNode) {
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[placeholder], [title], [aria-label], [alt]',
    ),
  );

  const items: {
    element: HTMLElement;
    attribute: string;
    value: string;
  }[] = [];

  elements.forEach((element) => {
    if (SKIP_TAGS.has(element.tagName)) return;
    if (element.dataset.noTranslate === 'true') return;

    ['placeholder', 'title', 'aria-label', 'alt'].forEach((attribute) => {
      const value = element.getAttribute(attribute);

      if (!value || shouldSkipText(value)) return;

      items.push({
        element,
        attribute,
        value: cleanText(value),
      });
    });
  });

  return items;
}

async function requestTranslations(language: AppLanguage, texts: string[]) {
  const uniqueTexts = Array.from(new Set(texts)).filter(
    (item) => !shouldSkipText(item),
  );

  if (uniqueTexts.length === 0) {
    return {};
  }

  const cacheKey = `zedpera_ui_translation_cache_${language}`;
  const cachedRaw = localStorage.getItem(cacheKey);
  const cached = cachedRaw ? JSON.parse(cachedRaw) : {};

  const missing = uniqueTexts.filter((text) => !cached[text]);

  if (missing.length === 0) {
    return cached as Record<string, string>;
  }

  const response = await fetch('/api/translate-ui', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language,
      texts: missing,
    }),
  });

  if (!response.ok) {
    throw new Error('TRANSLATE_UI_REQUEST_FAILED');
  }

  const data = await response.json();

  const translations = {
    ...cached,
    ...(data.translations || {}),
  };

  localStorage.setItem(cacheKey, JSON.stringify(translations));

  return translations as Record<string, string>;
}

export default function AutoTranslateProvider() {
  const observerRef = useRef<MutationObserver | null>(null);
  const translatingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function translatePage() {
      if (translatingRef.current) return;

      const selectedLanguage = normalizeLanguage(
        localStorage.getItem(LANGUAGE_STORAGE_KEY),
      );

      if (!isValidLanguage(selectedLanguage)) return;

      document.documentElement.lang = selectedLanguage;

      if (selectedLanguage === 'sk') {
        window.location.reload();
        return;
      }

      translatingRef.current = true;

      try {
        const textNodes = collectTextNodes(document.body);
        const attributeItems = collectTranslatableAttributes(document.body);

        const originalTexts = [
          ...textNodes.map((node) => cleanText(node.textContent)),
          ...attributeItems.map((item) => item.value),
        ];

        const translations = await requestTranslations(
          selectedLanguage,
          originalTexts,
        );

        textNodes.forEach((node) => {
          const original = cleanText(node.textContent);
          const translated = translations[original];

          if (translated && translated !== original) {
            node.textContent = String(node.textContent || '').replace(
              original,
              translated,
            );
          }
        });

        attributeItems.forEach((item) => {
          const translated = translations[item.value];

          if (translated && translated !== item.value) {
            item.element.setAttribute(item.attribute, translated);
          }
        });
      } catch (error) {
        console.error('AUTO_TRANSLATE_PAGE_ERROR:', error);
      } finally {
        translatingRef.current = false;
      }
    }

    function scheduleTranslate() {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        void translatePage();
      }, 500);
    }

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppLanguage>;
      const nextLanguage = customEvent.detail;

      if (isValidLanguage(nextLanguage)) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      }

      scheduleTranslate();
    };

    window.addEventListener('zedpera-language-change', handleLanguageChange);
    window.addEventListener('focus', scheduleTranslate);

    observerRef.current = new MutationObserver(() => {
      scheduleTranslate();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    scheduleTranslate();

    return () => {
      window.removeEventListener(
        'zedpera-language-change',
        handleLanguageChange,
      );
      window.removeEventListener('focus', scheduleTranslate);

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      observerRef.current?.disconnect();
    };
  }, []);

  return null;
}