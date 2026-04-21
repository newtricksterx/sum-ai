import { ButtonProps } from "../utils/interfaces";
import { forwardRef} from 'react';


const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, title, disabled, onClick }, ref) => {
    return (
      <button
        ref={ref} // Assign the forwarded ref here
        className={`${className} ${
          disabled ? "" : "hover:bg-gray-200 dark:hover:bg-[#373737] cursor-pointer"
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