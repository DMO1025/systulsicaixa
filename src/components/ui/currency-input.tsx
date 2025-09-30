"use client";

import * as React from "react"
import { Input } from "./input"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    
    const format = (val: number | undefined) => {
      if (val === undefined || val === null) return '';
      return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val);
    }
    
    const parse = (val: string): number | undefined => {
        const numericString = val.replace(/[^\d]/g, '');
        if (numericString === '') return undefined;
        const numberValue = parseFloat(numericString) / 100;
        return isNaN(numberValue) ? undefined : numberValue;
    }

    const [displayValue, setDisplayValue] = React.useState(format(value));

    React.useEffect(() => {
      setDisplayValue(format(value));
    }, [value]);


    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = event.target.value;
      setDisplayValue(inputVal);
      const parsedValue = parse(inputVal);
      onValueChange(parsedValue);
    };
    
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const parsedValue = parse(event.target.value);
        setDisplayValue(format(parsedValue));
        if (props.onBlur) {
            props.onBlur(event);
        }
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        type="text"
        inputMode="decimal"
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
