/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SocialIcon4IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SocialIcon4Icon(props: SocialIcon4IconProps) {
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
        fill={"currentColor"}
        fillRule={"evenodd"}
        d={
          "m15.766 22.5-5.297-7.55-6.631 7.55H1.032l8.192-9.325L1.032 1.5h7.203l4.993 7.116L19.483 1.5h2.805l-7.812 8.893L22.97 22.5zm3.124-2.129h-1.888L5.049 3.63h1.89l4.786 6.704.828 1.163 6.337 8.875z"
        }
        clipRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default SocialIcon4Icon;
/* prettier-ignore-end */
