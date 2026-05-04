import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
      "bg-primary text-primary-foreground hover:bg-transparent hover:text-primary border transition-all hover:border-primary":
        variant === "default",

      "bg-transparent  hover:bg-primary hover:text-secondary border border-primary transition-all":
        variant === "secondary",

      "border border-border bg-background hover:bg-transparent hover:text-foreground transition-all":
        variant === "outline",

      "bg-destructive text-destructive-foreground hover:bg-transparent hover:text-destructive border border-destructive transition-all":
        variant === "destructive",

      "bg-transparent hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border transition-all":
        variant === "ghost",

      "h-10 px-4 py-2": size === "default",
      "h-9 rounded-md px-3": size === "sm",
      "h-11 rounded-md px-8": size === "lg",
    },
    className,
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ className?: string }>,
      {
        className: cn(
          classes,
          (children as React.ReactElement<{ className?: string }>).props
            .className,
        ),
      },
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
