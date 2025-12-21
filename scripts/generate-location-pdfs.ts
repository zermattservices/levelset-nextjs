/**
 * Script to generate QR codes and PDFs for all locations
 * 
 * This script:
 * 1. Fetches all locations from the database
 * 2. For each location:
 *    - Generates a QR code as PNG (Levelset green)
 *    - Uploads the QR to location_assets/pwa/qr_img/{location_id}.png
 *    - Generates a PDF with Levelset branding
 *    - Uploads the PDF to location_assets/pwa/info_pdf/{location_id}.pdf
 * 
 * Run with: npx ts-node scripts/generate-location-pdfs.ts
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

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

async function generateQRCode(url: string): Promise<Buffer> {
  const options: QRCode.QRCodeToBufferOptions = {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: LEVELSET_GREEN,
      light: '#ffffff00', // Transparent background
    },
    errorCorrectionLevel: 'H',
  };

  return QRCode.toBuffer(url, options);
}

async function generatePDF(
  locationName: string,
  qrCodeBuffer: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Get page dimensions
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    // Add Levelset logo at the top
    const logoPath = path.join(__dirname, '../public/logos/Levelset no margin.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, centerX - 75, 60, { width: 150 });
    } else {
      // Fallback to text if logo not found
      doc.fontSize(32)
        .fillColor(LEVELSET_GREEN)
        .font('Helvetica-Bold')
        .text('Levelset', 0, 80, { align: 'center' });
    }

    // Title
    doc.moveDown(4);
    doc.fontSize(24)
      .fillColor('#0d1b14')
      .font('Helvetica-Bold')
      .text('Mobile App Access', { align: 'center' });

    // Location name
    doc.moveDown(0.5);
    doc.fontSize(18)
      .fillColor('#666666')
      .font('Helvetica')
      .text(locationName, { align: 'center' });

    // Add QR code centered
    const qrSize = 250;
    const qrY = 260;
    doc.image(qrCodeBuffer, centerX - qrSize / 2, qrY, { width: qrSize });

    // Instructions
    const instructionsY = qrY + qrSize + 40;
    doc.fontSize(14)
      .fillColor(LEVELSET_GREEN)
      .font('Helvetica-Bold')
      .text('Scan to access the Levelset mobile app', 0, instructionsY, { align: 'center' });

    doc.moveDown(1.5);
    doc.fontSize(12)
      .fillColor('#666666')
      .font('Helvetica')
      .text('Use this QR code to give leaders quick access to:', { align: 'center' });

    doc.moveDown(0.8);
    doc.fontSize(11)
      .fillColor('#0d1b14')
      .text('• Submit positional ratings', { align: 'center' });
    doc.text('• Document discipline infractions', { align: 'center' });
    doc.text('• Complete other mobile forms', { align: 'center' });

    doc.moveDown(1.5);
    doc.fontSize(11)
      .fillColor('#666666')
      .font('Helvetica-Oblique')
      .text('Tip: Add the app to your home screen for quick access!', { align: 'center' });

    // Footer
    doc.fontSize(9)
      .fillColor('#999999')
      .font('Helvetica')
      .text('Powered by Levelset', 0, pageHeight - 60, { align: 'center' });

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
    // Generate QR code
    console.log('  Generating QR code...');
    const qrBuffer = await generateQRCode(pwaUrl);

    // Upload QR code
    const qrPath = `${QR_FOLDER}/${location.id}.png`;
    console.log(`  Uploading QR to ${qrPath}...`);
    const qrUrl = await uploadToStorage(BUCKET_NAME, qrPath, qrBuffer, 'image/png');
    if (qrUrl) {
      console.log(`  QR uploaded: ${qrUrl}`);
    }

    // Generate PDF
    console.log('  Generating PDF...');
    const pdfBuffer = await generatePDF(location.name, qrBuffer);

    // Upload PDF
    const pdfPath = `${PDF_FOLDER}/${location.id}.pdf`;
    console.log(`  Uploading PDF to ${pdfPath}...`);
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
