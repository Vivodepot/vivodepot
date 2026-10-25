'use strict';
/* Mitschnitt der Puffer eines Aufrufs — für Proben „nach X liegt kein Schlüsselmaterial ungenullt im Speicher"
   (Befund JWE-KDF-ZWISCHENPUFFER und seine Klasse).

   `mitgeschnitten(lauf, ruf)` ersetzt im Realm des Laufs für die Dauer EINES Aufrufs den Uint8Array-Konstruktor durch
   eine Hülle und hört `%TypedArray%.prototype.set` mit. Gesammelt wird jeder Puffer, der dabei entsteht oder beschrieben
   wird; auch `Uint8Array.from` und `slice` gehen über den Konstruktor. Nicht gesehen werden ArrayBuffer, die eine
   Web-Crypto-Funktion selbst zurückgibt (deriveBits, digest) — wer die prüfen will, hängt sich an die Funktion.
   `lauf` = { global, U8 }: der Kern läuft im node-Realm (tests/load-kern.js), Lese-App und Studio je in einem vm-Kontext.

   `funde(gesehen, nadeln, eigene)` sucht in jedem gesammelten ArrayBuffer nach jeder Nadel als Teilfolge und meldet sie;
   `eigene` sind die Puffer, die der Aufrufer selbst hält (Eingabe, Rückgabe) und die darum stehen bleiben dürfen. */

async function mitgeschnitten(lauf, ruf) {
  const { global, U8 } = lauf;
  const gesehen = [];
  const huelle = new Proxy(U8, {
    construct(ziel, args, neu) {
      const a = Reflect.construct(ziel, args, neu === huelle ? ziel : neu);
      gesehen.push(a);
      return a;
    },
  });
  const ta = Object.getPrototypeOf(U8.prototype);
  const setVorher = ta.set;
  const hatteEigenen = Object.prototype.hasOwnProperty.call(global, 'Uint8Array');
  const vorher = hatteEigenen ? Object.getOwnPropertyDescriptor(global, 'Uint8Array') : null;
  global.Uint8Array = huelle;
  ta.set = function (...args) { gesehen.push(this); return setVorher.apply(this, args); };
  let ergebnis, fehler = null;
  try {
    ergebnis = await ruf();
  } catch (e) {
    fehler = e;
  } finally {
    ta.set = setVorher;
    if (vorher) Object.defineProperty(global, 'Uint8Array', vorher); else delete global.Uint8Array;
  }
  return { ergebnis, fehler, gesehen };
}

function stelle(heu, nadel) {
  if (!nadel.length) return -1;
  aussen: for (let i = 0; i + nadel.length <= heu.length; i++) {
    for (let j = 0; j < nadel.length; j++) if (heu[i + j] !== nadel[j]) continue aussen;
    return i;
  }
  return -1;
}

// nadeln: { name: Array|Uint8Array }; liefert je Fund eine Zeile „<name> liegt ungenullt in einem Puffer von n Byte (ab Byte i)".
function funde(gesehen, nadeln, eigene = []) {
  const aus = new Set(eigene.map((a) => (a && a.buffer) || a));
  const puffer = new Set();
  for (const a of gesehen) if (a && a.buffer && !aus.has(a.buffer)) puffer.add(a.buffer);
  const raus = [];
  for (const b of puffer) {
    if (!b.byteLength) continue;
    const bytes = new Uint8Array(b);
    for (const [name, nadel] of Object.entries(nadeln)) {
      const bei = stelle(bytes, nadel);
      if (bei >= 0) raus.push(name + ' liegt ungenullt in einem Puffer von ' + bytes.length + ' Byte (ab Byte ' + bei + ')');
    }
  }
  return raus;
}

// Ein Muster, das zufällig nirgends sonst steht: n feste, voneinander verschiedene Bytes ab `start`.
const muster = (n, start = 29) => Array.from({ length: n }, (_, i) => (i * 73 + start) & 0xff);

module.exports = { mitgeschnitten, stelle, funde, muster };
