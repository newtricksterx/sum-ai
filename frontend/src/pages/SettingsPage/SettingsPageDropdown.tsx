import { memo } from "react";
import { SettingsPageDropdownProps } from "./settingspage.utils";
import './SettingsPageDropdown.css'

function SettingsPageDropdownInner<T extends string>({
  id,
  value,
  options,
  onValueChange,
  ariaLabel,
}: SettingsPageDropdownProps<T>) {


  const handleValueChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange(event.target.value as T)
  };


  return (
    <select name="" id={id} onChange={handleValueChange} value={value} className="settings-page-dropdown">
      {
        options.map((item, index) => (
          <option key={index} value={item.value} className="settings-page-dropdown-item" aria-label={ariaLabel}>
            {item.label}
          </option>
        ))
      }
    </select>
  )

  /*
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
  */
}

export const SettingsPageDropdown = memo(SettingsPageDropdownInner) as typeof SettingsPageDropdownInner;
