import React, { ReactNode, isValidElement } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import "./TooltipComponent.css";

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>;

interface TooltipComponentProps {
  children?: ReactNode;
  content?: ReactNode;
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  sideOffset?: number;
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  ariaLabel?: string;
  hideArrow?: boolean;
}

const joinClassNames = (...classNames: Array<string | false | null | undefined>) => {
  return classNames.filter(Boolean).join(" ");
};

const TooltipComponent: React.FC<TooltipComponentProps> = ({
  children,
  content = "More information",
  side = "top",
  align = "center",
  sideOffset = 7,
  delayDuration = 180,
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  ariaLabel = "More information",
  hideArrow = false,
}) => {
  const fallbackTrigger = (
    <button
      type="button"
      className={joinClassNames("tooltip-component-trigger", triggerClassName)}
      aria-label={ariaLabel}
    >
      <InfoCircledIcon width={13} height={13} aria-hidden="true" />
    </button>
  );

  const trigger = children
    ? isValidElement(children)
      ? children
      : (
        <button
          type="button"
          className={joinClassNames("tooltip-component-trigger", triggerClassName)}
        >
          {children}
        </button>
      )
    : fallbackTrigger;

  if (disabled) {
    return <span className={joinClassNames("tooltip-component", className)}>{trigger}</span>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <span className={joinClassNames("tooltip-component", className)}>
          <TooltipPrimitive.Trigger asChild>{trigger}</TooltipPrimitive.Trigger>
        </span>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={joinClassNames("tooltip-component-content", contentClassName)}
            side={side}
            align={align}
            sideOffset={sideOffset}
          >
            {content}
            {!hideArrow && <TooltipPrimitive.Arrow className="tooltip-component-arrow" />}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export default TooltipComponent;
