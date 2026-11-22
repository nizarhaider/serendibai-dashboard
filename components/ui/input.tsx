"use client";

import * as React from "react";
import OutlinedInput from "@mui/material/OutlinedInput";

function Input({ className, disabled, ...props }: React.ComponentProps<"input">) {
  return <OutlinedInput className={className} disabled={disabled} size="small" fullWidth inputProps={props} />;
}

export { Input };
