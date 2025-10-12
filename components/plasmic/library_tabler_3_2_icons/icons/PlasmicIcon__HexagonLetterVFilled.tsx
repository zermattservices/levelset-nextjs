/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HexagonLetterVFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HexagonLetterVFilledIcon(props: HexagonLetterVFilledIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M13.666 1.429l6.75 3.98.096.063.093.078.106.074a3.22 3.22 0 011.284 2.39l.005.204v7.284c0 1.175-.643 2.256-1.623 2.793l-6.804 4.302c-.98.538-2.166.538-3.2-.032l-6.695-4.237A3.23 3.23 0 012 15.502V8.217c0-1.106.57-2.128 1.476-2.705l6.95-4.098c1-.552 2.214-.552 3.24.015zm.577 5.6a1 1 0 00-1.213.728L12 11.875l-1.03-4.118a.998.998 0 00-1.569-.566 1 1 0 00-.371 1.052l2 8c.252 1.01 1.688 1.01 1.94 0l2-8a1 1 0 00-.727-1.213"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default HexagonLetterVFilledIcon;
/* prettier-ignore-end */
