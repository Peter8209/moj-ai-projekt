'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

const STORAGE_PREFIX = 'zedpera_ai_ui_translation_';

const ignoredTags = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'CODE',
  'PRE',
  'SVG',
  'PATH',
]);

const translatableAttributes = ['placeholder', 'aria-label', 'title'];

function cleanText(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function shouldTranslateText(value: string) {
  const text = cleanText(value);

  if (!text) return false;
  if (text.length < 2) return false;
  if (text.length > 450) return false;

  if (/^[\d\s.,€%+\-/:()]+$/.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^[A-Z0-9_-]{2,20}$/.test(text)) return false;
  if (text.includes('@')) return false;

  if (text === 'Zedpera') return false;
  if (text === 'ZEDPERA') return false;

  return true;
}

function isInsideIgnoredElement(node: Node) {
  let current: Node | null = node.parentNode;

  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;

      if (ignoredTags.has(element.tagName)) {
        return true;
      }

      if (element.dataset.noTranslate === 'true') {
        return true;
      }

      if (element.closest('[data-no-translate="true"]')) {
        return true;
      }
    }

    current = current.parentNode;
  }

  return false;
}

function collectTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const text = cleanText(textNode.nodeValue || '');

    if (shouldTranslateText(text) && !isInsideIgnoredElement(textNode)) {
      nodes.push(textNode);
    }

    node = walker.nextNode();
  }

  return nodes;
}

function collectAttributeElements(root: HTMLElement) {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));

  return elements.filter((element) => {
    if (ignoredTags.has(element.tagName)) return false;
    if (element.dataset.noTranslate === 'true') return false;
    if (element.closest('[data-no-translate="true"]')) return false;

    return translatableAttributes.some((attr) => {
      const value = element.getAttribute(attr);
      return value && shouldTranslateText(value);
    });
  });
}

function getCacheKey(language: string) {
  return `${STORAGE_PREFIX}${language}`;
}

function loadCachedTranslations(language: string) {
  try {
    const raw = localStorage.getItem(getCacheKey(language));
    const parsed = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }

    return {};
  } catch {
    return {};
  }
}

function saveCachedTranslations(
  language: string,
  translations: Record<string, string>,
) {
  try {
    localStorage.setItem(getCacheKey(language), JSON.stringify(translations));
  } catch {
    // localStorage môže byť plný alebo blokovaný
  }
}

