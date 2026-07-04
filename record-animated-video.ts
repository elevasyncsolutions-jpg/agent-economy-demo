import * as puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { join } from 'path';

const WORK = process.cwd();
const HTML_FILE = join(WORK, 'animated-demo.html');
const OUTPUT_VIDEO = join(WORK, 'agent-economy-demo-v2.mp4');
const OUTPUT_WEBM = join(WORK, 'agent-economy-demo-v2.webm');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');

async function main() {
  console.log('🚀 Launching animated demo recorder...\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Load the animated HTML
  await page.goto('file://' + HTML_FILE, { waitUntil: 'networkidle0' });
  console.log('✓ Page loaded, animations starting...');

  // Record using screencast
  console.log('🎥 Recording screencast...');
  const recorder = await page.screencast({ path: OUTPUT_WEBM, ffmpegPath: FFMPEG });

  // Wait for the full animation duration
  const totalDuration = [6, 8, 10, 9, 10, 8, 9, 7, 6, 7].reduce((a, b) => a + b, 0);
  console.log(`  Recording for ${totalDuration}s...`);

  await new Promise(resolve => setTimeout(resolve, (totalDuration + 2) * 1000));

  await recorder.stop();
  await browser.close();

  console.log(`\n✓ WebM recorded: ${OUTPUT_WEBM}`);

  // Convert to MP4 using ffmpeg
  console.log('  Converting to MP4...');

  execSync(
    `"${FFMPEG}" -i "${OUTPUT_WEBM}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart -y "${OUTPUT_VIDEO}"`,
    { stdio: 'inherit', timeout: 60000 }
  );

  const size = execSync(`ls -la "${OUTPUT_VIDEO}"`, { encoding: 'utf-8' }).split(/\s+/)[4];
  console.log(`\n✅ Final video: ${OUTPUT_VIDEO}`);
  console.log(`   Size: ${(parseInt(size) / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Duration: ${Math.round(totalDuration)}s`);
  console.log('\nDone.');
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
