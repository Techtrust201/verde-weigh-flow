import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ValidationInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
  error?: string;
  required?: boolean;
  isValid?: boolean;
}

export function ValidationInput({
  label,
  error,
  required = false,
  isValid,
  className,
  ...props
}: ValidationInputProps) {
  const hasError = error || (required && !props.value);
  const isInvalid = hasError || isValid === false;

  return (
    <div className="space-y-1">
      {label && (
        <Label className={cn(isInvalid && "text-red-600")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        {...props}
        className={cn(
          isInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {required && !props.value && !error && (
        <p className="text-sm text-red-600 mt-1">Ce champ est obligatoire</p>
      )}
    </div>
  );
}

interface ValidationSelectProps extends React.ComponentProps<"select"> {
  label?: string;
  error?: string;
  required?: boolean;
  isValid?: boolean;
  children: React.ReactNode;
}

export function ValidationSelect({
  label,
  error,
  required = false,
  isValid,
  className,
  children,
  ...props
}: ValidationSelectProps) {
  const hasError = error || (required && !props.value);
  const isInvalid = hasError || isValid === false;

  return (
    <div className="space-y-1">
      {label && (
        <Label className={cn(isInvalid && "text-red-600")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <select
        {...props}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
      >
        {children}
      </select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {required && !props.value && !error && (
        <p className="text-sm text-red-600 mt-1">Ce champ est obligatoire</p>
      )}
    </div>
  );
}

interface ValidationTextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  required?: boolean;
  isValid?: boolean;
}

export function ValidationTextarea({
  label,
  error,
  required = false,
  isValid,
  className,
  ...props
}: ValidationTextareaProps) {
  const hasError = error || (required && !props.value);
  const isInvalid = hasError || isValid === false;

  return (
    <div className="space-y-1">
      {label && (
        <Label className={cn(isInvalid && "text-red-600")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <textarea
        {...props}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {required && !props.value && !error && (
        <p className="text-sm text-red-600 mt-1">Ce champ est obligatoire</p>
      )}
    </div>
  );
}
