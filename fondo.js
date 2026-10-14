// Fondo de caracteres que aparecen en "manchas" que se mueven lentamente.
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+=-';
const CW = 7.2, CH = 12.5;          // tamaño de cada celda
const FPS = 30;
const SPEED = 0.0006;              // velocidad de movimiento de las manchas

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let cols, rows, grid, dpr;

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = 'bold 10px Consolas, "Courier New", monospace';
  ctx.textBaseline = 'top';
  cols = Math.ceil(innerWidth / CW);
  rows = Math.ceil(innerHeight / CH);
  grid = Array.from({ length: cols * rows }, rndChar);
}
const rndChar = () => CHARS[(Math.random() * CHARS.length) | 0];

// Ruido de valor 3D sencillo
const P = new Uint8Array(512);
(() => { const p = [...Array(256).keys()].sort(() => Math.random() - 0.5); for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
const fade = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const h = (x, y, z) => P[P[P[x & 255] + (y & 255)] + (z & 255)] / 255;
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const a = lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), xf), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf);
  const b = lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf);
  return lerp(a, b, zf);
}

const PX_PER_SEC = 30;              // velocidad de las letras hacia la derecha

// Letra fija para cada celda del mundo, que cambia cada ~2 s en momentos distintos
function charAt(wx, y, now) {
  const seed = h(wx, y, 7) * 10;
  const epoch = Math.floor(now / 2000 + seed);
  return CHARS[(h(wx, y, epoch) * 255 + h(y, epoch, wx) * 255 | 0) % CHARS.length];
}

// Dirección horizontal al azar en cada pestaña: 1 = hacia la derecha, -1 = hacia la izquierda
const DIR_X = Math.random() < 0.5 ? 1 : -1;

const RADIO = 90;                   // tamaño (px) de la zona que aparta el ratón
const mouse = { x: -9999, y: -9999, fuerza: 0, ultimo: -9999 };
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.ultimo = performance.now(); });
document.addEventListener('mouseleave', () => { mouse.ultimo = -9999; });

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (now - last < 1000 / FPS) return;
  last = now;
  const t = now * SPEED;
  // Las letras quedan fijas; el "humo" se desplaza en diagonal hacia abajo
  const d = now / 1000 * PX_PER_SEC;
  const sx = DIR_X * d / CW, sy = d / CH;
  const tw = now * 0.00008;                 // remolino lento del humo
  // El efecto del ratón aparece al moverlo y se desvanece poco a poco al pararlo
  mouse.fuerza += ((now - mouse.ultimo < 300 ? 1 : 0) - mouse.fuerza) * 0.08;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let wx = x - sx, wy = y - sy;         // posición dentro del humo
      // El ratón aparta el humo: cerca del cursor se muestra el humo desplazado hacia fuera
      const mdx = x * CW - mouse.x, mdy = y * CH - mouse.y;
      const md = Math.hypot(mdx, mdy);
      const push = Math.exp(-(md * md) / (RADIO * RADIO)) * mouse.fuerza;
      if (push > 0.01) {
        wx -= mdx / CW * push * 0.8;
        wy -= mdy / CH * push * 0.8;
      }
      // Deformación del espacio para que los bordes sean ondulados, como humo
      const qx = noise(wx * 0.04, wy * 0.06, tw) - 0.5;
      const qy = noise(wx * 0.04 + 50, wy * 0.06 + 50, tw) - 0.5;
      const fx = wx + qx * 40, fy = wy + qy * 24;
      const n = noise(fx * 0.06, fy * 0.1, 0.5) * 0.65
              + noise(fx * 0.14, fy * 0.22, 1.5) * 0.25
              + noise(fx * 0.35, fy * 0.5, 2.5) * 0.10;
      const v = (n - 0.5) / 0.28 + push * 0.9;  // borde suave; junto al cursor se despeja
      if (v <= 0) continue;
      // Brillo: destellos irregulares que aparecen, se desplazan y se apagan al azar
      const g = noise(x * 0.07 + 300, y * 0.11 + 300, now * 0.0005)
              * noise(x * 0.03 - now * 0.00007 + 900, y * 0.05 + 900, now * 0.0002);
      const glow = Math.min(Math.max((g - 0.33) / 0.25, 0), 1) ** 2;
      const a = Math.min(v, 1) * (0.22 + glow * 0.25);
      const c = 190 + glow * 30 | 0;
      ctx.fillStyle = `rgba(${c},${c},${c - 10},${a})`;
      ctx.fillText(charAt(x, y, now), x * CW, y * CH);
    }
  }
}

addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
