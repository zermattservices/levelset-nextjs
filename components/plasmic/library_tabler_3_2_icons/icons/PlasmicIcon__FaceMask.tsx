/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FaceMaskIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FaceMaskIcon(props: FaceMaskIconProps) {
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
          "M5 14.5h-.222C3.243 14.5 2 13.38 2 12s1.243-2.5 2.778-2.5H5m14 5h.222C20.756 14.5 22 13.38 22 12s-1.244-2.5-2.778-2.5H19M9 10h6m-6 4h6"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M12.55 18.843l5-1.429A2 2 0 0019 15.491V8.51a2 2 0 00-1.45-1.923l-5-1.429a2 2 0 00-1.1 0l-5 1.429A2 2 0 005 8.509v6.982a2 2 0 001.45 1.923l5 1.429a2 2 0 001.1 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FaceMaskIcon;
/* prettier-ignore-end */
