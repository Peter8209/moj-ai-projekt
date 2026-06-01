'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeLanguage, type AppLanguage } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';
const SYSTEM_LANGUAGE_STORAGE_KEY = 'zedpera_system_language';
const WORK_LANGUAGE_STORAGE_KEY = 'zedpera_work_language';
const TRANSLATION_CACHE_PREFIX = 'zedpera_auto_ui_v3';
const ORIGINAL_TEXT_ATTRIBUTE = 'data-zedpera-original-text';
const ORIGINAL_ATTR_PREFIX = 'data-zedpera-original-';
const TRANSLATED_ATTR_PREFIX = 'data-zedpera-translated-';
const TRANSLATION_READY_ATTRIBUTE = 'data-zedpera-translated-ready';

const SUPPORTED_LANGUAGES: AppLanguage[] = ['sk', 'cs', 'en', 'de', 'pl', 'hu'];

const TEXT_SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'SVG',
  'PATH',
  'CANVAS',
  'IFRAME',
]);

const ATTRIBUTE_SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'SVG',
  'PATH',
  'CANVAS',
  'IFRAME',
]);

const TRANSLATABLE_ATTRIBUTES = [
  'placeholder',
  'title',
  'aria-label',
  'aria-placeholder',
  'data-label',
  'data-title',
  'data-tooltip',
  'data-placeholder',
] as const;

type TranslatableAttribute = (typeof TRANSLATABLE_ATTRIBUTES)[number] | 'value';

type AttributeItem = {
  element: HTMLElement;
  attribute: TranslatableAttribute;
  value: string;
};

function isValidLanguage(value: unknown): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'sk';

  const saved =
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(SYSTEM_LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(WORK_LANGUAGE_STORAGE_KEY);

  if (isValidLanguage(saved)) return saved;

  return normalizeLanguage(
    window.navigator.languages?.[0] || window.navigator.language || 'sk',
  );
}

function persistLanguage(language: AppLanguage) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem(SYSTEM_LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem(WORK_LANGUAGE_STORAGE_KEY, language);

  document.documentElement.lang = language;
  document.documentElement.setAttribute('data-language', language);
  document.documentElement.setAttribute('data-system-language', language);
  document.documentElement.setAttribute('data-work-language', language);
}

