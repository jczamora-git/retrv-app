const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const rootDir = path.join(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const assetsDir = path.join(rootDir, 'assets');
  const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

  const sourceIcon = path.join(publicDir, 'retrv-app@300x.png');

  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found at:', sourceIcon);
    process.exit(1);
  }

  // Matching blue background color for maskable icons and adaptive backgrounds
  const retrvBlue = { r: 22, g: 55, b: 199, alpha: 1 }; // #1637c7

  console.log('--- 1. Generating PWA Icons in public/ ---');

  // Any icons: 192x192 and 512x512
  // Direct resize preserving transparent outer squircle corners without extra padding or frames
  const anySizes = [192, 512];
  for (const size of anySizes) {
    const outPath = path.join(publicDir, `pwa-${size}x${size}.png`);
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`Generated: public/pwa-${size}x${size}.png`);
  }

  // Maskable icons: 192x192 and 512x512
  // Safe zone is 80% circle, safe margin ~10% around icon on matching blue background
  const MASKABLE_RATIO = 0.82;
  for (const size of anySizes) {
    const artSize = Math.round(size * MASKABLE_RATIO);
    const resized = await sharp(sourceIcon)
      .resize(artSize, artSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const outPath = path.join(publicDir, `pwa-maskable-${size}x${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: retrvBlue
      }
    })
      .composite([
        {
          input: resized,
          gravity: sharp.gravity.center
        }
      ])
      .png()
      .toFile(outPath);
    console.log(`Generated: public/pwa-maskable-${size}x${size}.png`);
  }

  // Apple Touch Icon: 180x180
  const appleSize = 180;
  await sharp(sourceIcon)
    .resize(appleSize, appleSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated: public/apple-touch-icon.png (180x180)');

  // Favicon: 64x64 & 128x128
  await sharp(sourceIcon)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated: public/favicon.png (64x64)');

  console.log('\n--- 2. Generating Assets in assets/ ---');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // icon-only.png (1024x1024)
  await sharp(sourceIcon)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'icon-only.png'));
  console.log('Generated: assets/icon-only.png (1024x1024)');

  // icon-background.png (1024x1024)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: retrvBlue
    }
  })
    .png()
    .toFile(path.join(assetsDir, 'icon-background.png'));
  console.log('Generated: assets/icon-background.png (1024x1024)');

  // icon-foreground.png (1024x1024) - scaled to safe adaptive zone ~720px
  const fgSize = 740;
  const fgResized = await sharp(sourceIcon)
    .resize(fgSize, fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
        input: fgResized,
        gravity: sharp.gravity.center
      }
    ])
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));
  console.log('Generated: assets/icon-foreground.png (1024x1024)');

  // splash.png (2732x2732)
  const splashArtSize = 720;
  const splashResized = await sharp(sourceIcon)
    .resize(splashArtSize, splashArtSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: retrvBlue
    }
  })
    .composite([
      {
        input: splashResized,
        gravity: sharp.gravity.center
      }
    ])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('Generated: assets/splash.png (2732x2732)');

  console.log('\n--- 3. Generating Android Native Icons in android/app/src/main/res/ ---');
  const androidDensities = [
    { name: 'mipmap-mdpi', launcherSize: 48, adaptiveSize: 108 },
    { name: 'mipmap-hdpi', launcherSize: 72, adaptiveSize: 162 },
    { name: 'mipmap-xhdpi', launcherSize: 96, adaptiveSize: 216 },
    { name: 'mipmap-xxhdpi', launcherSize: 144, adaptiveSize: 324 },
    { name: 'mipmap-xxxhdpi', launcherSize: 192, adaptiveSize: 432 }
  ];

  for (const density of androidDensities) {
    const dir = path.join(resDir, density.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. ic_launcher.png (Legacy launcher icon)
    await sharp(sourceIcon)
      .resize(density.launcherSize, density.launcherSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png
    await sharp(sourceIcon)
      .resize(density.launcherSize, density.launcherSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // 3. ic_launcher_background.png
    await sharp({
      create: {
        width: density.adaptiveSize,
        height: density.adaptiveSize,
        channels: 4,
        background: retrvBlue
      }
    })
      .png()
      .toFile(path.join(dir, 'ic_launcher_background.png'));

    // 4. ic_launcher_foreground.png (safe ratio ~0.72 of adaptive canvas)
    const fgArtSize = Math.round(density.adaptiveSize * 0.72);
    const fgResizedDensity = await sharp(sourceIcon)
      .resize(fgArtSize, fgArtSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: density.adaptiveSize,
        height: density.adaptiveSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: fgResizedDensity,
          gravity: sharp.gravity.center
        }
      ])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`Generated native icons for ${density.name} (${density.launcherSize}px / adaptive ${density.adaptiveSize}px)`);
  }

  console.log('\nAll PWA and Android native icon assets generated successfully!');
}

main().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
