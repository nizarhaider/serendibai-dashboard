"use client";

import * as React from "react";
import MuiButton from "@mui/material/Button";

type Props = React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
};

function Button({ variant = "default", size = "default", className = "", ...props }: Props) {
  const style = className.includes("primary") ? "contained" : className.includes("danger") ? "outlined" : variant === "default" ? "contained" : variant === "outline" ? "outlined" : "text";
  return <MuiButton {...props} type={props.type ?? (props.onClick ? "button" : "submit")} className={className} variant={style} color={className.includes("danger") || variant === "destructive" ? "error" : "primary"} size={size === "lg" ? "large" : size === "sm" || size === "xs" ? "small" : "medium"} />;
}

export { Button };