async function translateTextsWithAi(language: string, texts: string[]) {
  const uniqueTexts = Array.from(
    new Set(texts.map(cleanText).filter(Boolean)),
  );

  if (uniqueTexts.length === 0) {
    return {};
  }

  const res = await fetch('/api/translate-ui', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language,
      texts: uniqueTexts,
    }),
  });

  if (!res.ok) {
    throw new Error(`Translate UI failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data?.ok || !data?.translations) {
    return {};
  }

  return data.translations as Record<string, string>;
}

export default function AutoTranslateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { language } = useLanguage();

  const [isUiTranslating, setIsUiTranslating] = useState(false);

  const originalTextMapRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const originalAttributeMapRef = useRef<
    WeakMap<HTMLElement, Record<string, string>>
  >(new WeakMap());

  const isTranslatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const restoreOriginalTexts = () => {
      const root = document.body;
      if (!root) return;

      const nodes = collectTextNodes(root);

      for (const node of nodes) {
        const original = originalTextMapRef.current.get(node);

        if (original) {
          node.nodeValue = original;
        }
      }

      const attributeElements = collectAttributeElements(root);

      for (const element of attributeElements) {
        const attributes = originalAttributeMapRef.current.get(element);

        if (!attributes) continue;

        for (const attr of translatableAttributes) {
          const original = attributes[attr];

          if (original) {
            element.setAttribute(attr, original);
          }
        }
      }
    };

    const applyTranslationsToPage = (
      nodes: Text[],
      attributeElements: HTMLElement[],
      translations: Record<string, string>,
    ) => {
      for (const node of nodes) {
        const original = originalTextMapRef.current.get(node);
        if (!original) continue;

        const translated = translations[original];

        if (translated && translated.trim()) {
          node.nodeValue = translated;
        }
      }

      for (const element of attributeElements) {
        const attributes = originalAttributeMapRef.current.get(element);

        if (!attributes) continue;

        for (const attr of translatableAttributes) {
          const original = attributes[attr];
          const translated = translations[original];

          if (translated && translated.trim()) {
            element.setAttribute(attr, translated);
          }
        }
      }
    };

    const runTranslation = async () => {
      if (cancelled) return;
      if (typeof window === 'undefined') return;
      if (!document.body) return;
      if (isTranslatingRef.current) return;

      isTranslatingRef.current = true;

      try {
        const root = document.body;

        const nodes = collectTextNodes(root);
        const attributeElements = collectAttributeElements(root);

        for (const node of nodes) {
          if (!originalTextMapRef.current.has(node)) {
            originalTextMapRef.current.set(
              node,
              cleanText(node.nodeValue || ''),
            );
          }
        }

        for (const element of attributeElements) {
          if (!originalAttributeMapRef.current.has(element)) {
            const attributes: Record<string, string> = {};

            for (const attr of translatableAttributes) {
              const value = cleanText(element.getAttribute(attr) || '');

              if (shouldTranslateText(value)) {
                attributes[attr] = value;
              }
            }

            originalAttributeMapRef.current.set(element, attributes);
          }
        }

        if (language === 'sk') {
          restoreOriginalTexts();
          setIsUiTranslating(false);
          return;
        }

        const cachedTranslations = loadCachedTranslations(language);

        const sourceTextNodes = nodes
          .map((node) => originalTextMapRef.current.get(node) || '')
          .map(cleanText)
          .filter(shouldTranslateText);

        const sourceAttributeTexts = attributeElements.flatMap((element) => {
          const attributes = originalAttributeMapRef.current.get(element);

          if (!attributes) return [];

          return translatableAttributes
            .map((attr) => attributes[attr])
            .map((value) => cleanText(value || ''))
            .filter(shouldTranslateText);
        });

        const sourceTexts = Array.from(
          new Set([...sourceTextNodes, ...sourceAttributeTexts]),
        );

        const missingTexts = sourceTexts.filter(
          (text) => !cachedTranslations[text],
        );

        if (Object.keys(cachedTranslations).length > 0) {
          applyTranslationsToPage(nodes, attributeElements, cachedTranslations);
        }

        let newTranslations: Record<string, string> = {};

        if (missingTexts.length > 0) {
          setIsUiTranslating(true);
          newTranslations = await translateTextsWithAi(language, missingTexts);
        }

        if (cancelled) return;

        const mergedTranslations = {
          ...cachedTranslations,
          ...newTranslations,
        };

        saveCachedTranslations(language, mergedTranslations);
        applyTranslationsToPage(nodes, attributeElements, mergedTranslations);
      } catch (error) {
        console.error('AUTO_TRANSLATE_PROVIDER_ERROR:', error);
      } finally {
        isTranslatingRef.current = false;

        if (!cancelled) {
          setIsUiTranslating(false);
        }
      }
    };

    const scheduleTranslation = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        void runTranslation();
      }, 250);
    };

    restoreOriginalTexts();
    scheduleTranslation();

    observer = new MutationObserver(() => {
      scheduleTranslation();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes,
    });

    window.addEventListener('zedpera-language-change', scheduleTranslation);

    return () => {
      cancelled = true;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (observer) {
        observer.disconnect();
      }

      window.removeEventListener('zedpera-language-change', scheduleTranslation);
    };
  }, [language]);

  return (
    <>
      {children}

      {isUiTranslating && language !== 'sk' ? (
        <div
          data-no-translate="true"
          className="fixed bottom-4 right-4 z-[9999] rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-bold text-slate-800 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-white/10 dark:bg-[#020617]/95 dark:text-white"
        >
          Prekladám rozhranie…
        </div>
      ) : null}
    </>
  );
}