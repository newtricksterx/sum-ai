import { Settings, Save } from "lucide-react";
import { all_formats, all_languages, all_lengths, MenuIconSize } from "../utils/constants";
import Button from "./Button";
import { useState } from "react";
import { ButtonDisplyStatus, Format, Language, Length } from "../utils/types";
import Dropdown from "./Dropdown";
import { useSettingsStore } from "../stores/settingsStore";

export default function SettingsDropdown() {
    const settings_lang = useSettingsStore((state) => state.language);
    const settings_length = useSettingsStore((state) => state.length);
    const settings_fontSize = useSettingsStore((state) => state.fontSize);
    const settings_format = useSettingsStore((state) => state.format);

    const [displayStatus, SetDisplayStatus] = useState<ButtonDisplyStatus>("hidden");

    const [language, SetLanguage] = useState<Language>(settings_lang);
    const [length, SetLength] = useState<Length>(settings_length);
    const [fontSize, SetFontSize] = useState<Number>(settings_fontSize);
    const [format, SetFormat] = useState<Format>(settings_format)
    const [saved, SetSaved] = useState(false);

    const UpdateLang = useSettingsStore((state) => state.UpdateLanguage);
    const UpdateLength = useSettingsStore((state) => state.UpdateLength);
    const UpdateFontSize = useSettingsStore((state) => state.UpdateFontSize);
    const UpdateFormat = useSettingsStore((state) => state.UpdateFormat);


    function onClickSettings() {
        if(displayStatus === "hidden"){
            SetDisplayStatus("block");
        }
        else{
            SetDisplayStatus("hidden")
        }
    }

    function backgroundActive() {
        return displayStatus === "block" ? "bg-gray-100 dark:bg-[#373737]" : "bg-white dark:bg-[#303030]" 
    }

    function savedActive(){
        return saved ? "opacity-50" : "cursor-pointer"
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
        <div className="relative">
            <Button onClick={onClickSettings} className={`${backgroundActive()} p-2 rounded-3xl`} title="Settings">
                <Settings size={MenuIconSize}/>
            </Button>
            <div className={`${displayStatus} absolute border-2 font-noto bg-white border-gray-200 dark:bg-[#303030] dark:border-[#373737] shadow-xs py-2 rounded-lg right-0`}>
                <form className="flex flex-col items-start gap-1" onSubmit={(e) => onSaveSettings(e)}>
                    <div className="flex flex-row gap-2 w-full px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Dropdown title="language" list={all_languages} onChangeDropdown={(e) => {
                            SetLanguage(e.target.value as Language)
                            SetSaved(false);
                        }
                            
                        } value={language} name='languages' id='lang'/>
                    </div>

                    <div className="flex flex-row gap-2 w-full px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Dropdown title="summary format" list={all_formats} onChangeDropdown={(e) => 
                        {
                            SetSaved(false);
                            SetFormat(e.target.value as Format)
                        }
                            
                        } value={format} name='formats' id='format'/>
                    </div>

                    <div className="flex flex-row gap-2 w-full  px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Dropdown title="summary length" list={all_lengths} onChangeDropdown={(e) => {
                            SetSaved(false);
                            SetLength(e.target.value as Length)
                        }
                            
                        } value={length} name='lengths' id='length'/>
                    </div>

                    <div className="flex flex-row w-full px-4 gap-2 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 border-b-2 border-b-gray-200 dark:border-b-[#373737]">
                        <input title="font size" className="w-[50px]" min={5} type="number" value={fontSize.toString()} 
                             name="font-size" id="font-size" onChange={(e) => {
                                SetSaved(false);
                                SetFontSize(Number(e.target.value))
                            }}/>
                    </div>

                    <div className="flex flex-row w-full justify-center items-center">
                        <button 
                            className={`flex flex-row gap-2 items-center border-0 rounded-2xl bg-[#303030] text-gray-100 hover:bg-[#373737]
                            dark:bg-gray-100 dark:text-black py-1 px-2 dark:hover:bg-gray-200 text-[14px] my-1 ${savedActive()}` }
                            type="submit" disabled={saved} title="Save settings">
                            <Save size={MenuIconSize}/>
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

/*
            <div className={`${displayStatus} w-40 absolute border-2 bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800 py-2 rounded-lg right-0`}>
                
                <div className="flex flex-row px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                    <label htmlFor="lang">Language: </label>
                    <Dropdown list={all_languages} onChangeDropdown={(e) => 
                        onChangeDropdownLang(e.target.value as Language)
                    } defaultValue={settings_lang} name='languages' id='lang'/>
                </div>

                <div className="flex flex-row px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                    <label htmlFor="length">Length: </label>
                    <Dropdown list={all_lengths} onChangeDropdown={(e) => 
                        onChangeDropdownLength(e.target.value as Length)
                    } defaultValue={settings_length} name='lengths' id='length'/>
                </div>

                <div className="flex flex-row px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                    <label htmlFor="font-size">Font Size: </label>
                    <input type="number" name="font-size" id="font-size"/>
                </div>

            </div>
*/
