import { memo, startTransition, useCallback, useMemo } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

export type SettingsPageDropdownOption<T extends string> = {
  value: T;
  label: string;
};

type SettingsPageDropdownProps<T extends string> = {
  id: string;
  value: T;
  options: readonly SettingsPageDropdownOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
};

function SettingsPageDropdownInner<T extends string>({
  id,
  value,
  options,
  onValueChange,
  ariaLabel,
}: SettingsPageDropdownProps<T>) {
  const selectedLabel = useMemo(() => {
    const selectedOption = options.find((option) => option.value === value);
    return selectedOption?.label ?? value;
  }, [options, value]);

  const handleValueChange = useCallback(
    (nextValue: string) => {
      // Keep the menu interaction responsive by deferring parent rerender work.
      startTransition(() => {
        onValueChange(nextValue as T);
      });
    },
    [onValueChange],
  );

  const renderedOptions = useMemo(
    () =>
      options.map((option) => (
        <DropdownMenu.RadioItem
          key={option.value}
          value={option.value}
          textValue={option.label}
          className="settings-page-dropdown-item"
        >
          <DropdownMenu.ItemIndicator className="settings-page-dropdown-indicator">
            <Check size={12} />
          </DropdownMenu.ItemIndicator>
          {option.label}
        </DropdownMenu.RadioItem>
      )),
    [options],
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          className="settings-page-dropdown-trigger settings-select settings-row-select"
        >
          <span className="settings-page-dropdown-value">{selectedLabel}</span>
          <ChevronDown size={14} className="settings-page-dropdown-chevron" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="settings-page-dropdown-content"
        >
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={handleValueChange}
          >
            {renderedOptions}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export const SettingsPageDropdown = memo(SettingsPageDropdownInner) as typeof SettingsPageDropdownInner;
