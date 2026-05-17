import { ReactNode } from "react";

type SettingsRowProps = {
  icon: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  control: ReactNode;
};

export function SettingsRow({ icon, label, hint, control }: SettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="settings-row-body">
        <div className="settings-row-label">{label}</div>
        {hint ? <div className="settings-row-hint">{hint}</div> : null}
      </div>
      <div className="settings-row-control">{control}</div>
    </div>
  );
}