function cleanText(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeCacheText(value: string) {
  return cleanText(value).slice(0, 900);
}

function shouldSkipText(value: string) {
  const text = cleanText(value);

  if (!text) return true;
  if (text.length < 2) return true;
  if (text.length > 900) return true;

  if (/^[\d\s.,€%+\-/:()]+$/.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[{}[\]().,;:!?+\-*/="'`~<>|\\]+$/.test(text)) return true;

  // Jazykové skratky v prepínači jazykov nechávame bez AI prekladu.
  if (/^(SK|CZ|CS|EN|DE|PL|HU)$/i.test(text)) return true;

  return false;
}

function elementIsInsideNoTranslate(element: Element | null) {
  if (!element) return true;

  if (element.closest('[data-no-translate="true"]')) return true;
  if (element.closest('[data-no-translate]')) return true;
  if (element.closest('[translate="no"]')) return true;
  if (element.closest('.notranslate')) return true;

  // AI výstupy neprekladáme, aby sa nezmenil odborný obsah práce, citácie ani výsledky modelu.
  if (element.closest('[data-ai-output="true"]')) return true;

  return false;
}

function textElementShouldBeSkipped(element: Element | null) {
  if (!element) return true;
  if (TEXT_SKIP_TAGS.has(element.tagName)) return true;
  if (elementIsInsideNoTranslate(element)) return true;
  if (element.closest('[contenteditable="true"]')) return true;

  const tagName = element.tagName;

  // Hodnoty používateľa v poliach neprekladáme, ale placeholdery riešime cez atribúty.
  if (tagName === 'TEXTAREA' || tagName === 'INPUT') return true;

  return false;
}

function attributeElementShouldBeSkipped(element: Element | null) {
  if (!element) return true;
  if (ATTRIBUTE_SKIP_TAGS.has(element.tagName)) return true;
  if (elementIsInsideNoTranslate(element)) return true;
  if (element.closest('[contenteditable="true"]')) return true;

  return false;
}

function isTranslatableInputValue(element: HTMLElement) {
  if (!(element instanceof HTMLInputElement)) return false;

  const type = (element.getAttribute('type') || 'text').toLowerCase();

  return type === 'button' || type === 'submit' || type === 'reset';
}

function getOriginalText(node: Text) {
  const parent = node.parentElement;

  if (!parent) return cleanText(node.textContent || '');

  const stored = parent.getAttribute(ORIGINAL_TEXT_ATTRIBUTE);

  if (stored) return stored;

  const original = cleanText(node.textContent || '');

  if (original) {
    parent.setAttribute(ORIGINAL_TEXT_ATTRIBUTE, original);
  }

  return original;
}

function getOriginalAttribute(element: HTMLElement, attribute: TranslatableAttribute) {
  const originalAttribute = `${ORIGINAL_ATTR_PREFIX}${attribute}`;
  const stored = element.getAttribute(originalAttribute);

  if (stored) return stored;

  const current = cleanText(element.getAttribute(attribute) || '');

  if (current) {
    element.setAttribute(originalAttribute, current);
  }

  return current;
}

function resetTranslatedDom(root: HTMLElement) {
  const translatedTextElements = root.querySelectorAll<HTMLElement>(
    `[${ORIGINAL_TEXT_ATTRIBUTE}]`,
  );

  translatedTextElements.forEach((element) => {
    const original = element.getAttribute(ORIGINAL_TEXT_ATTRIBUTE);

    if (!original) return;

    const hasOnlyOneTextNode =
      element.childNodes.length === 1 && element.firstChild?.nodeType === Node.TEXT_NODE;

    if (hasOnlyOneTextNode) {
      element.textContent = original;
    }
  });

  const selector = TRANSLATABLE_ATTRIBUTES
    .map((attribute) => `[${ORIGINAL_ATTR_PREFIX}${attribute}]`)
    .concat(`[${ORIGINAL_ATTR_PREFIX}value]`)
    .join(',');

  if (selector) {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      [...TRANSLATABLE_ATTRIBUTES, 'value' as const].forEach((attribute) => {
        const original = element.getAttribute(`${ORIGINAL_ATTR_PREFIX}${attribute}`);

        if (original) {
          element.setAttribute(attribute, original);
        }
      });
    });
  }
}

function collectTextNodes(root: HTMLElement) {
  const nodes: Text[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (!parent) return NodeFilter.FILTER_REJECT;
      if (textElementShouldBeSkipped(parent)) return NodeFilter.FILTER_REJECT;

      const text = getOriginalText(node as Text);

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

function collectTranslatableAttributes(root: HTMLElement): AttributeItem[] {
  const items: AttributeItem[] = [];

  const selector = [
    ...TRANSLATABLE_ATTRIBUTES.map((attribute) => `[${attribute}]`),
    'input[type="button"], input[type="submit"], input[type="reset"]',
  ].join(',');

  const elements = root.querySelectorAll<HTMLElement>(selector);

  elements.forEach((element) => {
    if (attributeElementShouldBeSkipped(element)) return;

    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      const original = getOriginalAttribute(element, attribute);

      if (!shouldSkipText(original)) {
        items.push({
          element,
          attribute,
          value: original,
        });
      }
    });

    if (isTranslatableInputValue(element)) {
      const original = getOriginalAttribute(element, 'value');

      if (!shouldSkipText(original)) {
        items.push({
          element,
          attribute: 'value',
          value: original,
        });
      }
    }
  });

  return items;
}

function getCacheKey(language: AppLanguage, text: string) {
  return `${TRANSLATION_CACHE_PREFIX}_${language}_${encodeURIComponent(
    normalizeCacheText(text),
  )}`;
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

async function translateMissingTexts(language: AppLanguage, texts: string[]) {
  const response = await fetch('/api/translate-ui', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language,
      texts,
    }),
  });

  if (!response.ok) {
    throw new Error('UI preklad zlyhal.');
  }

  const data = await response.json();
  const translations = data?.translations || {};

  if (!translations || typeof translations !== 'object') {
    return {} as Record<string, string>;
  }

  return translations as Record<string, string>;
}

async function translateTexts(language: AppLanguage, texts: string[]) {
  const uniqueTexts = Array.from(
    new Set(texts.map(cleanText).filter((item) => !shouldSkipText(item))),
  );

  if (uniqueTexts.length === 0) return {} as Record<string, string>;

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

  // Pôvodná verzia prekladala iba prvých 160 textov. Táto verzia preloží všetky texty po dávkach.
  const chunks = chunkArray(missingTexts, 90);

  for (const chunk of chunks) {
    const translations = await translateMissingTexts(language, chunk);

    Object.entries(translations).forEach(([source, translated]) => {
      const cleanSource = cleanText(source);

      if (typeof translated === 'string' && translated.trim() && cleanSource) {
        cachedTranslations[cleanSource] = translated;
        writeCachedTranslation(language, cleanSource, translated);
      }
    });
  }

  return cachedTranslations;
}

function applyTranslationsToNodes(
  textNodes: Text[],
  translations: Record<string, string>,
) {
  textNodes.forEach((node) => {
    const original = getOriginalText(node);
    const translated = translations[original];

    if (translated && translated !== original) {
      node.textContent = translated;
      node.parentElement?.setAttribute(TRANSLATED_ATTR_PREFIX + 'text', 'true');
    }
  });
}

function applyTranslationsToAttributes(
  attributeItems: AttributeItem[],
  translations: Record<string, string>,
) {
  attributeItems.forEach((item) => {
    const translated = translations[item.value];

    if (translated && translated !== item.value) {
      item.element.setAttribute(item.attribute, translated);
      item.element.setAttribute(
        `${TRANSLATED_ATTR_PREFIX}${item.attribute}`,
        'true',
      );
    }
  });
}

