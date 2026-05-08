import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

type SettingsMenuSelectorProps<T extends string> = {
    id: string;
    label: string;
    list: T[];
    value: T;
    onValueChange: (value: T) => void;
    onMenuOpenChange?: (isOpen: boolean) => void;
    getOptionLabel: (value: string) => string;
};

export function SettingsMenuSelector<T extends string>({
    id,
    label,
    list,
    value,
    onValueChange,
    onMenuOpenChange,
    getOptionLabel,
}: SettingsMenuSelectorProps<T>) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex flex-col gap-1.5 rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-gray-50/70 dark:bg-[#2a2a2a] p-2.5">
            <span id={`${id}-label`} className="text-[11px] font-medium tracking-wide text-gray-600 dark:text-gray-300">
                {label}
            </span>

            <DropdownMenu.Root
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    onMenuOpenChange?.(nextOpen);
                }}
            >
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        id={id}
                        aria-labelledby={`${id}-label ${id}-value`}
                        className={`
                            w-full cursor-pointer rounded-md border border-gray-200 bg-white px-2 py-1
                            text-left text-[12px] font-medium text-gray-700 shadow-[0_1px_0_rgba(0,0,0,0.02)]
                            transition-[border-color,box-shadow,transform,background-color] duration-200 ease-out
                            hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-200/80
                            dark:border-[#3a3a3a] dark:bg-[#232323] dark:text-gray-200 dark:hover:border-[#4a4a4a]
                            dark:focus:ring-teal-500/25
                            ${open
                                ? "border-sky-400 ring-2 ring-sky-200/80 -translate-y-[1px] shadow-[0_3px_10px_rgba(14,165,233,0.12)] dark:border-teal-400 dark:ring-teal-500/25 dark:shadow-[0_3px_10px_rgba(45,212,191,0.12)]"
                                : ""
                            }
                        `}
                    >
                        <span className="flex items-center justify-between gap-2">
                            <span id={`${id}-value`} className="truncate">{getOptionLabel(value)}</span>
                            <ChevronDown
                                size={14}
                                className={`text-gray-500 transition-[transform,color] duration-200 ease-out dark:text-gray-400 ${open ? "rotate-180 text-sky-500 dark:text-teal-300" : ""}`}
                            />
                        </span>
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="start"
                        side="bottom"
                        sideOffset={6}
                        collisionPadding={8}
                        data-settings-menu-content="true"
                        className="
                            z-[70] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-md border border-gray-200
                            max-h-52 overflow-y-auto overscroll-contain bg-white p-1 shadow-lg outline-none
                            data-[state=open]:animate-[front-card-rise_140ms_ease-out]
                            dark:border-[#3a3a3a] dark:bg-[#232323]
                        "
                    >
                        <DropdownMenu.RadioGroup
                            value={value}
                            onValueChange={(nextValue) => {
                                onValueChange(nextValue as T);
                            }}
                        >
                            {list.map((optionValue) => (
                                <DropdownMenu.RadioItem
                                    key={optionValue}
                                    value={optionValue}
                                    className="
                                        relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2
                                        text-[12px] font-medium text-gray-700 outline-none
                                        data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900
                                        dark:text-gray-200 dark:data-[highlighted]:bg-[#2f2f2f] dark:data-[highlighted]:text-gray-100
                                    "
                                    onSelect={() => {
                                        setOpen(false);
                                    }}
                                >
                                    <DropdownMenu.ItemIndicator className="absolute left-2 inline-flex items-center">
                                        <Check size={12} className="text-green-600 dark:text-teal-300" />
                                    </DropdownMenu.ItemIndicator>
                                    {getOptionLabel(optionValue)}
                                </DropdownMenu.RadioItem>
                            ))}
                        </DropdownMenu.RadioGroup>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
}
