export interface ButtonProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    disabled?: boolean;
    onClick?: React.MouseEventHandler;
}
