import * as React from 'react';
import { FormControl, FormLabel, Button, FormHelperText, Box } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", sans-serif';

/**
 * Signature widget for RJSF forms.
 * Uses an HTML canvas for multi-stroke signature capture.
 * Stores as base64 data URL string.
 */
export function SignatureWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = React.useRef(false);
  const [hasSignature, setHasSignature] = React.useState(!!value);

  // Track the last value WE sent via onChange so the useEffect
  // only redraws on *external* value changes (initial load, form reset).
  const lastEmittedRef = React.useRef<string>(value ?? '');

  // Scale canvas for high-DPI screens so strokes aren't blurry
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }, []);

  // Redraw canvas only when value is set externally (not by our own onChange)
  React.useEffect(() => {
    if (!canvasRef.current) return;

    // If we emitted this value ourselves, skip — canvas is already correct.
    if (value === lastEmittedRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
      setHasSignature(true);
    } else {
      // External clear (form reset)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }

    lastEmittedRef.current = value ?? '';
  }, [value]);

  /** Get touch/mouse coordinates relative to the canvas CSS box */
  const getPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const raw = 'touches' in e ? e.touches[0] : e;
    return {
      x: raw.clientX - rect.left,
      y: raw.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || readonly) return;
    e.preventDefault(); // Prevent scroll on touch devices
    isDrawingRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled || readonly) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPoint(e);
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
      lastEmittedRef.current = dataUrl;
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
    lastEmittedRef.current = '';
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
          backgroundColor: isDisabled ? 'var(--ls-color-neutral-foreground)' : 'var(--ls-color-bg-container)',
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
