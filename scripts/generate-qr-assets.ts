/**
 * Generate styled QR code assets using react-native-qrcode-styled's path generation.
 *
 * Uses the same helpers/adapters from the installed package so the output
 * matches what the React Native component renders. Styling modeled after
 * the CirclePieces + WithLogo examples in the cloned repo.
 *
 * Outputs:
 *  1. apps/marketing/public/qr-the-approach.png         – white QR on transparent
 *  2. apps/marketing/public/qr-chocolate-wrapper.png     – 1.5"×2.75" @300dpi hero gradient
 */

import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// ---------- pull in the package's own compiled helpers ----------
const pkgRoot = path.resolve(
  __dirname,
  '../apps/mobile/node_modules/react-native-qrcode-styled/lib/commonjs'
);
const helpers = require(path.join(pkgRoot, 'helpers'));
const { createQRCode } = require(path.join(pkgRoot, 'adapters/qrcode'));

const { getPieceRoundedSquarePathData } = helpers;

// ---------- config ----------
const QR_DATA = 'https://levelset.io/the-approach';
const QR_SIZE = 1200; // High-res internal render, downsampled for smooth output
const ERROR_CORRECTION = 'H';
const QR_COLOR = '#ffffff';
const QR_PADDING = 60; // Scaled with QR_SIZE
const PIECE_SCALE = 1.05; // slightly above default 1.03 to ensure seamless merging in rasterized output

// Styling: GluedRoundedPieces.tsx style with WithLogo.tsx eye styling

// Marketing wrapper: 1.5" × 2.75" @ 300 DPI
const DPI = 300;
const WRAPPER_W = Math.round(1.5 * DPI); // 450px
const WRAPPER_H = Math.round(2.75 * DPI); // 825px

const OUT_DIR = path.resolve(__dirname, '../apps/marketing/public');
const LOGO_PATH = path.resolve(
  __dirname,
  '../apps/mobile/assets/images/favicon.png'
);

// ---------- generate QR data using the package's adapter (adapters/qrcode.ts) ----------
const { size: qrCodeSize, bitMatrix } = createQRCode(QR_DATA, {
  errorCorrectionLevel: ERROR_CORRECTION,
});
const pieceSize = QR_SIZE / qrCodeSize;
const qrPixelSize = qrCodeSize * pieceSize; // === QR_SIZE

// Pre-convert percentages to pixel values (CJS build strips convertMultiValueToNumber)
const pieceBR = pieceSize * 0.5; // 50% = circle (GluedRoundedPieces.tsx)

console.log(
  `QR matrix: ${qrCodeSize}×${qrCodeSize}, pieceSize: ${pieceSize.toFixed(2)}px`
);

// ---------- logo exclusion zone (~14% area for H correction) ----------
const logoPiecesCount = Math.floor(qrCodeSize * 0.28);
const logoGridSize =
  logoPiecesCount % 2 === 0 ? logoPiecesCount - 1 : logoPiecesCount;
const logoGridStart = Math.floor((qrCodeSize - logoGridSize) / 2);
const logoArea = {
  x: logoGridStart * pieceSize,
  y: logoGridStart * pieceSize,
  width: logoGridSize * pieceSize,
  height: logoGridSize * pieceSize,
};

// ---------- build ALL piece paths uniformly (GluedRoundedPieces style) ----------
// The reference example does NOT use separate eye rendering — all bits (including
// eye areas) are rendered as uniform glued rounded pieces for a cohesive look.
interface PiecePath {
  d: string;
  originX: number;
  originY: number;
}

function buildPiecePaths(): PiecePath[] {
  const paths: PiecePath[] = [];
  const br = [pieceBR, pieceBR, pieceBR, pieceBR];

  for (let y = 0; y < bitMatrix.length; y++) {
    for (let x = 0; x < bitMatrix.length; x++) {
      if (bitMatrix[y]?.[x] !== 1) continue;

      // Skip logo area
      const px = x * pieceSize;
      const py = y * pieceSize;
      if (
        logoArea.x < px + pieceSize &&
        logoArea.x + logoArea.width > px &&
        logoArea.y < py + pieceSize &&
        logoArea.y + logoArea.height > py
      )
        continue;

      const d = getPieceRoundedSquarePathData({
        x,
        y,
        size: pieceSize,
        cornerType: 'rounded',
        borderRadius: br,
        isGlued: true,
        isLiquid: false,
        bitMatrix,
      });
      paths.push({
        d,
        originX: px + pieceSize / 2,
        originY: py + pieceSize / 2,
      });
    }
  }
  return paths;
}

