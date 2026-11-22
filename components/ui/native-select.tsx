"use client";

import * as React from "react";
import NativeSelectMui from "@mui/material/NativeSelect";
import OutlinedInput from "@mui/material/OutlinedInput";

type Props = Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" };

function NativeSelect({ className, size, children, value, defaultValue, onChange, disabled, ...props }: Props) {
  return <NativeSelectMui className={className} input={<OutlinedInput size={size === "sm" ? "small" : "medium"} />} inputProps={props} value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled}>{children}</NativeSelectMui>;
}

export { NativeSelect };
