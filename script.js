"use strict";

/* ============================================================
   Flo's Kosmos – animiertes Teammodell
   Canvas + Vanilla JS. Keine Abhängigkeiten.
   ============================================================ */

const canvas = document.getElementById("cosmos");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("tooltip");

/* --- Zustand für Größe / Zentrum --- */
let W = 0;
let H = 0;
let CX = 0;
let CY = 0;
let scale = 1; // skaliert Bahnen relativ zur Fenstergröße
let dpr = Math.min(window.devicePixelRatio || 1, 2);

/* --- Mausposition (für Hit-Test / Tooltip) --- */
const mouse = { x: -9999, y: -9999, active: false };

/* ============================================================
   Sternenfeld + Milchstraßen-Band (Hintergrund)
   ============================================================ */
let stars = [];
let bandStars = []; // dichtere Sterne entlang des Milchstraßen-Bandes
let ringStars = []; // Sternpartikel auf dem Außenring (Milchstraße)
let discStars = []; // Sternpartikel im Scheiben-Nebel (C)

function buildStars() {
  stars = [];
  bandStars = [];
  ringStars = [];
  const area = W * H;
  const count = Math.round(area / 1600); // Dichte abhängig von Fläche
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.3 + 0.2,
      base: Math.random() * 0.5 + 0.3,
      tw: Math.random() * Math.PI * 2, // Twinkle-Phase
      tws: Math.random() * 0.8 + 0.2, // Twinkle-Speed
    });
  }
  // Milchstraßen-Band: diffuse Sterne entlang einer diagonalen Achse
  const bandCount = Math.round(area / 4000);
  for (let i = 0; i < bandCount; i++) {
    const t = Math.random();
    const spread = (Math.random() - 0.5) * H * 0.5;
    bandStars.push({
      t,
      spread,
      r: Math.random() * 1.6 + 0.3,
      base: Math.random() * 0.4 + 0.2,
      tw: Math.random() * Math.PI * 2,
      tws: Math.random() * 0.6 + 0.15,
    });
  }
  // Sternpartikel im Scheiben-Nebel
  discStars = [];
  for (let i = 0; i < 220; i++) {
    const r = Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    discStars.push({
      r, a,
      size: Math.random() * 1.6 + 0.3,
      base: Math.random() * 0.6 + 0.3,
      tw: Math.random() * Math.PI * 2,
      tws: Math.random() * 1.2 + 0.3,
    });
  }

  // Sterne entlang des Außenrings
  ringStars = [];
  for (let i = 0; i < 300; i++) {
    ringStars.push({
      t:      Math.random(),                   // Winkel-Position 0–1
      spread: (Math.random() - 0.5) * 2,       // radiale Streuung (±1)
      r:      Math.random() * 1.4 + 0.25,
      base:   Math.random() * 0.5 + 0.18,
      tw:     Math.random() * Math.PI * 2,
      tws:    Math.random() * 0.7 + 0.18,
    });
  }

  // Galaxie-Sterne (verteilt über Disk + Ring-Zone)
  // (ringStars is now ring-only; discStars handles the disc)
}