// ---------- assemble SVG ----------
function buildSVG(): string {
  const piecePaths = buildPiecePaths();
  const totalSize = QR_SIZE + QR_PADDING * 2;
  const clean = (d: string) => d.replace(/\s+/g, ' ').trim();

  // Each piece gets scaled from its center (matching SVGPieces.tsx scale + origin)
  const pieceElements = piecePaths.map(({ d, originX, originY }) => {
    const tx = originX - PIECE_SCALE * originX;
    const ty = originY - PIECE_SCALE * originY;
    return `<path d="${clean(d)}" transform="matrix(${PIECE_SCALE},0,0,${PIECE_SCALE},${tx.toFixed(4)},${ty.toFixed(4)})"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">
  <g transform="translate(${QR_PADDING}, ${QR_PADDING})" fill="${QR_COLOR}">
    ${pieceElements.join('\n    ')}
  </g>
</svg>`;
}

// ---------- white favicon logo ----------
async function createWhiteLogo(size: number): Promise<Buffer> {
  const { data } = await sharp(LOGO_PATH)
    .resize(size, size, { fit: 'contain', background: '#00000000' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      a = data[i + 3];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    if (a > 50 && lum < 200) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 255;
    }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toBuffer();
}

// ---------- hero gradient (exact from Hero.tsx) ----------
// CSS: radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)
// 80% and 60% are radii (not diameters), centered at top-center
function buildGradientSVG(w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="hero" cx="50%" cy="0%" rx="80%" ry="60%"
      gradientUnits="objectBoundingBox" spreadMethod="pad">
      <stop offset="0%" stop-color="#31664A"/>
      <stop offset="50%" stop-color="#1a3d2d"/>
      <stop offset="100%" stop-color="#162e23"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#hero)"/>
</svg>`;
}

// ---------- main ----------
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const totalSize = QR_SIZE + QR_PADDING * 2;

  const FINAL_SIZE = 440; // Final output size

  // 1) Styled QR SVG -> PNG at high resolution
  const qrSvg = buildSVG();
  fs.writeFileSync('/tmp/qr-debug.svg', qrSvg);
  console.log('Debug SVG saved to /tmp/qr-debug.svg');

  const qrPngHiRes = await sharp(Buffer.from(qrSvg))
    .resize(totalSize, totalSize)
    .png()
    .toBuffer();

  // 2) White logo composited into center at high-res
  const logoDisplaySize = Math.round(logoArea.width * 0.95);
  const whiteLogo = await createWhiteLogo(logoDisplaySize);
  const logoX = Math.round((totalSize - logoDisplaySize) / 2);
  const logoY = Math.round((totalSize - logoDisplaySize) / 2);

  const qrWithLogoHiRes = await sharp(qrPngHiRes)
    .composite([{ input: whiteLogo, left: logoX, top: logoY }])
    .png()
    .toBuffer();

  // Downsample to final size for smooth anti-aliased output
  const qrWithLogo = await sharp(qrWithLogoHiRes)
    .resize(FINAL_SIZE, FINAL_SIZE)
    .png()
    .toBuffer();

  const qrOutPath = path.join(OUT_DIR, 'qr-the-approach.png');
  fs.writeFileSync(qrOutPath, qrWithLogo);
  console.log(`Saved styled QR: ${qrOutPath} (${FINAL_SIZE}×${FINAL_SIZE}px)`);

  // 3) Chocolate wrapper background (1.5" × 2.75" @ 300dpi) — gradient only, no QR
  const wrapperPng = await sharp(Buffer.from(buildGradientSVG(WRAPPER_W, WRAPPER_H)))
    .png()
    .toBuffer();

  const wrapperOutPath = path.join(OUT_DIR, 'qr-chocolate-wrapper.png');
  fs.writeFileSync(wrapperOutPath, wrapperPng);
  console.log(
    `Saved wrapper: ${wrapperOutPath} (${WRAPPER_W}×${WRAPPER_H}px — 1.5"×2.75" @${DPI}dpi)`
  );

  // 4) Preview on green
  const previewBg = await sharp({
    create: { width: 500, height: 500, channels: 3, background: '#1e3f2e' },
  })
    .png()
    .toBuffer();

  await sharp(previewBg)
    .composite([{ input: qrWithLogo, left: 30, top: 30 }])
    .toFile('/tmp/qr-styled-preview.png');
  console.log(`Preview saved to /tmp/qr-styled-preview.png (rendered from ${totalSize}px → ${FINAL_SIZE}px)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
