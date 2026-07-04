import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const WORK = process.cwd();
const AUDIO_DIR = join(WORK, 'audio');
const FFMPEG = join(WORK, 'node_modules', 'ffmpeg-static', 'ffmpeg');
const MUSIC_OUT = join(AUDIO_DIR, 'bg-music.wav');

if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });
const T = join(AUDIO_DIR, 'stems');
if (!existsSync(T)) mkdirSync(T, { recursive: true });

const DURATION = 110;
const SR = '44100';

function ff(args: string, out: string) {
  execSync(`"${FFMPEG}" ${args} -y "${out}" 2>/dev/null`, { timeout: 30000 });
}

console.log('🎵 Generating tech ad music...\n');

// 1. Bass pulse - simple sine with tremolo
ff(`-f lavfi -i "sine=f=55:d=${DURATION}" -af "volume=0.15,atremolo=f=2:d=0.7,afade=t=in:d=3" -ac 2 -ar ${SR}`,
  join(T, 'bass.wav'));
console.log('  ✓ Bass');

// 2. Pad - brown noise lowpassed
ff(`-f lavfi -i "anoisesrc=d=${DURATION}:c=brown:a=0.05" -af "lowpass=f=400,volume=2,afade=t=in:d=4,afade=t=out:st=105:d=5" -ac 2 -ar ${SR}`,
  join(T, 'pad.wav'));
console.log('  ✓ Pad');

// 3. Pulse rhythm - sine gated at 128bpm
ff(`-f lavfi -i "sine=f=220:d=${DURATION}" -af "volume=0.1,afade=t=in:d=2,aeval='if(lt(mod(t,0.46875),0.05),val(0),0)':channel_layout=stereo" -ac 2 -ar ${SR}`,
  join(T, 'pulse.wav'));
console.log('  ✓ Pulse');

// 4. Shimmer - white noise highpassed
ff(`-f lavfi -i "anoisesrc=d=${DURATION}:c=white:a=0.02" -af "highpass=f=6000,volume=3,afade=t=in:d=5" -ac 2 -ar ${SR}`,
  join(T, 'shimmer.wav'));
console.log('  ✓ Shimmer');

// 5. Riser - rising frequency sweep
ff(`-f lavfi -i "sine=f=100:d=110" -af "volume=0.06,aeval='val(0)*min(1,t/20)*min(1,(110-t)/5)':channel_layout=stereo" -ac 2 -ar ${SR}`,
  join(T, 'riser.wav'));
console.log('  ✓ Riser');

// 6. Melodic sequence - alternating tones
ff(`-f lavfi -i "sine=f=330:d=1.5" -f lavfi -i "sine=f=392:d=1.5" -f lavfi -i "sine=f=440:d=1.5" -f lavfi -i "sine=f=523:d=2" -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1,apad=whole_dur=${DURATION},aloop=loop=999:size=264600,volume=0.08,afade=t=in:d=4" -ac 2 -ar ${SR}`,
  join(T, 'melody.wav'));
console.log('  ✓ Melody');

// 7. Kick thump
ff(`-f lavfi -i "sine=f=60:d=0.08,afade=t=out:d=0.06,apad=whole_dur=${DURATION},aloop=loop=999:size=44100,volume=2.5,afade=t=in:d=1" -ac 2 -ar ${SR}`,
  join(T, 'kick.wav'));
console.log('  ✓ Kick');

// Mix all
console.log('\n  Mixing...');
const stems = ['bass', 'pad', 'pulse', 'shimmer', 'riser', 'melody', 'kick'];
const inputs = stems.map(s => `-i "${join(T, s)}.wav"`).join(' ');
execSync(
  `"${FFMPEG}" ${inputs} -filter_complex "amix=inputs=${stems.length}:duration=first:weights=1.5 0.8 1 0.5 0.6 1 1.2[out]" -map "[out]" -ac 2 -ar ${SR} -y "${MUSIC_OUT}" 2>/dev/null`,
  { timeout: 30000 }
);

const size = execSync(`ls -la "${MUSIC_OUT}"`, { encoding: 'utf-8' }).split(/\s+/)[4];
console.log(`\n✅ Music: ${MUSIC_OUT} (${(parseInt(size) / 1024).toFixed(0)} KB)`);

// Cleanup
execSync(`rm -rf "${T}"`);
console.log('Done.');
