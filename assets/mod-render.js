/* Tracker modules (.mod .xm .s3m .it and the rest libopenmpt reads) rendered to WAV, off the page's thread, so Webamp can play
   them like any other file. libopenmpt (BSD) comes from chiptune3 (MIT) on the CDN, with its wasm inlined.
   In: { id, bytes (ArrayBuffer), rate }. Out: { id, wav (ArrayBuffer), title, artist, seconds } or { id, error } */
import libopenmptPromise from 'https://cdn.jsdelivr.net/npm/chiptune3@0.8.9/libopenmpt.worklet.js';

const ready = libopenmptPromise();
const CHUNK = 8192;   // frames per read

function text(lib, mod, key) {   // a metadata string ('title', 'artist'); libopenmpt allocates it, we free it
  const k = lib.stackAlloc(key.length + 1);
  for (let i = 0; i < key.length; i++) lib.HEAPU8[k + i] = key.charCodeAt(i);
  lib.HEAPU8[k + key.length] = 0;
  const p = lib._openmpt_module_get_metadata(mod, k);
  const s = p ? lib.UTF8ToString(p).trim() : '';
  if (p) lib._openmpt_free_string(p);
  return s;
}

function wavOf(pcm, rate) {   // 16-bit stereo PCM behind a 44-byte RIFF header
  const out = new ArrayBuffer(44 + pcm.byteLength), v = new DataView(out);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.byteLength, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.byteLength, true);
  new Int16Array(out, 44).set(pcm);
  return out;
}

self.onmessage = async ({ data: { id, bytes, rate } }) => {
  const lib = await ready;
  const file = new Uint8Array(bytes);
  const fp = lib._malloc(file.length);
  lib.HEAPU8.set(file, fp);
  const mod = lib._openmpt_module_create_from_memory(fp, file.length, 0, 0, 0);
  lib._free(fp);
  if (!mod) return self.postMessage({ id, error: 'not a module libopenmpt can read' });
  lib._openmpt_module_set_repeat_count(mod, 0);   // once through, no endless loop
  const seconds = lib._openmpt_module_get_duration_seconds(mod);
  const pcm = new Int16Array((Math.ceil(seconds * rate) + rate) * 2);
  const L = lib._malloc(CHUNK * 4), R = lib._malloc(CHUNK * 4);
  let at = 0, n;
  while ((n = lib._openmpt_module_read_float_stereo(mod, rate, CHUNK, L, R)) > 0 && at + n * 2 <= pcm.length) {
    const l = lib.HEAPF32.subarray(L / 4, L / 4 + n), r = lib.HEAPF32.subarray(R / 4, R / 4 + n);
    for (let i = 0; i < n; i++) {
      pcm[at++] = Math.max(-1, Math.min(1, l[i])) * 32767;
      pcm[at++] = Math.max(-1, Math.min(1, r[i])) * 32767;
    }
  }
  const title = text(lib, mod, 'title'), artist = text(lib, mod, 'artist');
  lib._free(L); lib._free(R);
  lib._openmpt_module_destroy(mod);
  const wav = wavOf(pcm.subarray(0, at), rate);
  self.postMessage({ id, wav, title, artist, seconds: at / 2 / rate }, [wav]);
};
