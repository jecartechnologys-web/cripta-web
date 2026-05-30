/**
 * CRIPTA — Parser Module v4.0
 * Modo Rápido: parseo de texto natural a movimiento financiero.
 * Categorías centralizadas y utilidades de identificación.
 *
 * @module parser
 */

// ─── Categorías centralizadas ────────────────

/**
 * Mapa de categorías válidas por tipo de movimiento.
 * @type {Readonly<{
 *   ingreso: string[],
 *   gasto: string[],
 *   gasolina: string[]
 * }>}
 */
export const CATEGORIAS = Object.freeze({
  ingreso: ['delivery', 'general', 'otro'],
  gasto: ['general', 'delivery', 'comida', 'transporte', 'salud', 'inversion', 'otro'],
  gasolina: ['gasolina']
});

/**
 * Etiquetas legibles para cada categoría.
 * @type {Readonly<Record<string, string>>}
 */
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
    /\bingreso\b/i, /\bgan[ée]\b/i, /\bganancia\b/i,
    /\brecib[iíóo]\b/i, /\bcobr[ée]\b/i, /\bpago\s+(recibido|recib[ií])/i,
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

/**
 * Parsea una línea de texto en modo rápido y extrae los datos de un movimiento financiero.
 * Detecta automáticamente el tipo (ingreso, gasto, gasolina, inversión),
 * la categoría, el monto y, para gasolina, los litros y kilómetros.
 *
 * El orden de prioridad para detectar el tipo es:
 * inversión > gasolina > ingreso > gasto (por defecto).
 *
 * @param {string} text - Texto libre ingresado por el usuario (ej: "gasolina 50 soles 3 litros")
 * @returns {null|{
 *   tipo: 'ingreso'|'gasto'|'gasolina'|'inversion',
 *   monto: number,
 *   categoria: string,
 *   descripcion: string,
 *   litros: number,
 *   km: number
 * }} Objeto con los datos parseados, o `null` si no se pudo extraer un monto válido
 */
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
    const kmMatch = lower.match(/(\d+\.?\d*)\s*(?:km|kil[óo]metros?|kms)/);
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

/**
 * Evalúa si un texto coincide con al menos uno de los patrones de una lista.
 * Función interna auxiliar.
 *
 * @param {string} text - Texto a evaluar
 * @param {RegExp[]} patterns - Arreglo de expresiones regulares
 * @returns {boolean} `true` si al menos un patrón coincide
 */
function matchAny(text, patterns) {
  return patterns.some(p => p.test(text));
}

// ─── Icono por tipo ──────────────────────────

/**
 * Devuelve un emoji representativo según el tipo de movimiento.
 *
 * @param {string} tipo - Tipo de movimiento ('ingreso', 'gasto', 'inversion', 'gasolina')
 * @returns {string} Emoji correspondiente al tipo, o '📝' por defecto
 */
export function iconoTipo(tipo) {
  const icons = {
    ingreso: '💰',
    gasto: '🛒',
    inversion: '🌱',
    gasolina: '⛽'
  };
  return icons[tipo] || '📝';
}

/**
 * Devuelve el nombre del tipo con la primera letra en mayúscula.
 *
 * @param {string} tipo - Tipo de movimiento ('ingreso', 'gasto', etc.)
 * @returns {string} Tipo capitalizado, ej: "Ingreso"
 */
export function labelTipo(tipo) {
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}
