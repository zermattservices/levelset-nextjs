/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ContainerIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ContainerIcon(props: ContainerIconProps) {
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
          "M20 4v.01M20 20v.01M20 16v.01M20 12v.01M20 8v.01M8 5a1 1 0 011-1h6a1 1 0 011 1v14a1 1 0 01-1 1H9a1 1 0 01-1-1V5zM4 4v.01M4 20v.01M4 16v.01M4 12v.01M4 8v.01"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ContainerIcon;
/* prettier-ignore-end */
