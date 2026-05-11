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
}

export const SettingsPageDropdown = memo(SettingsPageDropdownInner) as typeof SettingsPageDropdownInner;
