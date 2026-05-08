import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

type SettingsPageDropdownProps<T extends string> = {
  id: string;
  value: T;
  options: T[];
  onValueChange: (value: T) => void;
  getOptionLabel: (value: string) => string;
  ariaLabel: string;
};

export function SettingsPageDropdown<T extends string>({
  id,
  value,
  options,
  onValueChange,
  getOptionLabel,
  ariaLabel,
}: SettingsPageDropdownProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          className={`settings-page-dropdown-trigger settings-select settings-row-select${
            open ? " settings-page-dropdown-trigger--open" : ""
          }`}
        >
          <span className="settings-page-dropdown-value">{getOptionLabel(value)}</span>
          <ChevronDown
            size={14}
            className={`settings-page-dropdown-chevron${open ? " settings-page-dropdown-chevron--open" : ""}`}
            aria-hidden="true"
          />
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
            onValueChange={(nextValue) => {
              onValueChange(nextValue as T);
            }}
          >
            {options.map((optionValue) => (
              <DropdownMenu.RadioItem
                key={optionValue}
                value={optionValue}
                className="settings-page-dropdown-item"
                onSelect={() => setOpen(false)}
              >
                <DropdownMenu.ItemIndicator className="settings-page-dropdown-indicator">
                  <Check size={12} />
                </DropdownMenu.ItemIndicator>
                {getOptionLabel(optionValue)}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
