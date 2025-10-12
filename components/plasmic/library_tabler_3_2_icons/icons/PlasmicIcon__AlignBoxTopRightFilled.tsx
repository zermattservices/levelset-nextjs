/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AlignBoxTopRightFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AlignBoxTopRightFilledIcon(
  props: AlignBoxTopRightFilledIconProps
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
          "M18.333 2c1.96 0 3.56 1.537 3.662 3.472l.005.195v12.666c0 1.96-1.537 3.56-3.472 3.662l-.195.005H5.667a3.667 3.667 0 01-3.662-3.472L2 18.333V5.667c0-1.96 1.537-3.56 3.472-3.662L5.667 2h12.666zM15 5a1 1 0 00-1 1v6l.007.117A1 1 0 0016 12V6l-.007-.117A1 1 0 0015 5zm3 0a1 1 0 00-1 1v4l.007.117A1 1 0 0019 10V6l-.007-.117A1 1 0 0018 5zm-6 0a1 1 0 00-1 1v2l.007.117A1 1 0 0013 8V6l-.007-.117A1 1 0 0012 5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default AlignBoxTopRightFilledIcon;
/* prettier-ignore-end */
