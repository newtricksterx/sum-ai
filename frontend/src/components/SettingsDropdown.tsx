import { Settings, Save, Check } from "lucide-react";
import { all_formats, all_languages, all_lengths, MenuIconSize } from "../utils/constants";
import Button from "./Button";
import { useCallback, useEffect, useRef, useState } from "react";
import { Format, Language, Length } from "../utils/types";
import Dropdown from "./Dropdown";
import { useSettingsStore } from "../stores/settingsStore";


export default function SettingsDropdown() {
    const settings_lang = useSettingsStore((state) => state.language);
    const settings_length = useSettingsStore((state) => state.length);
    const settings_fontSize = useSettingsStore((state) => state.fontSize);
    const settings_format = useSettingsStore((state) => state.format);
    const UpdateLang = useSettingsStore((state) => state.UpdateLanguage);
    const UpdateLength = useSettingsStore((state) => state.UpdateLength);
    const UpdateFontSize = useSettingsStore((state) => state.UpdateFontSize);
    const UpdateFormat = useSettingsStore((state) => state.UpdateFormat);

    const [language, SetLanguage] = useState<Language>(settings_lang);
    const [length, SetLength] = useState<Length>(settings_length);
    const [fontSize, SetFontSize] = useState<number>(settings_fontSize);
    const [format, SetFormat] = useState<Format>(settings_format)
    const [saved, SetSaved] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
;

    const onClickSettings = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    useEffect(() => {

        // handles what happens when clicked outside of the settings menu
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        // add event in which a click happens (makes a call to handleClickOutside)
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);

    }, [isOpen, menuRef, onClickSettings])

    function backgroundActive() {
        return isOpen ? "bg-gray-100 dark:bg-[#373737]" : "bg-[#eee] dark:bg-[#303030]";
    }


    function onSaveSettings(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        UpdateLang(language);
        UpdateLength(length);
        UpdateFontSize(fontSize);
        UpdateFormat(format);
        SetSaved(true);
    }

    return (
        <div className="relative z-50" ref={menuRef}>
            <Button onClick={onClickSettings} className={`${backgroundActive()} p-2 rounded-3xl`} title="Settings">
                <Settings size={MenuIconSize}/>
            </Button>
            <div 
                className={`
                    absolute top-full mt-2 border-2 font-noto bg-[#eee] border-gray-200
                    dark:bg-[#303030] dark:border-[#373737] shadow-xs rounded-lg
                    grid transition-[grid-template-rows,opacity] duration-200 ease-out
                    overflow-hidden w-[310px] max-w-[calc(100vw-1.5rem)]
                    right-[-4.5rem]
                    ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none border-transparent"}
                `}>
                {/* header */}
                <div className="px-3.5 pt-3 pb-2 border-b border-gray-100 dark:border-[#2e2e2e]">
                    <span className="text-[10px] font-medium tracking-widest uppercase text-gray-400 dark:text-gray-500">
                        <strong>Settings</strong>
                    </span>
                </div>

                <form onSubmit={onSaveSettings} className="flex flex-col">
                    <div className="px-3.5 py-3 border-b border-gray-100 dark:border-[#2e2e2e]">
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                            { label: "Language", id: "lang", list: all_languages, value: language, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { SetSaved(false); SetLanguage(e.target.value as Language); } },
                            { label: "Summary Format", id: "format", list: all_formats, value: format, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { SetSaved(false); SetFormat(e.target.value as Format); } },
                            { label: "Summary Length", id: "length", list: all_lengths, value: length, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { SetSaved(false); SetLength(e.target.value as Length); } },
                            ].map(({ label, id, list, value, onChange }) => (
                            <div key={id} className="flex flex-col gap-1.5 rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-gray-50/70 dark:bg-[#2a2a2a] p-2.5">
                                <label htmlFor={id} className="text-[11px] text-gray-500 dark:text-gray-400">{label}</label>
                                <Dropdown
                                    id={id}
                                    list={list}
                                    value={value}
                                    onChangeDropdown={onChange}
                                    name={id}
                                    title={label}
                                    className="w-full rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#232323] px-2 py-1 text-[12px]"
                                />
                            </div>
                            ))}

                            <div className="flex flex-col gap-1.5 rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-gray-50/70 dark:bg-[#2a2a2a] p-2.5">
                                <label htmlFor="font-size" className="text-[11px] text-gray-500 dark:text-gray-400">Font size</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="font-size" type="number" min={5} max={32}
                                        value={fontSize}
                                        onChange={(e) => { SetSaved(false); SetFontSize(Number(e.target.value)); }}
                                        className="w-16 text-center text-[13px] px-2 py-1 rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#232323]"
                                    />
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">px</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* footer */}
                    <div className="px-3.5 py-2.5 flex justify-end">
                        {saved ? (
                            <button
                            className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1 rounded-full border
                             border-gray-200 dark:border-[#3a3a3a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] 
                             transition-colors"
                            >
                            <Check size={12} className="text-green-500" /> Saved
                            </button>
                        ) : (
                            <button
                            type="submit"
                            className="flex items-center gap-1.5 text-[12px] 
                            font-medium px-3.5 py-1 rounded-full border 
                            border-gray-200 dark:border-[#3a3a3a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                            >
                            <Save size={12} /> Save
                            </button>
                    )}
                    </div>
                </form>
            </div>
        </div>
    )
}
