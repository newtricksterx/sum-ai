import React, { memo } from 'react';
import Button from './Button';

interface MenuBarButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  title: string;
  children: React.ReactNode;
}

const MenuBarButton: React.FC<MenuBarButtonProps> = ({ onClick, title, children }) => {
  return (
    <Button onClick={onClick} className={`p-2 rounded-3xl m-1`} title={title}>
      {children}
    </Button>
  );
};

export default memo(MenuBarButton);
