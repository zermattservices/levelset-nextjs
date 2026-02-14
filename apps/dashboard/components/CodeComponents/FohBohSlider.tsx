import * as React from "react";

export const VARIANTS = {
  foh: {
    cssSelector: '[data-selected="FOH"]',
    displayName: 'FOH'
  },
  boh: {
    cssSelector: '[data-selected="BOH"]',
    displayName: 'BOH'
  }
};

type VariantType = keyof typeof VARIANTS;

export function FohBohSlider({ 
  value, 
  onChange, 
  className,
  size = "medium",
  variant = "default",
  plasmicUpdateVariant
}: {
  value?: "FOH" | "BOH";
  onChange?: (value: "FOH" | "BOH") => void;
  className?: string;
  size?: "small" | "medium" | "large";
  variant?: "default" | "minimal" | "outlined";
  plasmicUpdateVariant?: (changes: Partial<Record<VariantType, boolean>>) => void;
}) {
  const [selectedValue, setSelectedValue] = React.useState<"FOH" | "BOH">(value || "FOH");

  // Update local state when prop changes
  React.useEffect(() => {
    if (value) {
      setSelectedValue(value);
    }
  }, [value]);

  // Update Plasmic variants when selection changes
  React.useEffect(() => {
    plasmicUpdateVariant?.({
      foh: selectedValue === "FOH",
      boh: selectedValue === "BOH"
    });
  }, [selectedValue, plasmicUpdateVariant]);

  const handleChange = (newValue: "FOH" | "BOH") => {
    console.log('[FohBohSlider] handleChange called with:', newValue);
    setSelectedValue(newValue);
    // Call onChange with the new value
    if (onChange) {
      console.log('[FohBohSlider] Calling parent onChange with:', newValue);
      onChange(newValue);
    } else {
      console.warn('[FohBohSlider] No onChange handler provided');
    }
  };

  // Size classes
  const sizeClasses = {
    small: "text-xs px-2 py-1",
    medium: "text-sm px-3 py-2", 
    large: "text-base px-4 py-3"
  };

  // Variant classes
  const variantClasses = {
    default: "bg-gray-100 border-gray-300",
    minimal: "bg-transparent border-gray-200",
    outlined: "bg-white border-gray-400 shadow-sm"
  };

  return (
    <div 
      className={`foh-boh-slider ${className || ''}`}
      role="tablist" 
      aria-label="Area switch"
      data-selected={selectedValue}
      style={{
        display: 'inline-flex',
        border: '1px solid #e5e7eb',
        borderRadius: '999px',
        overflow: 'hidden',
        background: '#f3f4f6',
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
        onClick={(e) => {
          e.preventDefault();
          handleChange("FOH");
        }}
        style={{
          padding: '8px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '14px',
          fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
          color: selectedValue === "FOH" ? '#fff' : '#6b7280',
          transition: 'all 0.15s ease',
          fontWeight: selectedValue === "FOH" ? '600' : '500',
          minWidth: '60px',
          textAlign: 'center',
          background: selectedValue === "FOH" ? '#111827' : 'transparent'
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
        onClick={(e) => {
          e.preventDefault();
          handleChange("BOH");
        }}
        style={{
          padding: '8px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '14px',
          fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
          color: selectedValue === "BOH" ? '#fff' : '#6b7280',
          transition: 'all 0.15s ease',
          fontWeight: selectedValue === "BOH" ? '600' : '500',
          minWidth: '60px',
          textAlign: 'center',
          background: selectedValue === "BOH" ? '#111827' : 'transparent'
        }}
      >
        BOH
      </label>
    </div>
  );
}
