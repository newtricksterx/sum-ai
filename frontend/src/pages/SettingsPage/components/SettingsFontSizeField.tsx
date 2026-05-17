import { ChangeEvent } from "react";
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE } from "../settingspage.utils";

type SettingsFontSizeFieldProps = {
  id: string;
  value: number;
  onChange: (next: number) => void;
  onBlur: () => void;
};

export function SettingsFontSizeField({ id, value, onChange, onBlur }: SettingsFontSizeFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    onChange(Number.isFinite(next) ? next : DEFAULT_FONT_SIZE);
  };

  return (
    <div className="settings-fontsize-wrap">
      <input
        id={id}
        type="number"
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        step={1}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        className="settings-fontsize-input"
      />
      <span className="settings-fontsize-unit">px</span>
    </div>
  );
}
