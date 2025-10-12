/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ProgressHelpIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ProgressHelpIcon(props: ProgressHelpIconProps) {
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
          "M12 16v.01M12 13a2 2 0 10-.377-3.961A1.98 1.98 0 0010.5 9.7M10 20.777a8.94 8.94 0 01-2.48-.969M14 3.223a9.003 9.003 0 010 17.554m-9.421-3.684a8.96 8.96 0 01-1.227-2.592M3.124 10.5c.16-.95.468-1.85.9-2.675l.169-.305m2.714-2.941A8.954 8.954 0 0110 3.223"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ProgressHelpIcon;
/* prettier-ignore-end */
