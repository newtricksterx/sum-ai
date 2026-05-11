
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;
export type SaveTimeoutHandle = ReturnType<typeof window.setTimeout>;


export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return 12;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)));
}

export function humanizeOption(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export type SettingsPageDropdownOption<T extends string> = {
  value: T;
  label: string;
};

export type SettingsPageDropdownProps<T extends string> = {
  id: string;
  value: T;
  options: readonly SettingsPageDropdownOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
};