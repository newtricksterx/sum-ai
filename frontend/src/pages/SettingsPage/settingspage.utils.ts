export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;
export const DEFAULT_FONT_SIZE = 12;

export type SaveTimeoutHandle = ReturnType<typeof window.setTimeout>;

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)));
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
