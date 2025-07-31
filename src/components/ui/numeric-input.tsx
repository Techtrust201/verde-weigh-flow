import * as React from "react";
import { cn } from "@/lib/utils";

interface NumericInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: number;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, allowDecimals = true, min = 0, max, placeholder, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>("");

    React.useEffect(() => {
      setDisplayValue(value !== undefined && value !== 0 ? value.toString() : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty string for clearing
      if (inputValue === "") {
        setDisplayValue("");
        onChange(0);
        return;
      }

      // Regex for validating numeric input
      const regex = allowDecimals ? /^\d*\.?\d*$/ : /^\d*$/;
      
      if (regex.test(inputValue)) {
        const numericValue = parseFloat(inputValue);
        
        // Check min/max constraints
        if (!isNaN(numericValue)) {
          if (min !== undefined && numericValue < min) return;
          if (max !== undefined && numericValue > max) return;
          
          setDisplayValue(inputValue);
          onChange(numericValue);
        }
      }
    };

    const handleBlur = () => {
      // Format the display value on blur
      if (displayValue && !isNaN(parseFloat(displayValue))) {
        const numericValue = parseFloat(displayValue);
        if (allowDecimals) {
          setDisplayValue(numericValue.toFixed(2));
        } else {
          setDisplayValue(numericValue.toString());
        }
      }
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };