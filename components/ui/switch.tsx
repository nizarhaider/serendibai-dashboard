"use client";

import MuiSwitch from "@mui/material/Switch";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof MuiSwitch>, "onChange" | "size"> & {
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "default";
};

function Switch({ onCheckedChange, size, "aria-label": label, ...props }: Props) {
  return <MuiSwitch {...props} slotProps={{ input: { "aria-label": label } }} size={size === "sm" ? "small" : "medium"} onChange={(_, checked) => onCheckedChange?.(checked)} />;
}

export { Switch };
