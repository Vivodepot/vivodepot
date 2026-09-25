'use strict';
/* Lade-Hilfe (keine Testdatei): der Kern mit BELEGTEM Gerüst-Fach AB_WERK_RECHTSRAUM_DE. Seit dem Gerüst-Schnitt S3 ist
   die Quelle im Gerüst leer und 'DE' nur reserviert, solange das Fach belegt ist. Proben, die die Reservierung
   messen, brauchen darum diesen Kern. Der Text wird in einer Temp-Datei abgelegt, das Repo bleibt unberührt. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KATALOG = '{"living-will":{"zweck":["gesundheitssorge"],"DE":{"katalogVersion":1,"wortlaut":null,"formvorschriften":null,"fristenVorrang":null}}}';

function ladeKernDeBelegt() {
  const REPO = path.join(__dirname, '..');
  const text = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const B = '/* AB_WERK_RECHTSRAUM_KATALOG_QUELLE:BEGIN */', E = '/* AB_WERK_RECHTSRAUM_KATALOG_QUELLE:END */';
  const a = text.indexOf(B), b = text.indexOf(E);
  if (a < 0 || b < a) throw new Error('load-kern-de-belegt: Marker der Katalog-Quelle fehlen');
  const belegt = text.slice(0, a + B.length) + '\nconst AB_WERK_RECHTSRAUM_KATALOG_QUELLE = Object.freeze(' + KATALOG + ');\n' + text.slice(b);
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-de-belegt-'));
  const pfad = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(pfad, belegt);
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = pfad;
  const ladePfad = require.resolve('./load-kern.js');
  delete require.cache[ladePfad];
  try {
    return require(ladePfad).ladeKern({ blank: true }).V;
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[ladePfad];
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}

module.exports = { ladeKernDeBelegt };
