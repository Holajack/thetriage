/**
 * Sprite Sheet Splitter & Frame Interpolator
 *
 * This script:
 * 1. Splits the bear sprite sheet into individual frame PNGs
 * 2. Generates interpolated frames between each original frame for smoother animation
 *
 * Usage: node scripts/split-spritesheet.js
 *
 * Requirements: sharp (npm install sharp)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_SPRITE_SHEET = path.join(__dirname, '../assets/trail-buddies/bear_spritesheet.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/trail-buddies/bear-frames');
const INTERPOLATED_DIR = path.join(__dirname, '../assets/trail-buddies/bear-frames-interpolated');

// Frame data from the JSON bounding boxes
const FRAMES = [
  { x: 296, y: 193, width: 166, height: 151, frameIndex: 0 },
  { x: 462, y: 191, width: 161, height: 153, frameIndex: 1 },
  { x: 619, y: 190, width: 157, height: 154, frameIndex: 2 },
  { x: 776, y: 190, width: 157, height: 154, frameIndex: 3 },
  { x: 305, y: 344, width: 157, height: 154, frameIndex: 4 },
  { x: 462, y: 344, width: 157, height: 153, frameIndex: 5 },
  { x: 619, y: 344, width: 157, height: 152, frameIndex: 6 },
  { x: 776, y: 344, width: 157, height: 151, frameIndex: 7 },
  { x: 305, y: 494, width: 157, height: 150, frameIndex: 8 },
  { x: 462, y: 493, width: 157, height: 149, frameIndex: 9 },
  { x: 619, y: 493, width: 157, height: 149, frameIndex: 10 },
  { x: 776, y: 492, width: 157, height: 148, frameIndex: 11 },
  { x: 305, y: 642, width: 157, height: 149, frameIndex: 12 },
  { x: 462, y: 644, width: 157, height: 150, frameIndex: 13 },
  { x: 619, y: 648, width: 157, height: 152, frameIndex: 14 },
  { x: 776, y: 650, width: 157, height: 153, frameIndex: 15 },
  { x: 305, y: 803, width: 157, height: 153, frameIndex: 16 },
  { x: 462, y: 806, width: 157, height: 154, frameIndex: 17 },
  { x: 619, y: 799, width: 157, height: 152, frameIndex: 18 },
  { x: 781, y: 803, width: 159, height: 153, frameIndex: 19 },
  { x: 304, y: 956, width: 159, height: 153, frameIndex: 20 },
  { x: 463, y: 952, width: 161, height: 152, frameIndex: 21 },
  { x: 624, y: 952, width: 162, height: 152, frameIndex: 22 },
  { x: 788, y: 943, width: 163, height: 150, frameIndex: 23 },
  { x: 298, y: 1088, width: 164, height: 149, frameIndex: 24 },
  { x: 462, y: 1094, width: 165, height: 150, frameIndex: 25 },
  { x: 628, y: 1094, width: 166, height: 150, frameIndex: 26 },
  { x: 794, y: 1094, width: 166, height: 150, frameIndex: 27 },
];

// Standard output size for all frames
const OUTPUT_SIZE = 200;

// Number of interpolated frames to generate between each original frame
const INTERPOLATION_FRAMES = 2;

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Find the maximum dimensions across all frames for consistent scaling
const MAX_FRAME_WIDTH = Math.max(...FRAMES.map(f => f.width));   // 166
const MAX_FRAME_HEIGHT = Math.max(...FRAMES.map(f => f.height)); // 154

async function extractFrame(spriteSheet, frame, outputPath) {
  try {
    // Extract ONLY the bear using exact bounding box (no whitespace)
    const extracted = await sharp(spriteSheet)
      .extract({
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
      })
      .toBuffer();

    // Scale to fit within output size while maintaining aspect ratio
    // Use consistent scale based on largest frame to keep bear same size
    const targetSize = OUTPUT_SIZE - 20; // Leave some padding
    const scale = targetSize / Math.max(MAX_FRAME_WIDTH, MAX_FRAME_HEIGHT);

    const scaledWidth = Math.round(frame.width * scale);
    const scaledHeight = Math.round(frame.height * scale);

    // Calculate position: center horizontally, anchor at BOTTOM (feet stay in place)
    const left = Math.round((OUTPUT_SIZE - scaledWidth) / 2);
    // All frames anchored at same bottom position
    const bottomPadding = 10;
    const top = OUTPUT_SIZE - scaledHeight - bottomPadding;

    // Create output canvas and place bear
    await sharp({
      create: {
        width: OUTPUT_SIZE,
        height: OUTPUT_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp(extracted)
            .resize(scaledWidth, scaledHeight, { fit: 'fill' })
            .toBuffer(),
          left: left,
          top: top,
        },
      ])
      .png()
      .toFile(outputPath);

    return true;
  } catch (error) {
    console.error(`Error extracting frame ${frame.frameIndex}:`, error.message);
    return false;
  }
}

async function blendFrames(frame1Path, frame2Path, outputPath, alpha) {
  try {
    // Load both frames
    const frame1 = await sharp(frame1Path).raw().toBuffer({ resolveWithObject: true });
    const frame2 = await sharp(frame2Path).raw().toBuffer({ resolveWithObject: true });

    const { data: data1, info: info1 } = frame1;
    const { data: data2 } = frame2;

    // Create blended buffer
    const blendedData = Buffer.alloc(data1.length);

    for (let i = 0; i < data1.length; i++) {
      // Linear interpolation: result = frame1 * (1 - alpha) + frame2 * alpha
      blendedData[i] = Math.round(data1[i] * (1 - alpha) + data2[i] * alpha);
    }

    // Save blended frame
    await sharp(blendedData, {
      raw: {
        width: info1.width,
        height: info1.height,
        channels: info1.channels,
      },
    })
      .png()
      .toFile(outputPath);

    return true;
  } catch (error) {
    console.error(`Error blending frames:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🐻 Bear Sprite Sheet Splitter & Interpolator');
  console.log('============================================\n');

  // Check if input file exists
  if (!fs.existsSync(INPUT_SPRITE_SHEET)) {
    console.error(`❌ Input file not found: ${INPUT_SPRITE_SHEET}`);
    console.log('\nMake sure the bear_spritesheet.png is in assets/trail-buddies/');
    process.exit(1);
  }

  // Create output directories
  await ensureDir(OUTPUT_DIR);
  await ensureDir(INTERPOLATED_DIR);

  console.log(`📁 Input: ${INPUT_SPRITE_SHEET}`);
  console.log(`📁 Output (original frames): ${OUTPUT_DIR}`);
  console.log(`📁 Output (interpolated): ${INTERPOLATED_DIR}`);
  console.log(`📐 Output size: ${OUTPUT_SIZE}x${OUTPUT_SIZE}px`);
  console.log(`🔢 Total original frames: ${FRAMES.length}`);
  console.log(`🔄 Interpolation frames between each: ${INTERPOLATION_FRAMES}\n`);

  // Step 1: Extract all original frames
  console.log('Step 1: Extracting original frames...');
  const extractedFrames = [];

  for (const frame of FRAMES) {
    const outputPath = path.join(OUTPUT_DIR, `bear_frame_${String(frame.frameIndex).padStart(2, '0')}.png`);
    const success = await extractFrame(INPUT_SPRITE_SHEET, frame, outputPath);

    if (success) {
      extractedFrames.push({
        index: frame.frameIndex,
        path: outputPath,
      });
      process.stdout.write(`✓ Frame ${frame.frameIndex} `);
    } else {
      process.stdout.write(`✗ Frame ${frame.frameIndex} `);
    }
  }

  console.log(`\n✅ Extracted ${extractedFrames.length} frames\n`);

  // Step 2: Copy all 28 frames in order for horizontal animation
  console.log('Step 2: Preparing all 28 frames for horizontal sprite sheet...');
  let frameCount = 0;

  // Use all 28 frames for complete walking animation cycle (no interpolation needed)
  for (let i = 0; i < extractedFrames.length; i++) {
    const currentFrame = extractedFrames[i];
    const outputPath = path.join(
      INTERPOLATED_DIR,
      `bear_walk_${String(frameCount).padStart(3, '0')}.png`
    );
    fs.copyFileSync(currentFrame.path, outputPath);
    frameCount++;
    process.stdout.write('.');
  }

  console.log(`\n✅ Prepared ${frameCount} frames for horizontal animation\n`);

  // Step 3: Generate a SINGLE ROW horizontal sprite sheet (all 28 frames in one row)
  console.log('Step 3: Creating horizontal walking sprite sheet (single row)...');

  const walkFrameFiles = fs.readdirSync(INTERPOLATED_DIR)
    .filter(f => f.startsWith('bear_walk_') && f.endsWith('.png'))
    .sort();

  // Single row with all 28 frames for horizontal scrolling animation
  const cols = walkFrameFiles.length; // 28 columns
  const rows = 1; // Single row
  const sheetWidth = OUTPUT_SIZE * cols;
  const sheetHeight = OUTPUT_SIZE * rows;

  // Create composite image - all frames in a single horizontal row
  const compositeInputs = [];

  for (let i = 0; i < walkFrameFiles.length; i++) {
    compositeInputs.push({
      input: path.join(INTERPOLATED_DIR, walkFrameFiles[i]),
      left: i * OUTPUT_SIZE, // Each frame next to the previous
      top: 0, // All in one row
    });
  }

  const optimizedSheetPath = path.join(__dirname, '../assets/trail-buddies/bear_walking_optimized.png');

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
    .toFile(optimizedSheetPath);

  console.log(`✅ Created optimized sprite sheet: ${optimizedSheetPath}`);
  console.log(`   Dimensions: ${sheetWidth}x${sheetHeight}px`);
  console.log(`   Layout: ${cols} frames in single horizontal row\n`);

  // Step 4: Generate frame data for React Native
  console.log('Step 4: Generating React Native frame data...');

  const frameData = {
    spriteSheet: 'bear_walking_optimized.png',
    frameWidth: OUTPUT_SIZE,
    frameHeight: OUTPUT_SIZE,
    sheetWidth: sheetWidth,
    sheetHeight: sheetHeight,
    columns: cols,
    rows: rows,
    totalFrames: walkFrameFiles.length,
    frames: walkFrameFiles.map((_, i) => ({
      x: i * OUTPUT_SIZE, // Horizontal position
      y: 0, // All in single row
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      frameIndex: i,
    })),
  };

  const frameDataPath = path.join(__dirname, '../assets/trail-buddies/bear_walking_frames.json');
  fs.writeFileSync(frameDataPath, JSON.stringify(frameData, null, 2));

  console.log(`✅ Frame data saved to: ${frameDataPath}\n`);

  // Summary
  console.log('============================================');
  console.log('🎉 Done! Summary:');
  console.log(`   - Original frames extracted: ${extractedFrames.length}`);
  console.log(`   - Frames in horizontal strip: ${frameCount}`);
  console.log(`   - Sprite sheet: ${sheetWidth}x${sheetHeight}px (single row)`);
  console.log(`   - Frame data: bear_walking_frames.json`);
  console.log('\nTo use in your app, update TrailBuddySelectionScreen.tsx to use:');
  console.log("   require('../../../assets/trail-buddies/bear_walking_optimized.png')");
  console.log('   Animation will cycle horizontally through all 28 frames');
}

main().catch(console.error);
