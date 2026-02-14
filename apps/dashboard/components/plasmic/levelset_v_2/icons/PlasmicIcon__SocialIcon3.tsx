/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SocialIcon3IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SocialIcon3Icon(props: SocialIcon3IconProps) {
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
        d={
          "M20.843 17.145a12 12 0 0 1-1.183 2.127q-.934 1.33-1.524 1.841-.912.839-1.958.862-.751.002-1.809-.432-1.057-.43-1.947-.43-.932 0-2.003.43-1.07.434-1.73.455-1.004.044-2.002-.885-.638-.555-1.594-1.907-1.025-1.441-1.685-3.347-.708-2.06-.708-3.99 0-2.212.957-3.811A5.6 5.6 0 0 1 5.66 6.03a5.4 5.4 0 0 1 2.708-.764q.798.001 2.096.487 1.296.488 1.662.489c.181 0 .798-.192 1.842-.576q1.481-.532 2.505-.444 2.778.223 4.166 2.193-2.483 1.506-2.457 4.21.023 2.107 1.524 3.5.68.645 1.524 1a16 16 0 0 1-.388 1.019zM16.598.44q0 1.651-1.203 3.079c-.967 1.13-2.137 1.783-3.405 1.68a3 3 0 0 1-.026-.417c0-1.056.46-2.186 1.277-3.11A4.9 4.9 0 0 1 14.796.504q.94-.46 1.779-.504.023.22.023.44"
        }
      ></path>
    </svg>
  );
}

export default SocialIcon3Icon;
/* prettier-ignore-end */
