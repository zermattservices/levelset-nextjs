/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Trash01IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Trash01Icon(props: Trash01IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M10.667 4v-.533c0-.747 0-1.12-.146-1.406a1.33 1.33 0 0 0-.582-.582c-.286-.146-.659-.146-1.406-.146H7.467c-.747 0-1.12 0-1.406.146-.25.127-.455.331-.582.582-.146.286-.146.659-.146 1.406V4m1.334 3.667V11m2.666-3.333V11M2 4h12m-1.333 0v7.467c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874c-.428.218-.988.218-2.108.218H6.533c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874c-.218-.428-.218-.988-.218-2.108V4"
        }
      ></path>
    </svg>
  );
}

export default Trash01Icon;
/* prettier-ignore-end */
