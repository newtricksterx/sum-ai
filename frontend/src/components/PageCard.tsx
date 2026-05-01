import { HTMLAttributes, ReactNode, createElement } from "react";
import "./PageCard.css";

type PageCardTag = "div" | "section" | "article" | "main";

interface PageCardProps extends HTMLAttributes<HTMLElement> {
  as?: PageCardTag;
  children?: ReactNode;
}

const BASE_CARD_CLASS =
  "app-card-shell rounded-2xl border border-gray-200/80 dark:border-[#393939]";

export default function PageCard({
  as = "section",
  className,
  children,
  ...rest
}: PageCardProps) {
  return createElement(
    as,
    {
      ...rest,
      className: className ? `${BASE_CARD_CLASS} ${className}` : BASE_CARD_CLASS,
    },
    children,
  );
}
