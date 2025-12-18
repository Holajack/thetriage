/**
 * Nora Frame Extractor
 *
 * Extracts all 28 walking frames from the Nora animation sprite sheet.
 * Uses grid-based extraction with auto-trim to find Nora in each cell.
 *
 * Layout: 4 columns x 7 rows = 28 frames
 * Output: 200x200 frames, centered horizontally, anchored at bottom
 *
 * Usage: node scripts/extract-nora-frames.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = path.join(__dirname, '../assets/examples/nora_animation.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/trail-buddies/nora-frames');
const SPRITE_SHEET_OUTPUT = path.join(__dirname, '../assets/trail-buddies/nora_walking_optimized.png');
const FRAME_DATA_OUTPUT = path.join(__dirname, '../assets/trail-buddies/nora_walking_frames.json');

// Grid: 4 columns x 7 rows = 28 frames
const GRID_COLS = 4;
const GRID_ROWS = 7;
const TOTAL_FRAMES = GRID_COLS * GRID_ROWS;
const OUTPUT_SIZE = 200;

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

async function main() {
  console.log('Nora Frame Extractor');
  console.log('====================\n');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  await ensureDir(OUTPUT_DIR);

  const metadata = await sharp(INPUT_FILE).metadata();
  console.log(`Source: ${metadata.width}x${metadata.height}`);

  const cellWidth = Math.floor(metadata.width / GRID_COLS);
  const cellHeight = Math.floor(metadata.height / GRID_ROWS);
  console.log(`Cell size: ${cellWidth}x${cellHeight}`);
  console.log(`Extracting ${TOTAL_FRAMES} frames...\n`);

  const extractedPaths = [];
  let frameIndex = 0;

  // Extract in row-major order (left-to-right, top-to-bottom)
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;

      // Extract cell, then trim whitespace to find Nora
      const cellBuffer = await sharp(INPUT_FILE)
        .extract({ left: x, top: y, width: cellWidth, height: cellHeight })
        .toBuffer();

      const trimmed = await sharp(cellBuffer)
        .trim({ threshold: 10 })
        .toBuffer({ resolveWithObject: true });

      const { info } = trimmed;

      // Scale to fit with padding
      const padding = 20;
      const availableSize = OUTPUT_SIZE - padding;
      const scale = Math.min(availableSize / info.width, availableSize / info.height);
      const scaledWidth = Math.round(info.width * scale);
      const scaledHeight = Math.round(info.height * scale);

      const scaledNora = await sharp(trimmed.data)
        .resize(scaledWidth, scaledHeight)
        .toBuffer();

      // Center horizontally, anchor at bottom
      const left = Math.round((OUTPUT_SIZE - scaledWidth) / 2);
      const bottomPadding = 10;
      const top = OUTPUT_SIZE - scaledHeight - bottomPadding;

      const outputPath = path.join(OUTPUT_DIR, `nora_frame_${String(frameIndex).padStart(2, '0')}.png`);
      await sharp({
        create: {
          width: OUTPUT_SIZE,
          height: OUTPUT_SIZE,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: scaledNora, left, top }])
        .png()
        .toFile(outputPath);

      extractedPaths.push(outputPath);
      process.stdout.write(`\rFrame ${frameIndex + 1}/${TOTAL_FRAMES}`);
      frameIndex++;
    }
  }

  console.log('\n\nCreating sprite sheet...');

  const sheetWidth = OUTPUT_SIZE * TOTAL_FRAMES;
  const sheetHeight = OUTPUT_SIZE;

  const compositeInputs = extractedPaths.map((filePath, i) => ({
    input: filePath,
    left: i * OUTPUT_SIZE,
    top: 0,
  }));

  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toFile(SPRITE_SHEET_OUTPUT);

  console.log(`Sprite sheet: ${sheetWidth}x${sheetHeight}px`);

  // Generate JSON
  const frameData = {
    spriteSheet: 'nora_walking_optimized.png',
    frameWidth: OUTPUT_SIZE,
    frameHeight: OUTPUT_SIZE,
    sheetWidth,
    sheetHeight,
    columns: TOTAL_FRAMES,
    rows: 1,
    totalFrames: TOTAL_FRAMES,
    frames: extractedPaths.map((_, i) => ({
      x: i * OUTPUT_SIZE,
      y: 0,
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      frameIndex: i,
    })),
  };

  fs.writeFileSync(FRAME_DATA_OUTPUT, JSON.stringify(frameData, null, 2));
  console.log(`Frame data: ${FRAME_DATA_OUTPUT}`);

  // Verify
  let validCount = 0;
  for (const filePath of extractedPaths) {
    const stats = fs.statSync(filePath);
    if (stats.size > 10000) validCount++;
  }

  console.log(`\nValid frames: ${validCount}/${TOTAL_FRAMES}`);
  console.log('Done!');
}

main().catch(console.error);
