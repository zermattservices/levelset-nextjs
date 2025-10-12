/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BrandCloudflareIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BrandCloudflareIcon(props: BrandCloudflareIconProps) {
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
          "M13.031 7.007C15.5 7 16.326 8.3 17 10c4 0 4.994 3.825 5 6H2c-.001-1.64 1.36-2.954 3-3 0-1.5 1-3 3-3 .66-1.942 2.562-2.986 5.031-2.993zM12 13h6m-1-3l-2.5 6"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BrandCloudflareIcon;
/* prettier-ignore-end */
