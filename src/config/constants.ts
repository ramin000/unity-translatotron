export const CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 2000,
  INITIAL_VISIBLE_ITEMS: 50,
  LOAD_MORE_INCREMENT: 50,
  TOAST_DURATION: 4000,
  MAX_LANGUAGE_INDEX: 12,
  SUPPORTED_FILE_EXTENSION: '.txt',
} as const;

export const REGEX = {
  TERM: /string\s+Term\s*=\s*"([^"]+)"/,
  DATA: /string\s+data\s*=\s*"(.*)"/,
  BRACKET: /^\s*\[(\d+)\]/,
  BOM: /^\uFEFF/,
} as const;

export const RTL_EMBEDDING = '\u202B';
export const LTR_EMBEDDING = '\u202A';

export const HOTKEYS = {
  SAVE: 'ctrl+s',
  OPEN: 'ctrl+o',
  EXPORT: 'ctrl+t',
  IMPORT: 'ctrl+i',
} as const;
