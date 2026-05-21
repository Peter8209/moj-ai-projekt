'use client';

import { useEffect, useRef, type ReactNode } from 'react';
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

      if (ignoredTags.has(element.tagName)) return true;
      if (element.dataset.noTranslate === 'true') return true;
      if (element.closest('[data-no-translate="true"]')) return true;
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
    // localStorage môže byť plný alebo blokovaný.
  }
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (error instanceof Error) {
    const message = String(error.message || '').toLowerCase();

    return (
      error.name === 'AbortError' ||
      message.includes('abort') ||
      message.includes('aborted')
    );
  }

  return false;
}

async function fetchTranslationBatch(language: string, texts: string[]) {
  if (!texts.length) return {};

  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort('TRANSLATE_UI_TIMEOUT');
  }, 45000);

  try {
    const res = await fetch('/api/translate-ui', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        language,
        targetLanguage: language,
        texts,
      }),
    });

    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');

      console.warn('TRANSLATE_UI_NON_JSON_RESPONSE:', {
        status: res.status,
        text: text.slice(0, 500),
      });

      return {};
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.warn('TRANSLATE_UI_RESPONSE_NOT_OK:', {
        status: res.status,
        data,
      });

      return {};
    }

    if (!data?.ok || !data?.translations) {
      console.warn('TRANSLATE_UI_INVALID_RESPONSE:', data);
      return {};
    }

    return data.translations as Record<string, string>;
  } catch (error) {
    if (isAbortError(error)) {
      console.warn('TRANSLATE_UI_BATCH_TIMEOUT_OR_ABORTED');
      return {};
    }

    console.warn('TRANSLATE_UI_BATCH_WARNING:', error);
    return {};
  } finally {
    window.clearTimeout(timeout);
  }
}

async function translateTextsWithAi(language: string, texts: string[]) {
  const uniqueTexts = Array.from(
    new Set(texts.map(cleanText).filter(Boolean)),
  ).slice(0, 220);

  if (uniqueTexts.length === 0) {
    return {};
  }

  const chunks = chunkArray(uniqueTexts, 35);
  const mergedTranslations: Record<string, string> = {};

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    const batchTranslations = await fetchTranslationBatch(language, chunk);

    Object.assign(mergedTranslations, batchTranslations);
  }

  return mergedTranslations;
}

export default function AutoTranslateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { language } = useLanguage();

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

    const prepareOriginalMaps = (
      nodes: Text[],
      attributeElements: HTMLElement[],
    ) => {
      for (const node of nodes) {
        if (!originalTextMapRef.current.has(node)) {
          originalTextMapRef.current.set(node, cleanText(node.nodeValue || ''));
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
    };

    const collectSourceTexts = (
      nodes: Text[],
      attributeElements: HTMLElement[],
    ) => {
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

      return Array.from(new Set([...sourceTextNodes, ...sourceAttributeTexts]));
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

        prepareOriginalMaps(nodes, attributeElements);

        if (language === 'sk') {
          restoreOriginalTexts();
          return;
        }

        const cachedTranslations = loadCachedTranslations(language);
        const sourceTexts = collectSourceTexts(nodes, attributeElements);

        if (Object.keys(cachedTranslations).length > 0) {
          applyTranslationsToPage(nodes, attributeElements, cachedTranslations);
        }

        const missingTexts = sourceTexts.filter(
          (text) => !cachedTranslations[text],
        );

        if (missingTexts.length === 0) {
          return;
        }

        const newTranslations = await translateTextsWithAi(
          language,
          missingTexts,
        );

        if (cancelled) return;

        const mergedTranslations = {
          ...cachedTranslations,
          ...newTranslations,
        };

        saveCachedTranslations(language, mergedTranslations);
        applyTranslationsToPage(nodes, attributeElements, mergedTranslations);
      } catch (error) {
        console.warn('AUTO_TRANSLATE_PROVIDER_WARNING:', error);
      } finally {
        isTranslatingRef.current = false;
      }
    };

    const scheduleTranslation = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        void runTranslation();
      }, 120);
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

  return <>{children}</>;
}