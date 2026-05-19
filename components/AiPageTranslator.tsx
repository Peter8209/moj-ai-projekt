'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeLanguage, type AppLanguage } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';
const TRANSLATION_CACHE_PREFIX = 'zedpera_auto_ui_v1';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'CODE',
  'PRE',
  'SVG',
  'PATH',
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

function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'sk';

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isValidLanguage(saved)) return saved;

  return normalizeLanguage(
    window.navigator.languages?.[0] || window.navigator.language || 'sk',
  );
}

function cleanText(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function shouldSkipText(value: string) {
  const text = cleanText(value);

  if (!text) return true;
  if (text.length < 2) return true;
  if (text.length > 600) return true;

  if (/^[\d\s.,€%+\-/:()]+$/.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[A-Z0-9_-]{2,25}$/.test(text)) return true;
  if (/^[{}[\]().,;:!?+\-*/="'`~<>|\\]+$/.test(text)) return true;

  return false;
}

function elementShouldBeSkipped(element: Element | null) {
  if (!element) return true;

  const tagName = element.tagName;

  if (SKIP_TAGS.has(tagName)) return true;

  if (element.closest('[data-no-translate="true"]')) return true;
  if (element.closest('[data-ai-output="true"]')) return true;
  if (element.closest('[contenteditable="true"]')) return true;

  return false;
}

function collectTextNodes(root: HTMLElement) {
  const nodes: Text[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (!parent) return NodeFilter.FILTER_REJECT;
      if (elementShouldBeSkipped(parent)) return NodeFilter.FILTER_REJECT;

      const text = cleanText(node.textContent || '');

      if (shouldSkipText(text)) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode();

  while (currentNode) {
    nodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  return nodes;
}

function collectTranslatableAttributes(root: HTMLElement) {
  const items: Array<{
    element: HTMLElement;
    attribute: 'placeholder' | 'title' | 'aria-label';
    value: string;
  }> = [];

  const elements = root.querySelectorAll<HTMLElement>(
    '[placeholder], [title], [aria-label]',
  );

  elements.forEach((element) => {
    if (elementShouldBeSkipped(element)) return;

    const attributes: Array<'placeholder' | 'title' | 'aria-label'> = [
      'placeholder',
      'title',
      'aria-label',
    ];

    attributes.forEach((attribute) => {
      const value = cleanText(element.getAttribute(attribute) || '');

      if (!shouldSkipText(value)) {
        items.push({
          element,
          attribute,
          value,
        });
      }
    });
  });

  return items;
}

function getCacheKey(language: AppLanguage, text: string) {
  return `${TRANSLATION_CACHE_PREFIX}_${language}_${text}`;
}

function readCachedTranslation(language: AppLanguage, text: string) {
  try {
    return window.localStorage.getItem(getCacheKey(language, text));
  } catch {
    return null;
  }
}

function writeCachedTranslation(
  language: AppLanguage,
  source: string,
  translated: string,
) {
  try {
    window.localStorage.setItem(getCacheKey(language, source), translated);
  } catch {
    // localStorage môže byť plný alebo blokovaný
  }
}

async function translateTexts(language: AppLanguage, texts: string[]) {
  const uniqueTexts = Array.from(new Set(texts.map(cleanText).filter(Boolean)));

  if (uniqueTexts.length === 0) return {};

  const cachedTranslations: Record<string, string> = {};
  const missingTexts: string[] = [];

  uniqueTexts.forEach((text) => {
    const cached = readCachedTranslation(language, text);

    if (cached) {
      cachedTranslations[text] = cached;
    } else {
      missingTexts.push(text);
    }
  });

  if (missingTexts.length === 0) {
    return cachedTranslations;
  }

  const response = await fetch('/api/translate-ui', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language,
      texts: missingTexts.slice(0, 160),
    }),
  });

  if (!response.ok) {
    throw new Error('UI preklad zlyhal.');
  }

  const data = await response.json();

  const translations = data?.translations || {};

  Object.entries(translations).forEach(([source, translated]) => {
    if (typeof translated === 'string' && translated.trim()) {
      cachedTranslations[source] = translated;
      writeCachedTranslation(language, source, translated);
    }
  });

  return cachedTranslations;
}

export default function AiPageTranslator() {
  const [language, setLanguage] = useState<AppLanguage>('sk');
  const translatingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const translatePage = useCallback(
    async (nextLanguage: AppLanguage) => {
      if (typeof window === 'undefined') return;
      if (translatingRef.current) return;

      const root = document.body;

      if (!root) return;

      if (nextLanguage === 'sk') {
        document.documentElement.lang = 'sk';
        return;
      }

      translatingRef.current = true;
      document.documentElement.lang = nextLanguage;

      try {
        const textNodes = collectTextNodes(root);
        const attributeItems = collectTranslatableAttributes(root);

        const textValues = textNodes
          .map((node) => cleanText(node.textContent || ''))
          .filter((item) => !shouldSkipText(item));

        const attributeValues = attributeItems
          .map((item) => item.value)
          .filter((item) => !shouldSkipText(item));

        const allTexts = [...textValues, ...attributeValues];

        const translations = await translateTexts(nextLanguage, allTexts);

        textNodes.forEach((node) => {
          const original = cleanText(node.textContent || '');
          const translated = translations[original];

          if (translated && translated !== original) {
            node.textContent = translated;
          }
        });

        attributeItems.forEach((item) => {
          const translated = translations[item.value];

          if (translated && translated !== item.value) {
            item.element.setAttribute(item.attribute, translated);
          }
        });
      } catch (error) {
        console.error('AI_PAGE_TRANSLATOR_ERROR:', error);
      } finally {
        translatingRef.current = false;
      }
    },
    [],
  );

  const scheduleTranslation = useCallback(
    (nextLanguage: AppLanguage) => {
      if (typeof window === 'undefined') return;

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        void translatePage(nextLanguage);
      }, 250);
    },
    [translatePage],
  );

  useEffect(() => {
    const initialLanguage = getStoredLanguage();

    setLanguage(initialLanguage);
    document.documentElement.lang = initialLanguage;

    if (initialLanguage !== 'sk') {
      scheduleTranslation(initialLanguage);
    }
  }, [scheduleTranslation]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;

      const nextLanguage = event.newValue;

      if (!isValidLanguage(nextLanguage)) return;

      setLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
      scheduleTranslation(nextLanguage);
    };

    const handleCustomLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppLanguage>;
      const nextLanguage = customEvent.detail;

      if (!isValidLanguage(nextLanguage)) return;

      setLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
      scheduleTranslation(nextLanguage);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(
      'zedpera-language-change',
      handleCustomLanguageChange,
    );

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        'zedpera-language-change',
        handleCustomLanguageChange,
      );
    };
  }, [scheduleTranslation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.body;

    if (!root) return;

    observerRef.current?.disconnect();

    observerRef.current = new MutationObserver(() => {
      const currentLanguage = getStoredLanguage();

      if (currentLanguage !== 'sk') {
        setLanguage(currentLanguage);
        scheduleTranslation(currentLanguage);
      }
    });

    observerRef.current.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => {
      observerRef.current?.disconnect();

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [language, scheduleTranslation]);

  return null;
}