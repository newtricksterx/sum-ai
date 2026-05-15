import React from "react";
import type { InlineItems } from "./types";

export const renderInlineSegment = (segment: InlineItems, key: number): React.ReactNode => {
  let node: React.ReactNode = segment.text;
  if (segment.code) node = <code>{node}</code>;
  if (segment.italic) node = <em>{node}</em>;
  if (segment.bold) node = <strong>{node}</strong>;
  if (segment.link) node = <a href={segment.link} target="_blank">{node}</a>;
  if (segment.var) node = <var>{node}</var>;

  return <React.Fragment key={key}>{node}</React.Fragment>;
};
