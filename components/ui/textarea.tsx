"use client";

import * as React from "react";
import OutlinedInput from "@mui/material/OutlinedInput";

function Textarea({ className, disabled, rows, ...props }: React.ComponentProps<"textarea">) {
  return <OutlinedInput className={className} disabled={disabled} multiline rows={rows} fullWidth inputProps={props} />;
}

export { Textarea };
