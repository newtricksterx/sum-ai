import { DropdownProps } from "../utils/interfaces";
import { ChevronDown } from "lucide-react";

const OPTION_LABELS: Record<string, string> = {
    english: "English",
    french: "French",
    spanish: "Spanish",
    short: "Short",
    medium: "Medium",
    long: "Long",
    paragraph: "Paragraph",
    "bullet-point": "Bullet Points",
    "tl-dr-bullets": "TL;DR + Bullets",
    "key-takeaways": "Key Takeaways",
    "action-items": "Action items",
    "q-and-a": "Q&A",
    "pros-cons": "Pros & Cons",
};

function getOptionLabel(value: string) {
    if (OPTION_LABELS[value]) return OPTION_LABELS[value];
    return value
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function Dropdown({list, onChangeDropdown, title, className, value, name, id}:DropdownProps) {
    return (
        <div className="group relative">
            <select
                name={name}
                id={id}
                className={`
                    w-full cursor-pointer appearance-none rounded-md border border-gray-200
                    bg-white px-2 py-1 pr-7 text-[12px] font-medium text-gray-700
                    shadow-[0_1px_0_rgba(0,0,0,0.02)]
                    transition-[border-color,box-shadow,transform,background-color] duration-200 ease-out
                    motion-reduce:transition-none
                    hover:border-gray-300 focus:border-[#EFBF04] focus:outline-none focus:ring-2 focus:ring-[#EFBF04]/35
                    focus:-translate-y-[1px] focus:shadow-[0_3px_10px_rgba(0,240,255,0.18)]
                    dark:border-[#3a3a3a] dark:bg-[#232323] dark:text-gray-200 dark:hover:border-[#4a4a4a]
                    dark:focus:border-[#EFBF04] dark:focus:ring-[#EFBF04]/30
                    dark:focus:shadow-[0_3px_10px_rgba(0,240,255,0.2)]
                    ${className ?? ""}
                `}
                title={title}
                value={value}
                onChange={(e) => {
                    onChangeDropdown(e);
                }}
            >
                {list.map((element, index) => (
                    <option
                        className="bg-white text-gray-700 dark:bg-[#1f1f1f] dark:text-gray-200"
                        key={index}
                        value={element}
                    >
                        {getOptionLabel(element)}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={14}
                className="
                    pointer-events-none absolute right-2 top-1/2 -translate-y-1/2
                    text-gray-500 transition-[transform,color] duration-200 ease-out
                    group-hover:text-gray-600 group-focus-within:rotate-180 group-focus-within:text-[#EFBF04]
                    dark:text-gray-400 dark:group-hover:text-gray-300 dark:group-focus-within:text-[#EFBF04]
                    motion-reduce:transition-none
                "
            />
        </div>
    )
}

export default Dropdown;

