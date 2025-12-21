/**
 * Script to generate QR codes and PDFs for all locations
 * 
 * This script:
 * 1. Fetches all locations from the database
 * 2. For each location:
 *    - Generates a QR code as PNG (Levelset green with logo)
 *    - Uploads the QR to location_assets/pwa/qr_img/{location_id}.png
 *    - Generates a PDF with Levelset branding using Satoshi font
 *    - Uploads the PDF to location_assets/pwa/info_pdf/{location_id}.pdf
 * 
 * Run with: npx ts-node --esm scripts/generate-location-pdfs.ts
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'location_assets';
const QR_FOLDER = 'pwa/qr_img';
const PDF_FOLDER = 'pwa/info_pdf';
const LEVELSET_GREEN = '#31664a';

interface Location {
  id: string;
  name: string;
  location_number: string;
  location_mobile_token: string | null;
}

async function generateQRCodeWithLogo(url: string): Promise<Buffer> {
  // Generate QR code buffer
  const qrBuffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: LEVELSET_GREEN,
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  // Get the favicon or logo to overlay
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  const levelsetIconPath = path.join(__dirname, '../public/levelset-icon.png');
  
  // Check which logo file exists
  let logoPath: string | null = null;
  if (fs.existsSync(levelsetIconPath)) {
    logoPath = levelsetIconPath;
  } else if (fs.existsSync(faviconPath)) {
    logoPath = faviconPath;
  }

  if (!logoPath) {
    console.log('  No logo found, using plain QR code');
    return qrBuffer;
  }

  try {
    // Resize logo to appropriate size for QR code center
    const logoSize = 80; // Size of logo in center
    const logoBuffer = await sharp(logoPath)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    // Composite logo onto QR code center
    const qrWithLogo = await sharp(qrBuffer)
      .composite([{
        input: logoBuffer,
        gravity: 'center',
      }])
      .png()
      .toBuffer();

    return qrWithLogo;
  } catch (err) {
    console.log('  Error compositing logo, using plain QR code:', err);
    return qrBuffer;
  }
}

async function generatePDF(
  locationName: string,
  qrCodeBuffer: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    // Register Satoshi fonts if available (use Variable font which is TTF)
    const satoshiVariablePath = path.join(__dirname, '../public/fonts/Satoshi-Variable.ttf');
    
    const hasSatoshi = fs.existsSync(satoshiVariablePath);
    
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
      autoFirstPage: true,
      bufferPages: true,
    });

    // Register fonts if available (Satoshi-Variable.ttf is a variable font)
    if (hasSatoshi) {
      doc.registerFont('Satoshi', satoshiVariablePath);
      doc.registerFont('Satoshi-Bold', satoshiVariablePath);
      doc.registerFont('Satoshi-Medium', satoshiVariablePath);
      doc.registerFont('Satoshi-Italic', satoshiVariablePath);
    }

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Get page dimensions
    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    // Use Satoshi if available, otherwise Helvetica
    const fontRegular = hasSatoshi ? 'Satoshi' : 'Helvetica';
    const fontBold = hasSatoshi ? 'Satoshi-Bold' : 'Helvetica-Bold';
    const fontMedium = hasSatoshi ? 'Satoshi-Medium' : 'Helvetica';
    const fontItalic = hasSatoshi ? 'Satoshi-Italic' : 'Helvetica-Oblique';

    // Add Levelset logo at the top
    const logoPath = path.join(__dirname, '../public/logos/Levelset no margin.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, centerX - 75, 50, { width: 150 });
    } else {
      // Fallback to text if logo not found
      doc.fontSize(32)
        .fillColor(LEVELSET_GREEN)
        .font(fontBold)
        .text('Levelset', 0, 60, { align: 'center' });
    }

    // Title
    doc.fontSize(24)
      .fillColor('#0d1b14')
      .font(fontBold)
      .text('Mobile App Access', 0, 130, { align: 'center' });

    // Location name
    doc.fontSize(18)
      .fillColor('#666666')
      .font(fontRegular)
      .text(locationName, 0, 165, { align: 'center' });

    // Add QR code centered - make it larger to fill space
    // The QR code already has the logo composited in the center
    const qrSize = 280;
    const qrY = 210;
    doc.image(qrCodeBuffer, centerX - qrSize / 2, qrY, { width: qrSize });

    // Instructions heading
    const instructionsY = qrY + qrSize + 30;
    doc.fontSize(16)
      .fillColor(LEVELSET_GREEN)
      .font(fontBold)
      .text('Scan to access the Levelset mobile app', 0, instructionsY, { align: 'center', width: pageWidth });

    // Description
    doc.fontSize(12)
      .fillColor('#666666')
      .font(fontRegular)
      .text('Use this QR code to give leaders quick access to:', 0, instructionsY + 35, { align: 'center', width: pageWidth });

    // Bullet points - centered
    const bulletY = instructionsY + 65;
    doc.fontSize(12)
      .fillColor('#0d1b14')
      .font(fontMedium);
    
    doc.text('• Submit positional ratings', 0, bulletY, { align: 'center', width: pageWidth });
    doc.text('• Document discipline infractions', 0, bulletY + 20, { align: 'center', width: pageWidth });
    doc.text('• View the PEA Classic page', 0, bulletY + 40, { align: 'center', width: pageWidth });

    // Tip
    doc.fontSize(11)
      .fillColor('#666666')
      .font(fontItalic)
      .text('Tip: Add the app to your home screen for quick access!', 0, bulletY + 75, { align: 'center', width: pageWidth });

    // Footer - positioned at bottom of page
    doc.fontSize(10)
      .fillColor('#999999')
      .font(fontRegular)
      .text('Powered by Levelset', 0, 720, { align: 'center', width: pageWidth });

    doc.end();
  });
}

async function uploadToStorage(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string | null> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error(`  Error uploading ${path}:`, uploadError.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

async function processLocation(location: Location): Promise<void> {
  console.log(`\nProcessing: ${location.name} (${location.location_number})`);

  if (!location.location_mobile_token) {
    console.log('  Skipping - no mobile token');
    return;
  }

  const pwaUrl = `https://app.levelset.io/mobile/${location.location_mobile_token}`;
  console.log(`  PWA URL: ${pwaUrl}`);

  try {
    // Generate QR code with logo
    console.log('  Generating QR code...');
    const qrBuffer = await generateQRCodeWithLogo(pwaUrl);

    // Upload QR code
    const qrPath = `${QR_FOLDER}/${location.id}.png`;
    console.log(`  Uploading QR to ${qrPath}...`);
    const qrUrl = await uploadToStorage(BUCKET_NAME, qrPath, qrBuffer, 'image/png');
    if (qrUrl) {
      console.log(`  QR uploaded: ${qrUrl}`);
    }

    // Generate PDF with proper naming
    console.log('  Generating PDF...');
    const pdfBuffer = await generatePDF(location.name, qrBuffer);

    // Upload PDF - use friendly name format: "Levelset App Access - Location Name.pdf"
    const sanitizedName = location.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const pdfFileName = `Levelset App Access - ${sanitizedName}.pdf`;
    const pdfPath = `${PDF_FOLDER}/${location.id}.pdf`;
    console.log(`  Uploading PDF as "${pdfFileName}" to ${pdfPath}...`);
    const pdfUrl = await uploadToStorage(BUCKET_NAME, pdfPath, pdfBuffer, 'application/pdf');
    if (pdfUrl) {
      console.log(`  PDF uploaded: ${pdfUrl}`);
    }

    console.log('  ✓ Done');
  } catch (err) {
    console.error(`  Error processing location:`, err);
  }
}

async function main() {
  console.log('Fetching locations...');

  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, location_number, location_mobile_token')
    .order('name');

  if (error) {
    console.error('Error fetching locations:', error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log('No locations found');
    return;
  }

  console.log(`Found ${locations.length} locations`);

  for (const location of locations) {
    await processLocation(location);
  }

  console.log('\n✓ All locations processed!');
}

main().catch(console.error);
