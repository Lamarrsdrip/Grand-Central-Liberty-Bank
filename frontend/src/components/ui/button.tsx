import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  default: "bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(34,197,94,0.26)] hover:bg-emerald-400 active:bg-emerald-500",
  secondary: "border border-emerald-400/25 bg-emerald-400/12 text-emerald-100 hover:bg-emerald-400/20",
  outline: "border border-white/18 bg-white/8 text-white backdrop-blur hover:bg-white/14",
  ghost: "text-white/80 hover:bg-white/10 hover:text-white",
  destructive: "bg-destructive text-white shadow-[0_14px_34px_rgba(239,68,68,0.22)] hover:bg-red-500"
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "size-10 p-0"
};

export function Button({ className, variant = "default", size = "md", asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "rounded-2xl min-w-0 disabled:saturate-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
