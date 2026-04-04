export interface ButtonProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    disabled?: boolean;
    onClick?: React.MouseEventHandler;
}

export interface DropdownProps {
    list: string[];
    onChangeDropdown: (value: React.ChangeEvent<HTMLSelectElement>) => void;
    title?: string
    className?: string;
    value?: string;
    name?: string;
    id?: string;
}

export interface MenuBarProps {
    onClickReturn: React.MouseEventHandler;
    onClickForward: React.MouseEventHandler;
    onClickClose: React.MouseEventHandler;
    onClickRefresh: React.MouseEventHandler;
    onClickRegenerate: React.MouseEventHandler;
}
