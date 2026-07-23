export {
  hasUsableAttachmentText,
  resolveAiSourceMode,
  shouldUseWebSearch,
  type AiSourceMode,
} from '@/lib/ai/config';

/**
 * Spätná kompatibilita pre staršie importy.
 */
export {
  resolveAiSourceMode as resolveSourceMode,
} from '@/lib/ai/config';