/**
 * CRIPTA — Parser Module v4.0
 * Modo Rápido: texto natural a movimiento financiero.
 */

// ─── Categorías centralizadas ────────────────
export const CATEGORIAS = Object.freeze({
  ingreso: ['delivery', 'general', 'otro'],
  gasto: ['general', 'delivery', 'comida', 'transporte', 'salud', 'inversion', 'otro'],
  gasolina: ['gasolina']
});

export const CATEGORIA_LABELS = Object.freeze({
  general: 'General',
  delivery: 'Delivery',
  comida: 'Comida',
  transporte: 'Transporte',
  salud: 'Salud',
  inversion: '🌱 Inversión Fija',
  gasolina: 'Gasolina',
  otro: 'Otro'
});

// ─── Patrones de detección ───────────────────
const PATRONES = {
  ingreso: [
    /\bingreso\b/i, /\bgan[eé]\b/i, /\bganancia\b/i,
    /\brecib[iióo]\b/i, /\bcobr[ée]\b/i, /\bpago\s+(recibido|recib[ií])/i,
    /\bpedido\b/i, /\bentrega\b/i, /\bpropina\b/i
  ],
  gasto: [
    /\bgast[éeo]\b/i, /\bpagu[ée]\b/i, /\bcompre?\b/i,
    /\bcom[ií]\b/i, /\bgast[ii]\b/i
  ],
  gasolina: [
    /\bgasolina\b/i, /\btanque[oó]\b/i,
    /\bbencina\b/i, /\bgrifo\b/i, /\bpetr[óo]leo\b/i,
    /\b(?:llene|ech[ée])\s+(?:gasolina|bencina)/i
  ],
  inversion: [
    /\binversi[oó]n\b/i, /\binviert[oe]\b/i,
    /\bplan\b/i, /\bcuota\b/i, /\bcurs[oó]\b/i,
    /\bpaquete\b/i, /\bsuscripci[oó]n\b/i
  ]
};

const CATEGORIA_GASTO = {
  comida: [/\bcomida\b/i, /\balmuerzo\b/i, /\bcena\b/i, /\bdesayuno\b/i, /\bmen[úu]\b/i, /\bplato\b/i],
  transporte: [/\btransporte\b/i, /\bpasaje\b/i, /\btaxi\b/i, /\buber\b/i, /\bcomb[ií]\b/i],
  salud: [/\bsalud\b/i, /\bdoctor\b/i, /\bm[ée]dico\b/i, /\bfarmacia\b/i, /\bmedicina\b/i, /\bhospital\b/i],
  delivery: [/\bdelivery\b/i, /\bpedido\b/i, /\bdelibery\b/i]
};

// ─── Parsear texto natural ────────────────────
export function parseModoRapido(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Extraer monto
  const montoMatch = trimmed.match(/(\d+\.?\d*)/);
  if (!montoMatch) return null;

  const monto = parseFloat(montoMatch[1]);
  if (isNaN(monto) || monto <= 0 || monto > 999999) return null;

  const lower = trimmed.toLowerCase();

  // Detectar tipo
  let tipo = 'gasto';
  let categoria = 'general';
  let litros = 0;
  let km = 0;

  // Prioridad: inversión > gasolina > ingreso > gasto
  if (matchAny(lower, PATRONES.inversion)) {
    tipo = 'inversion';
    categoria = 'inversion';
  } else if (matchAny(lower, PATRONES.gasolina)) {
    tipo = 'gasolina';
    categoria = 'gasolina';
    const litrosMatch = lower.match(/(\d+\.?\d*)\s*litros?/);
    if (litrosMatch) litros = parseFloat(litrosMatch[1]);
    const kmMatch = lower.match(/(\d+\.?\d*)\s*(?:km|kil[oó]metros?|kms)/);
    if (kmMatch) km = parseFloat(kmMatch[1]);
  } else if (matchAny(lower, PATRONES.ingreso)) {
    tipo = 'ingreso';
    categoria = 'delivery';
  }

  // Detectar categoría específica (solo para gastos)
  if (tipo === 'gasto') {
    if (matchAny(lower, CATEGORIA_GASTO.comida)) categoria = 'comida';
    else if (matchAny(lower, CATEGORIA_GASTO.transporte)) categoria = 'transporte';
    else if (matchAny(lower, CATEGORIA_GASTO.salud)) categoria = 'salud';
    else if (matchAny(lower, CATEGORIA_GASTO.delivery)) categoria = 'delivery';
  }

  // Descripción: usar el texto original como descripción
  const descripcion = trimmed;

  return { tipo, monto, categoria, descripcion, litros, km };
}

function matchAny(text, patterns) {
  return patterns.some(p => p.test(text));
}

// ─── Icono por tipo ──────────────────────────
export function iconoTipo(tipo) {
  const icons = {
    ingreso: '💰',
    gasto: '🛒',
    inversion: '🌱',
    gasolina: '⛽'
  };
  return icons[tipo] || '📝';
}

export function labelTipo(tipo) {
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}
