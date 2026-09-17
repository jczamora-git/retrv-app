const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const sourceLogo = path.join(__dirname, '..', 'public', 'retrv-app@300x.png');
  const bgBlue = { r: 22, g: 55, b: 199, alpha: 1 }; // Matches Retrv blue

  console.log('1. Generating assets/icon-only.png (1024x1024)...');
  await sharp(sourceLogo)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'icon-only.png'));

  console.log('2. Generating assets/icon-background.png (1024x1024)...');
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: bgBlue
    }
  })
    .png()
    .toFile(path.join(assetsDir, 'icon-background.png'));

  console.log('3. Generating assets/icon-foreground.png (1024x1024)...');
  const foregroundLogoSize = 740;
  const resizedLogo = await sharp(sourceLogo)
    .resize(foregroundLogoSize, foregroundLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: resizedLogo,
        gravity: sharp.gravity.center
      }
    ])
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));

  console.log('4. Generating assets/splash.png (2732x2732)...');
  const splashLogoSize = 720;
  const splashResizedLogo = await sharp(sourceLogo)
    .resize(splashLogoSize, splashLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: bgBlue
    }
  })
    .composite([
      {
        input: splashResizedLogo,
        gravity: sharp.gravity.center
      }
    ])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  console.log('5. Generating public/favicon.png (128x128)...');
  await sharp(sourceLogo)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'favicon.png'));

  console.log('All source assets generated successfully!');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