export default function AiPageTranslator() {
  const [language, setLanguage] = useState<AppLanguage>('sk');
  const translatingRef = useRef(false);
  const queuedLanguageRef = useRef<AppLanguage | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const lastTranslatedLanguageRef = useRef<AppLanguage>('sk');

  const translatePage = useCallback(async (nextLanguage: AppLanguage) => {
    if (typeof window === 'undefined') return;

    if (translatingRef.current) {
      queuedLanguageRef.current = nextLanguage;
      return;
    }

    const root = document.body;

    if (!root) return;

    translatingRef.current = true;
    persistLanguage(nextLanguage);

    try {
      if (nextLanguage === 'sk') {
        resetTranslatedDom(root);
        lastTranslatedLanguageRef.current = 'sk';
        document.documentElement.removeAttribute(TRANSLATION_READY_ATTRIBUTE);
        return;
      }

      // Pri zmene jazyka vždy obnovíme pôvodné SK texty a prekladáme z čistého základu.
      if (lastTranslatedLanguageRef.current !== 'sk') {
        resetTranslatedDom(root);
      }

      const textNodes = collectTextNodes(root);
      const attributeItems = collectTranslatableAttributes(root);

      const textValues = textNodes
        .map((node) => getOriginalText(node))
        .filter((item) => !shouldSkipText(item));

      const attributeValues = attributeItems
        .map((item) => item.value)
        .filter((item) => !shouldSkipText(item));

      const allTexts = [...textValues, ...attributeValues];
      const translations = await translateTexts(nextLanguage, allTexts);

      applyTranslationsToNodes(textNodes, translations);
      applyTranslationsToAttributes(attributeItems, translations);

      lastTranslatedLanguageRef.current = nextLanguage;
      document.documentElement.setAttribute(TRANSLATION_READY_ATTRIBUTE, nextLanguage);
    } catch (error) {
      console.error('AI_PAGE_TRANSLATOR_ERROR:', error);
    } finally {
      translatingRef.current = false;

      const queuedLanguage = queuedLanguageRef.current;
      queuedLanguageRef.current = null;

      if (queuedLanguage && queuedLanguage !== nextLanguage) {
        window.setTimeout(() => {
          void translatePage(queuedLanguage);
        }, 30);
      }
    }
  }, []);

  const scheduleTranslation = useCallback(
    (nextLanguage: AppLanguage, delay = 40) => {
      if (typeof window === 'undefined') return;

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        void translatePage(nextLanguage);
      }, delay);
    },
    [translatePage],
  );

  useEffect(() => {
    const initialLanguage = getStoredLanguage();

    setLanguage(initialLanguage);
    persistLanguage(initialLanguage);

    // Okamžitý preklad po načítaní aplikácie.
    scheduleTranslation(initialLanguage, 0);

    // Druhý preklad po hydratácii Next.js zachytí texty, ktoré pribudnú oneskorene.
    const hydrationTimer = window.setTimeout(() => {
      scheduleTranslation(getStoredLanguage(), 0);
    }, 700);

    return () => {
      window.clearTimeout(hydrationTimer);
    };
  }, [scheduleTranslation]);

  useEffect(() => {
    const applyLanguage = (nextLanguage: AppLanguage) => {
      setLanguage(nextLanguage);
      persistLanguage(nextLanguage);
      scheduleTranslation(nextLanguage, 0);
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== LANGUAGE_STORAGE_KEY &&
        event.key !== SYSTEM_LANGUAGE_STORAGE_KEY &&
        event.key !== WORK_LANGUAGE_STORAGE_KEY
      ) {
        return;
      }

      const nextLanguage = event.newValue;

      if (!isValidLanguage(nextLanguage)) return;

      applyLanguage(nextLanguage);
    };

    const handleCustomLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppLanguage>;
      const nextLanguage = customEvent.detail;

      if (!isValidLanguage(nextLanguage)) return;

      applyLanguage(nextLanguage);
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

    observerRef.current = new MutationObserver((mutations) => {
      if (translatingRef.current) return;

      const shouldTranslate = mutations.some((mutation) => {
        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          return parent ? !textElementShouldBeSkipped(parent) : false;
        }

        if (mutation.type === 'attributes') {
          return true;
        }

        return mutation.addedNodes.length > 0;
      });

      if (!shouldTranslate) return;

      const currentLanguage = getStoredLanguage();

      setLanguage(currentLanguage);

      if (currentLanguage === 'sk') return;

      // Okamžité preklady pre dynamické moduly, rozklikávačky, podstránky a nové karty.
      scheduleTranslation(currentLanguage, 60);
    });

    observerRef.current.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'placeholder',
        'title',
        'aria-label',
        'aria-placeholder',
        'data-label',
        'data-title',
        'data-tooltip',
        'data-placeholder',
        'value',
      ],
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
