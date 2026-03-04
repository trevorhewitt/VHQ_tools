// Shared utilities for query parsing, TSV parsing, seeded RNG, and simple cipher.

export function parseQuery(search) {
    const params = new URLSearchParams(search || window.location.search);
    const obj = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }
  
  export function buildQuery(obj) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  }
  
  export function sanitiseToken(s) {
    // Allow only URL-safe tokens: letters, digits, underscore, hyphen.
    // Empty is allowed.
    if (s === undefined || s === null) return "";
    const trimmed = String(s).trim();
    if (trimmed === "") return "";
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
    return trimmed;
  }
  
  export function toBool(s, fallback = false) {
    if (s === undefined || s === null || s === "") return fallback;
    const v = String(s).toLowerCase();
    if (v === "1" || v === "true" || v === "yes") return true;
    if (v === "0" || v === "false" || v === "no") return false;
    return fallback;
  }
  
  export function toInt(s, fallback = null) {
    if (s === undefined || s === null || s === "") return fallback;
    const n = Number(s);
    if (!Number.isFinite(n)) return fallback;
    return Math.trunc(n);
  }
  
  export function clampInt(n, min, max, fallback) {
    if (!Number.isFinite(n)) return fallback;
    const x = Math.trunc(n);
    return Math.min(max, Math.max(min, x));
  }
  
  // --- Seeded RNG (Mulberry32) ---
  export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  
  export function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  // --- TSV parsing ---
  export function parseTSV(tsvText) {
    const lines = tsvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length === 0) return [];
    const header = nonEmpty[0].split("\t").map(h => h.trim());
    const rows = [];
    for (let i = 1; i < nonEmpty.length; i++) {
      const parts = nonEmpty[i].split("\t");
      const row = {};
      for (let c = 0; c < header.length; c++) row[header[c]] = (parts[c] ?? "").trim();
      rows.push(row);
    }
    return rows;
  }
  
  // --- Simple cipher (XOR + base64url) ---
  // This is intentionally simple obfuscation, not security.
  const CIPHER_KEY = "vhq_demo_fixed_key_v1";
  
  function xorBytes(dataBytes, keyBytes) {
    const out = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    return out;
  }
  
  function strToUtf8Bytes(s) {
    return new TextEncoder().encode(s);
  }
  
  function bytesToBase64Url(bytes) {
    let bin = "";
    bytes.forEach(b => (bin += String.fromCharCode(b)));
    const b64 = btoa(bin);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  
  function base64UrlToBytes(b64url) {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad !== 0) throw new Error("Invalid base64url");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  
  export function cipherEncode(plain) {
    const data = strToUtf8Bytes(plain);
    const key = strToUtf8Bytes(CIPHER_KEY);
    const xored = xorBytes(data, key);
    return bytesToBase64Url(xored);
  }
  
  export function cipherDecode(b64url) {
    const data = base64UrlToBytes(b64url);
    const key = strToUtf8Bytes(CIPHER_KEY);
    const plainBytes = xorBytes(data, key);
    return new TextDecoder().decode(plainBytes);
  }
  
  // --- Download ---
  export async function downloadTextFile(filename, text, mime = "text/tab-separated-values;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Allow the browser event loop to start the download.
    await new Promise(r => setTimeout(r, 600));
    URL.revokeObjectURL(url);
  }