import * as Toast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import './ToastErrorMessage.css'
import { CrossCircledIcon } from "@radix-ui/react-icons";

interface ToastErrorMessageProps {
    onDismissError: () => void;
    errorMessage?: string | null;
}

export const ToastErrorMessage = ({ errorMessage, onDismissError } : ToastErrorMessageProps) => {
    return (
        <Toast.Root
            open={errorMessage !== null}
            onOpenChange={(open) => { if (!open) onDismissError(); }}
            duration={8000}
            className="toast-root"
        >
            <CrossCircledIcon width={16} height={16} className="toast-error-icon"/>
            <div className="">
                <Toast.Title className="toast-title">
                    Error
                </Toast.Title>

                <Toast.Description className="toast-desc">
                    {errorMessage}
                </Toast.Description>
            </div>
            <Toast.Close aria-label="Dismiss" className="toast-close">
                <X size={12} />
            </Toast.Close>
        </Toast.Root>
    )
}