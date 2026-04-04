import { DropdownProps } from "../utils/interfaces";

function Dropdown({list, onChangeDropdown, title, className, value, name, id}:DropdownProps) {
    return (
        <select name={name} id={id} className={`${className} dark:border-gray-900 cursor-pointer`} title={title} value={value} onChange={(e) => {
            //e.stopPropagation();
            onChangeDropdown(e);
        }} >
            {
                list.map((element, index) => (
                    <option className="dark:bg-gray-900 cursor-pointer" key={index} value={element}>{element}</option>
                ))
            }
        </select>
    )
}

export default Dropdown;