/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SquareLetterXFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SquareLetterXFilledIcon(props: SquareLetterXFilledIconProps) {
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
          "M19 2a3 3 0 013 3v14a3 3 0 01-3 3H5a3 3 0 01-3-3V5a3 3 0 013-3h14zm-4.553 5.106a1 1 0 00-1.341.447L12 9.763l-1.106-2.21a1 1 0 00-1.234-.494l-.107.047a1 1 0 00-.447 1.341L10.88 12l-1.775 3.553a1 1 0 00.345 1.283l.102.058a1 1 0 001.341-.447L12 14.236l1.106 2.211a1 1 0 001.234.494l.107-.047a1 1 0 00.447-1.341L13.118 12l1.776-3.553a1 1 0 00-.345-1.283l-.102-.058z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SquareLetterXFilledIcon;
/* prettier-ignore-end */
