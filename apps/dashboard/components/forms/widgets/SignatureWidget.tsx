import * as React from 'react';
import { FormControl, FormLabel, Button, FormHelperText, Box } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", sans-serif';

/**
 * Signature widget for RJSF forms.
 * Uses an HTML canvas for simple signature capture.
 * Stores as base64 data URL string.
 */
export function SignatureWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = React.useRef(false);
  const [hasSignature, setHasSignature] = React.useState(!!value);

  // Draw existing signature on load
  React.useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
      setHasSignature(true);
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || readonly) return;
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled || readonly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setHasSignature(true);

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasSignature(false);
    onChange('');
  };

  const isDisabled = disabled || readonly;

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      {label && (
        <FormLabel sx={{ fontFamily, fontSize: 14, fontWeight: 500, mb: 1 }}>
          {label}
        </FormLabel>
      )}
      <Box
        sx={{
          border: `1px solid ${rawErrors && rawErrors.length > 0 ? 'var(--ls-color-destructive)' : 'var(--ls-color-muted-border)'}`,
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: isDisabled ? 'var(--ls-color-neutral-foreground)' : '#ffffff',
        }}
      >
        <canvas
          ref={canvasRef}
          id={id}
          width={500}
          height={150}
          style={{
            width: '100%',
            height: 150,
            display: 'block',
            cursor: isDisabled ? 'not-allowed' : 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </Box>
      {!isDisabled && hasSignature && (
        <Button
          size="small"
          startIcon={<ClearIcon sx={{ fontSize: 14 }} />}
          onClick={handleClear}
          sx={{
            fontFamily,
            fontSize: 12,
            textTransform: 'none',
            color: 'var(--ls-color-muted)',
            alignSelf: 'flex-end',
            mt: 0.5,
          }}
        >
          Clear
        </Button>
      )}
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
