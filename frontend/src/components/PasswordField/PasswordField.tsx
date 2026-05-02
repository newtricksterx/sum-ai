import { unstable_PasswordToggleField as PasswordToggleField } from "radix-ui";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import type { ChangeEventHandler } from "react";
import "./PasswordField.css";

interface PasswordFieldProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  disabled?: boolean;
  required?: boolean;
}

const PasswordField = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  required,
}: PasswordFieldProps) => {
  return (
    <div className="password-field-root">
      <PasswordToggleField.Root>
        <div className="password-field-shell">
          <PasswordToggleField.Input
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            required={required}
            className="password-field-input"
          />
          <PasswordToggleField.Toggle
            className="password-field-toggle"
            aria-label="Toggle password visibility"
            disabled={disabled}
          >
            <PasswordToggleField.Icon
              visible={<EyeOpenIcon />}
              hidden={<EyeClosedIcon />}
            />
          </PasswordToggleField.Toggle>
        </div>
      </PasswordToggleField.Root>
    </div>
  );
};

export default PasswordField;
