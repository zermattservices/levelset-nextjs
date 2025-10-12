import * as React from "react";

const GROUPS = {
  FOH: ["iPOS","Host","OMD","Runner","Bagging","Drinks 1/3","Drinks 2","3H Values","Trainer","Team Lead"],
  BOH: ["Breading","Secondary","Fries","Primary","Machines","Prep","3H Values","Trainer","Team Lead"]
};

const POS_TAB = {
  FOH: { "3H Values": "3H FOH", "Trainer": "FOH Trainer", "Team Lead": "FOH Team Lead" },
  BOH: { "3H Values": "3H BOH", "Trainer": "BOH Trainer", "Team Lead": "BOH Team Lead" }
};

export function PositionButtons({ 
  group, 
  selectedPosition, 
  onPositionChange, 
  className
}: {
  group?: "FOH" | "BOH";
  selectedPosition?: string;
  onPositionChange?: (position: string) => void;
  className?: string;
}) {
  const [internalSelectedPosition, setInternalSelectedPosition] = React.useState<string>(selectedPosition || "");

  // Update internal state when prop changes
  React.useEffect(() => {
    if (selectedPosition !== undefined) {
      setInternalSelectedPosition(selectedPosition);
    }
  }, [selectedPosition]);

  // Use prop selectedPosition if provided, otherwise use internal state
  const actualSelectedPosition = selectedPosition !== undefined ? selectedPosition : internalSelectedPosition;

  // Handle position changes
  const handlePositionChange = (position: string) => {
    if (onPositionChange) {
      onPositionChange(position);
    } else {
      setInternalSelectedPosition(position);
    }
  };

  // Get positions for the current group
  const positions = group ? GROUPS[group] || [] : [];

  // Convert position to tab name
  const positionToTab = (group: "FOH" | "BOH", position: string) => {
    const map = POS_TAB[group] || {};
    return map[position as keyof typeof map] || position;
  };

  return (
    <div 
      className={`position-buttons ${className || ''}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        margin: '10px 0'
      }}
    >
      {positions.map((position) => {
        const isSelected = actualSelectedPosition === position;
        return (
          <button
            key={position}
            type="button"
            onClick={() => handlePositionChange(position)}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '20px',
              backgroundColor: isSelected ? '#111827' : '#f3f4f6',
              color: isSelected ? '#ffffff' : '#374151',
              fontSize: '14px',
              fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
              fontWeight: isSelected ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              minWidth: '80px',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            aria-pressed={isSelected}
            role="button"
          >
            {position}
          </button>
        );
      })}
    </div>
  );
}
