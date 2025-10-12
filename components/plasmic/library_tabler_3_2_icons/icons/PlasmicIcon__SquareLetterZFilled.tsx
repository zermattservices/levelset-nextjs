/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SquareLetterZFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SquareLetterZFilledIcon(props: SquareLetterZFilledIconProps) {
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
          "M19 2a3 3 0 013 3v14a3 3 0 01-3 3H5a3 3 0 01-3-3V5a3 3 0 013-3h14zm-5 5h-4a1 1 0 00-1 1l.007.117A1 1 0 0010 9h2.382l-3.276 6.553A1 1 0 0010 17h4a1 1 0 001-1l-.007-.117A1 1 0 0014 15h-2.382l3.276-6.553A1 1 0 0014 7z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SquareLetterZFilledIcon;
/* prettier-ignore-end */
