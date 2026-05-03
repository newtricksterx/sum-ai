import { ButtonProps } from "../utils/interfaces";
import { forwardRef} from 'react';


const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, title, disabled, onClick }, ref) => {
    return (
      <button
        type="button"
        ref={ref} // Assign the forwarded ref here
        className={`${className} ${
          disabled ? "" : "ui-ghost-interactive cursor-pointer"
        }`}
        onClick={onClick}
        title={title}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }
);

export default Button;