function drawBackground(time) {
  // diffuses Milchstraßen-Band als rotierendes Leuchtband
  const bandAngle = -0.5 + Math.sin(time * 0.00002) * 0.04; // sehr langsame Drift
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(bandAngle);

  const grad = ctx.createLinearGradient(0, -H * 0.35, 0, H * 0.35);
  grad.addColorStop(0, "rgba(40, 30, 80, 0)");
  grad.addColorStop(0.5, "rgba(80, 70, 150, 0.10)");
  grad.addColorStop(1, "rgba(40, 30, 80, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-W, -H * 0.35, W * 2, H * 0.7);
  ctx.restore();

  // Band-Sterne (entlang derselben Achse)
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(bandAngle);
  for (const s of bandStars) {
    const x = (s.t - 0.5) * W * 1.6;
    const y = s.spread * 0.35;
    const a = s.base + Math.sin(time * 0.001 * s.tws + s.tw) * 0.2;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = "#cdd6ff";
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Allgemeines Sternenfeld mit Twinkle
  for (const s of stars) {
    const a = s.base + Math.sin(time * 0.001 * s.tws + s.tw) * 0.35;
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ============================================================
   Objekt-Definitionen (Platzhalter-Labels später ersetzbar)
   ============================================================ */
const objects = {
  A: {
    label: "Planet A",
    desc: "Stabiles Zentrum des Teams – der ruhende Pol.",
    color: "#ffd27f",
    glow: "#ff9d3c",
    radius: 30,
    x: 0,
    y: 0,
  },
  B: {
    label: "Mond B",
    desc: "Kreist treu um das Zentrum – kontinuierlicher Begleiter.",
    color: "#bcd2ff",
    glow: "#7fb4ff",
    radius: 12,
    x: 0,
    y: 0,
  },
  C: {
    label: "Scheibe C",
    desc: "Rotierende Plattform – verbunden mit dem Zentrum.",
    color: "#c89bff",
    glow: "#9d6bff",
    radius: 0, // ellipse, separat behandelt
    x: 0,
    y: 0,
  },
  D: {
    label: "Kugel D",
    desc: "Pendelt um die Scheibe – beweglich und vermittelnd.",
    color: "#8effd6",
    glow: "#34e0a8",
    radius: 10,
    x: 0,
    y: 0,
  },
  E: {
    label: "Kugel E",
    desc: "Pendelt um die Scheibe – beweglich und vermittelnd.",
    color: "#ff9fc5",
    glow: "#ff5d97",
    radius: 10,
    x: 0,
    y: 0,
  },
};

/* ============================================================
   Hover-Pause für bewegliche Objekte (B, D, E)
   ============================================================ */
const paused = {
  B: { active: false, angle: 0 },
  D: { active: false, angle: 0 },
  E: { active: false, angle: 0 },
};

// Letzte bekannte Zeit pro Objekt (für Offset-Berechnung)
const lastTime = { B: 0, D: 0, E: 0 };
const angleOffset = { B: 0, D: 0, E: 0 };

/* Gibt den aktuellen Winkel zurück, hält ihn an wenn gehövert */
function getAngle(key, time, speed) {
  if (paused[key].active) {
    // einfrieren: Offset so setzen, dass Winkel konstant bleibt
    angleOffset[key] = paused[key].angle - time * speed;
    return paused[key].angle;
  }
  const angle = time * speed + angleOffset[key];
  paused[key].angle = angle; // aktuellen Winkel merken
  return angle;
}

function drawGlowOrb(x, y, r, color, glow, glowScale = 3) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * glowScale);
  g.addColorStop(0, glow);
  g.addColorStop(0.4, hexToRgba(glow, 0.35));
  g.addColorStop(1, hexToRgba(glow, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * glowScale, 0, Math.PI * 2);
  ctx.fill();

  // Kern
  const core = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.3,
    r * 0.1,
    x,
    y,
    r
  );
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.5, color);
  core.addColorStop(1, glow);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* ============================================================
   Animations-Loop
   ============================================================ */
function animate(time) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(time);

  /* --- Bahn-Parameter (skaliert) --- */
  const orbitB = 70 * scale; // Radius Mond B um A
  const distC = 230 * scale; // Abstand Scheibe C von A (fix unterhalb)
  const pendRX = 125 * scale * 1.3;          // Umlaufradius D & E horizontal
  const pendRY = pendRX * (14 / 72);           // gleiche Abflachung wie die Scheibe
  // Außenring: vertikal gestreckt (elliptisch sichtbar), horizontal enger
  const ringRY = (distC + pendRX) * 1.22;  // Höhe: alles umschließen
  const ringRX = ringRY * 0.62;                 // Breite: deutlich schmäler
  // 90° Drehung: rx und ry beim Aufruf tauschen
  const ringRXr = ringRY;  // rotiert: horizontal = ehemals vertikal
  const ringRYr = ringRX;  // rotiert: vertikal   = ehemals horizontal

  /* --- Szene 30% nach oben verschoben --- */
  const sceneCY = CY - H * 0.20;

  /* --- Position A (fix im Zentrum) --- */
  objects.A.x = CX;
  objects.A.y = sceneCY;

  /* --- Position C (fix lokal unterhalb von A, bewegt sich nicht) --- */
  objects.C.x = CX;
  objects.C.y = sceneCY + distC;

  /* ===== Galaxie-Ring (3D Milchstraße, langsam rotierend) ===== */
  drawOuterRing(CX, sceneCY + H * 0.20, ringRXr, ringRYr, time);

  /* ===== Verbindungslinie A -> C (Doppellinie) ===== */
  {
    const gap = 3.5; // Abstand zwischen den Linien
    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.strokeStyle = "rgba(157, 107, 255, 0.40)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -time * 0.02;
      // Senkrechte Verschiebung: Linie läuft vertikal, versetzt links/rechts
      ctx.beginPath();
      ctx.moveTo(objects.A.x + side * gap, objects.A.y);
      ctx.lineTo(objects.C.x + side * gap, objects.C.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ===== Verbindungslinie C (Unterkante) -> Außenring (unten) – Doppellinie ===== */
  const cDiscRY = 14 * scale * 1.69;
  const connStartY = objects.C.y + cDiscRY;
  // Außenring unten: CY + ringRYr (nach 90° Drehung ist die neue ry = ringRYr)
  const connEndY = sceneCY + H * 0.20 + ringRYr;
  {
    const gap = 3.5;
    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.strokeStyle = "rgba(190, 150, 255, 0.50)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = -time * 0.018;
      ctx.beginPath();
      ctx.moveTo(CX + side * gap, connStartY);
      ctx.lineTo(CX + side * gap, connEndY);
      ctx.stroke();
      ctx.restore();
    }
    // Punkt am Ringkontakt
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#c89bff";
    ctx.beginPath();
    ctx.arc(CX, connEndY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ===== Scheibe C (rotierende ovale Scheibe) ===== */
  const cSpin = time * 0.0006;
  drawDisc(objects.C.x, objects.C.y, 72 * scale * 1.69, 14 * scale * 1.69, cSpin);

  /* ===== Mond B (Kreisbahn um A) ===== */
  const bAngle = getAngle('B', time, 0.0009);
  objects.B.x = objects.A.x + Math.cos(bAngle) * orbitB;
  objects.B.y = objects.A.y + Math.sin(bAngle) * orbitB;
  // Bahn andeuten
  drawOrbitCircle(objects.A.x, objects.A.y, orbitB, "rgba(127,180,255,0.12)");

  /* ===== Kugeln D & E: vollständige Umlaufbahn um C ===== */
  const pendSpeed = 0.0010;

  const dAngle = getAngle('D', time, pendSpeed);
  objects.D.x = objects.C.x + Math.cos(dAngle) * pendRX;
  objects.D.y = objects.C.y + Math.sin(dAngle) * pendRY;

  const eAngle = getAngle('E', time, -pendSpeed * 0.75) + Math.PI;
  objects.E.x = objects.C.x + Math.cos(eAngle) * pendRX;
  objects.E.y = objects.C.y + Math.sin(eAngle) * pendRY;

  // Pendelbahnen andeuten
  drawOrbitEllipse(
    objects.C.x,
    objects.C.y,
    pendRX,
    pendRY,
    "rgba(52,224,168,0.10)"
  );

  /* ===== Verbindungslinien A -> D und A -> E ===== */
  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 7]);
  ctx.lineDashOffset = -time * 0.018;

  ctx.strokeStyle = `rgba(142,255,214,0.30)`;
  ctx.beginPath();
  ctx.moveTo(objects.A.x, objects.A.y);
  ctx.lineTo(objects.D.x, objects.D.y);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255,159,197,0.30)`;
  ctx.beginPath();
  ctx.moveTo(objects.A.x, objects.A.y);
  ctx.lineTo(objects.E.x, objects.E.y);
  ctx.stroke();

  ctx.restore();

  /* ===== Objekte zeichnen ===== */
  drawGlowOrb(objects.D.x, objects.D.y, objects.D.radius, objects.D.color, objects.D.glow);
  drawGlowOrb(objects.E.x, objects.E.y, objects.E.radius, objects.E.color, objects.E.glow);
  drawGlowOrb(objects.B.x, objects.B.y, objects.B.radius, objects.B.color, objects.B.glow);
  drawGlowOrb(objects.A.x, objects.A.y, objects.A.radius, objects.A.color, objects.A.glow, 4);

  /* ===== Hover / Tooltip ===== */
  updateTooltip();

  requestAnimationFrame(animate);
}

/* ============================================================
   Zeichen-Helfer für Bahnen, Scheibe, Außenring
   ============================================================ */
function drawOrbitCircle(x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawOrbitEllipse(x, y, rx, ry, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDisc(x, y, rx, ry, spin) {
  ctx.save();
  ctx.translate(x, y);

  // ---- Glow-Halo (statisch) ----
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.5);
  halo.addColorStop(0,   "rgba(140,80,255,0.28)");
  halo.addColorStop(0.6, "rgba(100,50,200,0.10)");
  halo.addColorStop(1,   "rgba(80,30,160,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.5, rx * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- 3D-Kante unten ----
  const depth = ry * 1.4;
  ctx.beginPath();
  ctx.ellipse(0, ry + depth * 0.5, rx, ry, 0, Math.PI, Math.PI * 2, true);
  ctx.ellipse(0, ry + depth * 0.5, rx, ry, 0, 0, Math.PI);
  ctx.fillStyle = "rgba(30,10,60,0.95)";
  ctx.fill();
  ctx.strokeStyle = "rgba(80,40,140,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ---- Clip auf das feste Oval ----
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  // Basisfläche
  ctx.fillStyle = "rgba(18,5,40,0.96)";
  ctx.fillRect(-rx, -ry * 6, rx * 2, ry * 12);

  // Statische Kern-Leuchtwolken (bewegen sich nicht)
  const clouds = [
    { size: 0.55, col: "120,55,230",  a: 0.50 },
    { size: 0.35, col: "80,120,240",  a: 0.35 },
    { size: 0.18, col: "240,200,255", a: 0.80 },
  ];
  for (const c of clouds) {
    const cr = c.size * rx;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
    g.addColorStop(0,   `rgba(${c.col},${c.a})`);
    g.addColorStop(0.6, `rgba(${c.col},${c.a * 0.3})`);
    g.addColorStop(1,   `rgba(${c.col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, cr, cr * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sternpartikel: jeder kreist mit eigenem Winkel = s.a + spin
  for (const s of discStars) {
    const angle = s.a + spin;           // individueller Orbit-Winkel
    const px = s.r * rx * Math.cos(angle);
    const py = s.r * ry * 2.5 * Math.sin(angle); // vertikal abflachen
    const alpha = s.base * (0.35 + 0.65 * (1 - s.r * 0.7));
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    // innere Sterne heller/weißer, außere blasser/blau-lila
    ctx.fillStyle = s.r < 0.4 ? "#fff8ff" : "#b89fdf";
    ctx.beginPath();
    ctx.arc(px, py, s.size * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // clip

  // ---- Rim-Highlight oben (statisch) ----
  const rimGrad = ctx.createLinearGradient(-rx, 0, rx, 0);
  rimGrad.addColorStop(0,    "rgba(120,80,220,0.2)");
  rimGrad.addColorStop(0.35, "rgba(210,180,255,0.9)");
  rimGrad.addColorStop(0.5,  "rgba(240,220,255,1.0)");
  rimGrad.addColorStop(0.65, "rgba(210,180,255,0.9)");
  rimGrad.addColorStop(1,    "rgba(120,80,220,0.2)");
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Untere Kante dunkler
  ctx.strokeStyle = "rgba(160,120,255,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawOuterRing(x, y, rx, ry, time) {
  const spin = time * 0.000032; // langsame Ring-Rotation

  ctx.save();
  ctx.translate(x, y);

  /* ── Diffuse Halo-Schichten (mehrfach gestapelt) ── */
  const halos = [
    { w: 200, a: 0.013, col: "68,48,148" },
    { w: 110, a: 0.028, col: "88,65,178" },
    { w: 60,  a: 0.060, col: "116,90,215" },
    { w: 30,  a: 0.130, col: "150,125,248" },
    { w: 13,  a: 0.280, col: "185,168,255" },
    { w: 5,   a: 0.580, col: "220,213,255" },
  ];
  for (const h of halos) {
    ctx.lineWidth = h.w;
    ctx.strokeStyle = `rgba(${h.col},${h.a})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ── Fließende Nebel-Wolken entlang des Rings ── */
  const NUM_PATCHES = 18;
  for (let i = 0; i < NUM_PATCHES; i++) {
    const frac = (i / NUM_PATCHES) + spin * 0.18;
    const angle = frac * Math.PI * 2;
    const px = rx * Math.cos(angle);
    const py = ry * Math.sin(angle);

    const patchR  = rx * 0.11 + Math.sin(i * 2.5) * rx * 0.055;
    const pulse   = 0.5 + 0.5 * Math.sin(time * 0.00045 * (1 + i * 0.15) + i);
    const alpha   = (0.07 + pulse * 0.11);

    // Farbpalette: blau → lila → orange/rot → türkis
    const phase = (i / NUM_PATCHES);
    const col = phase < 0.22 ? "115,95,255"
               : phase < 0.44 ? "185,115,255"
               : phase < 0.62 ? "255,135,95"
               : phase < 0.80 ? "215,85,175"
               :                "90,165,255";

    const g = ctx.createRadialGradient(px, py, 0, px, py, patchR);
    g.addColorStop(0, `rgba(${col},${Math.min(1, alpha * 2.2)})`);
    g.addColorStop(0.5, `rgba(${col},${alpha})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, patchR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Heller Ring-Kern (Leucht-Linie) ── */
  ctx.lineWidth = 1.6;
  const spine = ctx.createLinearGradient(-rx, 0, rx, 0);
  spine.addColorStop(0,    "rgba(172,155,255,0.07)");
  spine.addColorStop(0.26, "rgba(208,196,255,0.66)");
  spine.addColorStop(0.5,  "rgba(244,240,255,0.96)");
  spine.addColorStop(0.74, "rgba(208,196,255,0.66)");
  spine.addColorStop(1,    "rgba(172,155,255,0.07)");
  ctx.strokeStyle = spine;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  /* ── Sterne fließen entlang des Rings ── */
  for (const s of ringStars) {
    const angle = (s.t + spin * 0.55) * Math.PI * 2;
    const radScale = 1 + s.spread * 0.09; // leichte radiale Streuung
    const px = rx * radScale * Math.cos(angle);
    const py = ry * radScale * Math.sin(angle);
    const alpha = s.base + Math.sin(time * 0.001 * s.tws + s.tw) * 0.30;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "#eae5ff";
    ctx.beginPath();
    ctx.arc(px, py, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ============================================================
   Hover-Hit-Test + Tooltip
   ============================================================ */
function updateTooltip() {
  if (!mouse.active) {
    hideTooltip();
    // Alle pausieren aufheben
    for (const key of ["B", "D", "E"]) paused[key].active = false;
    return;
  }

  let hit = null;
  let hitKey = null;
  for (const key of ["A", "B", "C", "D", "E"]) {
    const o = objects[key];
    const hitR = key === "C" ? 64 * scale * 1.69 : o.radius + 10;
    const dx = mouse.x - o.x;
    const dy = mouse.y - o.y;
    if (dx * dx + dy * dy <= hitR * hitR) {
      hit = o;
      hitKey = key;
      break;
    }
  }

  // Pause-State aktualisieren
  for (const key of ["B", "D", "E"]) {
    paused[key].active = (key === hitKey);
  }

  if (hit) {
    tooltip.innerHTML =
      `<span class="t-name">${hit.label}</span>` +
      `<span class="t-desc">${hit.desc}</span>`;
    let tx = mouse.x + 16;
    let ty = mouse.y + 16;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    if (tx + tw > W - 8) tx = mouse.x - tw - 16;
    if (ty + th > H - 8) ty = mouse.y - th - 16;
    tooltip.style.left = tx + "px";
    tooltip.style.top = ty + "px";
    tooltip.classList.add("visible");
    canvas.style.cursor = "pointer";
  } else {
    hideTooltip();
  }
}

function hideTooltip() {
  tooltip.classList.remove("visible");
  canvas.style.cursor = "crosshair";
}

/* ============================================================
   Resize / Setup
   ============================================================ */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  CX = W / 2;
  CY = H / 2;
  scale = Math.min(W, H) / 800; // Referenzgröße 800px
  if (scale < 0.55) scale = 0.55;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  buildStars();
}

/* --- Maus-Events --- */
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.active = true;
});
canvas.addEventListener("mouseleave", () => {
  mouse.active = false;
});

window.addEventListener("resize", resize);

/* --- Start --- */
resize();
requestAnimationFrame(animate);
