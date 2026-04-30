import { models, ModelKey } from './models';

type Mode =
  | 'write'
  | 'sources'
  | 'supervisor'
  | 'defense'
  | 'audit'
  | 'translate'
  | 'analysis'
  | 'planning'
  | 'email';

export function pickModel(mode: Mode, agent?: string): ModelKey {

  // 👇 manuálny výber (user klikne)
  if (agent && agent !== 'auto') {
    return agent as ModelKey;
  }

  // 👇 AUTO inteligentný výber
  switch (mode) {
    case 'write':
      return 'gpt-4o';

    case 'sources':
      return 'sonar-pro';

    case 'supervisor':
      return 'claude-3-5-sonnet';

    case 'audit':
      return 'gpt-4-turbo';

    case 'defense':
      return 'gpt-4o';

    case 'translate':
      return 'gemini-1.5-pro';

    case 'analysis':
      return 'mixtral-8x7b';

    case 'planning':
      return 'gpt-4o';

    case 'email':
      return 'command-r-plus';

    default:
      return 'gpt-4o';
  }
}