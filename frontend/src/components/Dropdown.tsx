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
        <div className="relative">
            <select
                name={name}
                id={id}
                className={`settings-select w-full cursor-pointer appearance-none ${className ?? ""}`}
                title={title}
                value={value}
                onChange={(e) => {
                    onChangeDropdown(e);
                }}
            >
                {list.map((element, index) => (
                    <option className="settings-option" key={index} value={element}>
                        {getOptionLabel(element)}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
            />
        </div>
    )
}

export default Dropdown;
