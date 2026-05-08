import { MutableRefObject, RefObject, useEffect } from "react";

type UseClickOutsideParams = {
    isOpen: boolean;
    menuRef: RefObject<HTMLElement | null>;
    hasOpenSelectorRef: MutableRefObject<boolean>;
    onClose: () => void;
};

export function useClickOutside({
    isOpen,
    menuRef,
    hasOpenSelectorRef,
    onClose,
}: UseClickOutsideParams) {
    useEffect(() => {
        const handleClickOutside = (event: PointerEvent) => {
            if (!isOpen || !menuRef.current) return;

            const target = event.target;
            if (!(target instanceof Element)) return;
            if (menuRef.current.contains(target)) return;
            if (target.closest("[data-settings-menu-content='true']")) return;
            if (hasOpenSelectorRef.current) return;

            onClose();
        };

        document.addEventListener("pointerdown", handleClickOutside, true);
        return () => document.removeEventListener("pointerdown", handleClickOutside, true);
    }, [hasOpenSelectorRef, isOpen, menuRef, onClose]);
}
