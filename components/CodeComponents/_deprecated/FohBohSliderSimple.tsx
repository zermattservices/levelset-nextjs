import * as React from "react";

export function FohBohSliderSimple({ 
  value, 
  onChange, 
  className,
  size = "medium",
  variant = "default",
  activeColor = "#111827",
  inactiveColor = "#6b7280",
  backgroundColor = "#f3f4f6",
  borderColor = "#e5e7eb"
}: {
  value?: "FOH" | "BOH";
  onChange?: (value: "FOH" | "BOH") => void;
  className?: string;
  size?: "small" | "medium" | "large";
  variant?: "default" | "minimal" | "outlined";
  activeColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}) {
  const [selectedValue, setSelectedValue] = React.useState<"FOH" | "BOH">(value || "FOH");

  // Update local state when prop changes
  React.useEffect(() => {
    if (value) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (newValue: "FOH" | "BOH") => {
    setSelectedValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  // Size classes
  const sizeClasses = {
    small: "text-xs px-2 py-1",
    medium: "text-sm px-3 py-2", 
    large: "text-base px-4 py-3"
  };

  return (
    <div 
      className={`foh-boh-slider-simple ${className || ''}`}
      role="tablist" 
      aria-label="Area switch"
      data-selected={selectedValue}
      style={{
        display: 'inline-flex',
        border: `1px solid ${borderColor}`,
        borderRadius: '999px',
        overflow: 'hidden',
        background: backgroundColor,
        boxShadow: '0 1px 2px rgba(0,0,0,.05)',
        margin: '10px 0'
      }}
    >
      <input 
        type="radio" 
        name="area" 
        id="segFOH" 
        value="FOH"
        checked={selectedValue === "FOH"}
        onChange={() => handleChange("FOH")}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      <label 
        htmlFor="segFOH" 
        role="tab" 
        aria-selected={selectedValue === "FOH"}
        style={{
          padding: '8px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '14px',
          color: selectedValue === "FOH" ? '#fff' : inactiveColor,
          transition: 'all 0.15s ease',
          fontWeight: selectedValue === "FOH" ? '600' : '500',
          minWidth: '60px',
          textAlign: 'center',
          background: selectedValue === "FOH" ? activeColor : 'transparent'
        }}
      >
        FOH
      </label>
      
      <input 
        type="radio" 
        name="area" 
        id="segBOH" 
        value="BOH"
        checked={selectedValue === "BOH"}
        onChange={() => handleChange("BOH")}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      <label 
        htmlFor="segBOH" 
        role="tab" 
        aria-selected={selectedValue === "BOH"}
        style={{
          padding: '8px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '14px',
          color: selectedValue === "BOH" ? '#fff' : inactiveColor,
          transition: 'all 0.15s ease',
          fontWeight: selectedValue === "BOH" ? '600' : '500',
          minWidth: '60px',
          textAlign: 'center',
          background: selectedValue === "BOH" ? activeColor : 'transparent'
        }}
      >
        BOH
      </label>
    </div>
  );
}
