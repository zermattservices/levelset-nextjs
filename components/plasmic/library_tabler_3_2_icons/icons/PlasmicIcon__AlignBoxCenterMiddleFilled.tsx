/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AlignBoxCenterMiddleFilledIconProps =
  React.ComponentProps<"svg"> & {
    title?: string;
  };

export function AlignBoxCenterMiddleFilledIcon(
  props: AlignBoxCenterMiddleFilledIconProps
) {
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
          "M19 2a3 3 0 012.995 2.824L22 5v14a3 3 0 01-2.824 2.995L19 22H5a3 3 0 01-2.993-2.802L2 19V5a3 3 0 012.824-2.995L5 2h14zm-6 12h-2l-.117.007a1 1 0 000 1.986L11 16h2l.117-.007a1 1 0 000-1.986L13 14zm2-3H9l-.117.007a1 1 0 000 1.986L9 13h6l.117-.007a1 1 0 000-1.986L15 11zm-1-3h-4l-.117.007a1 1 0 000 1.986L10 10h4l.117-.007a1 1 0 000-1.986L14 8z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default AlignBoxCenterMiddleFilledIcon;
/* prettier-ignore-end */
