'use strict';
/* ffmpeg-Aufrufe für die Demo-Aufnahmen: .webm (Playwright recordVideo) -> .mp4 (H.264), ganz
   oder als Zeit-Ausschnitt (Clip 2a/2b aus einer durchgehenden Aufnahme, siehe clip2-Spec).
   execFile statt exec/Shell-String — Pfade/Zeiten sind eigene Werte, aber keine Shell-Interpolation
   nötig oder gewünscht. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function sicherstellenVerzeichnis(datei) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
}

// startSek/endeSek optional — ohne beide: ganze Datei konvertieren.
function nachMp4(webmPfad, mp4Pfad, opts = {}) {
  sicherstellenVerzeichnis(mp4Pfad);
  const args = ['-y'];
  if (opts.startSek != null) args.push('-ss', String(opts.startSek));
  args.push('-i', webmPfad);
  if (opts.endeSek != null) {
    const dauer = opts.endeSek - (opts.startSek || 0);
    args.push('-t', String(dauer));
  }
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', mp4Pfad);
  execFileSync('ffmpeg', args, { stdio: 'pipe' });
}

module.exports = { nachMp4, sicherstellenVerzeichnis };
