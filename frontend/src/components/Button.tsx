import { ButtonProps } from "../utils/interfaces";

function Button({children, className, title, disabled, onClick}:ButtonProps) {
    return (
        <button className={`${className} ${disabled ? "" : "hover:bg-gray-200 dark:hover:bg-[#373737] cursor-pointer"}`} onClick={onClick} title={title} disabled={disabled}>
            {children}
        </button>
    )
}

export default Button;