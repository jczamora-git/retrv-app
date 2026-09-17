const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generatePwaIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const sourceLogo = path.join(publicDir, 'retrv-app@300x.png');

  if (!fs.existsSync(sourceLogo)) {
    console.error('Source logo not found at:', sourceLogo);
    process.exit(1);
  }

  const emblemBgBlue = { r: 22, g: 55, b: 199, alpha: 1 }; // #1637c7

  // 1. Standard Any Icons (192x192 and 512x512)
  const anySizes = [192, 512];
  for (const size of anySizes) {
    const outPath = path.join(publicDir, `pwa-${size}x${size}.png`);
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);

    console.log(`Generated: ${outPath} (${size}x${size})`);
  }

  // 2. Maskable Icons (192x192 and 512x512)
  const MASKABLE_ARTWORK_RATIO = 0.82;
  for (const size of anySizes) {
    const artSize = Math.round(size * MASKABLE_ARTWORK_RATIO);
    const resizedArt = await sharp(sourceLogo)
      .resize(artSize, artSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const outPath = path.join(publicDir, `pwa-maskable-${size}x${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: emblemBgBlue
      }
    })
      .composite([
        {
          input: resizedArt,
          gravity: sharp.gravity.center
        }
      ])
      .png()
      .toFile(outPath);

    console.log(`Generated maskable: ${outPath} (${size}x${size}, artSize: ${artSize}px)`);
  }

  // 3. Apple Touch Icon (180x180)
  const appleSize = 180;
  await sharp(sourceLogo)
    .resize(appleSize, appleSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated: apple-touch-icon.png (180x180)');

  // 4. Favicon (64x64)
  const favSize = 64;
  await sharp(sourceLogo)
    .resize(favSize, favSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated: favicon.png (64x64)');

  console.log('\nAll PWA icons generated successfully!');
}

generatePwaIcons().catch(err => {
  console.error('Failed generating PWA icons:', err);
  process.exit(1);
});
