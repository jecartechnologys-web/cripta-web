/**
 * CRIPTA — Tu Consola Financiera v4.0
 * Entry point. Orquesta módulos db, ui, parser.
 * ES Module — import { ... } from './db.js'
 */

import {
  CONFIG, waitForSupabase, createClient, getDeviceId, ensureUser,
  loadDashboardData, loadHistorial, loadChartData,
  loadPasivos, crearPasivo, pagarPasivo, marcarPasivoLiberado,
  eliminarPasivo, eliminarMovimiento,
  loadInversiones, totalInvertidoMes,
  loadPresupuestosActivos, crearPresupuesto, actualizarPresupuesto,
  registrarMovimiento, exportarCSV,
  loadMetaData, promediarUltimos30Dias, resumenMensual
} from './db.js';

import {
  esc, escAttr, showToast, showModal, hideModal, closeAllModals,
  showConfirm, setLoading, formatSoles, formatSolesInt
} from './ui.js';

import {
  parseModoRapido, iconoTipo, labelTipo, CATEGORIA_LABELS
} from './parser.js';

// =============================================
// STATE
// =============================================
let supabase = null;
let deviceId = null;
let currentType = 'ingreso';
let pasivoPagarId = null;
let pasivoPagarRestante = 0;
let rapidoProcessing = false;
let movimientoProcessing = false;

// =============================================
// INIT
// =============================================
function initApp() {
  supabase = createClient();
  deviceId = getDeviceId();
  ensureUser(supabase, deviceId);

  // Hide loading, show app
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app-screen').classList.add('active');

  // ─── Tabs ──────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ─── Type selector ─────────────────────────
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => selectType(btn.dataset.type));
  });

  // ─── Forms ─────────────────────────────────
  document.getElementById('form-movimiento').addEventListener('submit', handleMovimiento);
  document.getElementById('form-pasivo').addEventListener('submit', handlePasivo);
  document.getElementById('form-presupuesto').addEventListener('submit', handlePresupuesto);
  document.getElementById('form-rapido').addEventListener('submit', handleModoRapido);

  // ─── Modales: cerrar ───────────────────────
  document.getElementById('btn-cerrar-meta')?.addEventListener('click', () => hideModal('modal-meta'));
  document.getElementById('btn-cerrar-salida')?.addEventListener('click', () => hideModal('modal-salida'));
  document.getElementById('btn-cerrar-resumen')?.addEventListener('click', () => hideModal('modal-resumen'));
  document.getElementById('btn-cerrar-detalle')?.addEventListener('click', () => hideModal('modal-detalle-pasivo'));
  document.getElementById('btn-cerrar-pasivos-panel')?.addEventListener('click', () => hideModal('modal-pasivos-panel'));
  document.getElementById('btn-cancelar-pasivo')?.addEventListener('click', () => hideModal('modal-pasivo'));
  document.getElementById('btn-cancelar-pago')?.addEventListener('click', () => hideModal('modal-pago'));
  document.getElementById('btn-cancelar-proyectar')?.addEventListener('click', () => hideModal('modal-proyectar'));
  document.getElementById('btn-cancelar-simular')?.addEventListener('click', () => hideModal('modal-simular'));
  document.getElementById('btn-cancelar-presupuesto')?.addEventListener('click', () => hideModal('modal-presupuesto'));

  // ─── Modal: nuevo pasivo ────────────────────
  document.getElementById('btn-nuevo-pasivo')?.addEventListener('click', () => showModal('modal-pasivo'));

  // ─── Modal: pago ────────────────────────────
  document.getElementById('btn-confirmar-pago')?.addEventListener('click', confirmarPago);

  // ─── Tools ──────────────────────────────────
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTool(btn.dataset.tool));
  });
  document.getElementById('btn-proyectar')?.addEventListener('click', handleProyectar);
  document.getElementById('btn-simular')?.addEventListener('click', handleSimular);

  // ─── Stat cards ─────────────────────────────
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const stat = card.dataset.stat;
      if (stat === 'pasivos') showMeta();
      else if (stat === 'inversiones') switchTab('inversiones');
      else if (stat === 'ingresos' || stat === 'gastos') showResumen();
    });
  });

  // ─── Cargar datos iniciales ────────────────
  loadDashboard();
}

// =============================================
// TABS
// =============================================
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');

  if (tabName === 'dashboard') loadDashboard();
  if (tabName === 'pasivos') loadPasivosTab();
  if (tabName === 'inversiones') loadInversionesTab();
}

// =============================================
// TYPE SELECTOR
// =============================================
function selectType(type) {
  currentType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.type-btn[data-type="${type}"]`);
  if (btn) btn.classList.add('active');

  const show = type === 'gasolina';
  document.getElementById('campo-litros').style.display = show ? 'block' : 'none';
  document.getElementById('campo-km').style.display = show ? 'block' : 'none';
}

// =============================================
// DASHBOARD
// =============================================
async function loadDashboard() {
  const data = await loadDashboardData(supabase, deviceId);
  if (!data) return;

  const neto = data.ingresosHoy - data.gastosHoy - data.gasolinaHoy;
  const netoEl = document.getElementById('neto-hoy');
  netoEl.textContent = formatSoles(neto);
  netoEl.className = 'big-number ' + (neto >= 0 ? 'positive' : 'negative');

  document.getElementById('neto-ingresos').textContent = formatSoles(data.ingresosHoy);
  document.getElementById('neto-gastos').textContent = formatSoles(data.gastosHoy);
  document.getElementById('neto-gasolina').textContent = formatSoles(data.gasolinaHoy);

  document.getElementById('stat-ingresos-mes').textContent = formatSolesInt(data.ingresosMes);
  document.getElementById('stat-gastos-mes').textContent = formatSolesInt(data.gastosMes);
  document.getElementById('stat-inversiones-mes').textContent = formatSolesInt(data.totalInversiones);
  document.getElementById('stat-pasivos-rest').textContent = data.pasivosCount;

  await loadHistorialTab();
  drawChart7d();
}

// ─── Historial ────────────────────────────────
async function loadHistorialTab() {
  const items = await loadHistorial(supabase, deviceId);
  const list = document.getElementById('historial-list');
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = '<div class="list-empty">Sin movimientos hoy 📭</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="list-item clickable" data-id="${item.id}" data-table="${item.table}">
      <div class="list-item-left">
        <span class="list-item-desc">${esc(item.label)} ${esc(item.descripcion)}</span>
        <span class="list-item-date">${esc(item.fecha)}</span>
      </div>
      <div class="list-item-right ${item.colorClass}">${formatSoles(item.monto)}</div>
    </div>
  `).join('');

  // Click para eliminar (con confirmación custom)
  list.querySelectorAll('.list-item.clickable').forEach(el => {
    el.addEventListener('click', async () => {
      const id = parseInt(el.dataset.id);
      const table = el.dataset.table;
      const desc = el.querySelector('.list-item-desc')?.textContent || 'este movimiento';
      const confirmed = await showConfirm({
        title: 'Eliminar movimiento',
        message: `¿Eliminar ${desc}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        danger: true
      });
      if (confirmed) {
        try {
          await eliminarMovimiento(supabase, deviceId, table, id);
          showToast('Movimiento eliminado', 'success');
          loadDashboard();
        } catch (e) {
          showToast('Error al eliminar', 'error');
        }
      }
    });
  });
}

// ─── Chart 7 días ─────────────────────────────
async function drawChart7d() {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas) return;

  const chartData = await loadChartData(supabase, deviceId);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  if (!chartData || chartData.length === 0 || chartData.every(d => d.value === 0)) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos — registra movimientos', w/2, h/2);
    return;
  }

  const maxVal = Math.max(1, ...chartData.map(d => Math.abs(d.value)));
  const barW = (w - 8) / 7 * 0.6;
  const gap = (w - 8) / 7 * 0.4;
  const baseY = h - 18;

  chartData.forEach((d, i) => {
    const x = 4 + i * (barW + gap) + gap/2;
    const barH = (Math.abs(d.value) / maxVal) * (h - 28);
    const y = d.value >= 0 ? baseY - barH : baseY;
    ctx.fillStyle = d.value >= 0 ? '#22c55e' : '#ef4444';
    ctx.fillRect(x, y, barW, Math.max(barH, 1));
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + barW/2, h - 4);
    if (d.value !== 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText((d.value > 0 ? '+' : '') + formatSolesInt(Math.abs(d.value)), x + barW/2, d.value >= 0 ? y - 4 : y + barH + 12);
    }
  });
}

// =============================================
// REGISTRAR MOVIMIENTO
// =============================================
async function handleMovimiento(e) {
  e.preventDefault();
  if (movimientoProcessing) return;
  movimientoProcessing = true;
  setLoading('btn-movimiento', true);

  const monto = parseFloat(document.getElementById('input-monto').value);
  const descripcion = document.getElementById('input-descripcion').value.trim();
  const categoria = document.getElementById('input-categoria').value;
  const litros = parseFloat(document.getElementById('input-litros').value) || 0;
  const km = parseFloat(document.getElementById('input-km').value) || 0;

  if (isNaN(monto) || monto <= 0 || monto > 999999) {
    showToast('Monto inválido (1 — 999,999)', 'error');
    setLoading('btn-movimiento', false);
    return;
  }

  try {
    await registrarMovimiento(supabase, deviceId, currentType, {
      monto, descripcion, categoria, litros, km
    });

    // Actualizar presupuesto si aplica
    if (currentType === 'gasto') {
      actualizarPresupuesto(supabase, deviceId, categoria, monto);
    } else if (currentType === 'gasolina') {
      actualizarPresupuesto(supabase, deviceId, 'gasolina', monto);
    }

    const emoji = iconoTipo(currentType);
    showToast(`${emoji} ${labelTipo(currentType)} registrado: ${formatSoles(monto)}`, 'success');
    document.getElementById('form-movimiento').reset();
    selectType('ingreso');
    loadDashboard();
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    movimientoProcessing = false;
    setLoading('btn-movimiento', false);
  }
}

// =============================================
// MODO RÁPIDO
// =============================================
async function handleModoRapido(e) {
  e.preventDefault();
  if (rapidoProcessing) return;
  rapidoProcessing = true;

  const input = document.getElementById('input-rapido');
  const preview = document.getElementById('rapido-preview');
  const text = input.value.trim();
  if (!text) { rapidoProcessing = false; return; }

  const parsed = parseModoRapido(text);
  if (!parsed) {
    preview.textContent = '❌ No entendí. Ej: "gaste 20 en gasolina"';
    preview.style.color = 'var(--error)';
    rapidoProcessing = false;
    setTimeout(() => { preview.textContent = ''; }, 3000);
    return;
  }

  input.value = '';

  const emoji = iconoTipo(parsed.tipo);
  preview.innerHTML = `<span style="color:var(--text-dim);font-size:11px;">Interpretando… ${emoji} ${labelTipo(parsed.tipo)} ${formatSoles(parsed.monto)}</span>`;

  try {
    await registrarMovimiento(supabase, deviceId, parsed.tipo, {
      monto: parsed.monto,
      descripcion: parsed.descripcion,
      categoria: parsed.categoria,
      litros: parsed.litros,
      km: parsed.km
    });

    if (parsed.tipo === 'gasto') {
      actualizarPresupuesto(supabase, deviceId, parsed.categoria, parsed.monto);
    } else if (parsed.tipo === 'gasolina') {
      actualizarPresupuesto(supabase, deviceId, 'gasolina', parsed.monto);
    }

    preview.innerHTML = `✅ ${emoji} ${labelTipo(parsed.tipo)} registrado: ${formatSoles(parsed.monto)}`;
    preview.style.color = 'var(--success)';
    loadDashboard();
  } catch (e) {
    preview.textContent = '❌ Error de conexión';
    preview.style.color = 'var(--error)';
  }

  rapidoProcessing = false;
  setTimeout(() => { preview.textContent = ''; }, 4000);
}

// =============================================
// PASIVOS
// =============================================
async function loadPasivosTab() {
  const pasivos = await loadPasivos(supabase, deviceId);
  const list = document.getElementById('pasivos-list');
  if (!list) return;

  if (pasivos.length === 0) {
    list.innerHTML = '<div class="list-empty">Sin pasivos registrados 🌀</div>';
    return;
  }

  list.innerHTML = pasivos.map(p => {
    const restante = p.monto_total - (p.monto_pagado || 0);
    const pagado = p.monto_pagado || 0;
    const pct = p.monto_total > 0 ? (pagado / p.monto_total) * 100 : 0;
    const liberada = p.estado === 'pagada';
    const vencido = p.fecha_limite && new Date(p.fecha_limite) < new Date() && !liberada;

    return `
      <div class="pasivo-card clickable" data-id="${p.id}" data-restante="${restante}">
        <div class="deuda-header">
          <span class="deuda-nombre">${liberada ? '✅ ' : ''}${esc(p.nombre)} ${vencido ? '🚨' : ''}</span>
          <span class="deuda-monto">${formatSolesInt(restante)}</span>
        </div>
        ${!liberada ? `
          <div class="deuda-progress">
            <div class="deuda-progress-fill" style="width:${Math.min(pct, 100)}%"></div>
          </div>
          <div class="deuda-footer">
            <span>${pct.toFixed(0)}% liberado</span>
            <span>${p.tasa_interes > 0 ? p.tasa_interes + '% interés' : 'sin interés'}</span>
            ${p.fecha_limite ? `<span>Vence ${esc(p.fecha_limite)}</span>` : ''}
          </div>
          <div class="deuda-actions">
            <button class="btn btn-sm btn-primary pagar-btn" data-id="${p.id}" data-restante="${restante}">Pagar</button>
            <button class="btn btn-sm btn-secondary liberar-btn" data-id="${p.id}" data-total="${p.monto_total}">Liberar ✅</button>
            <button class="btn btn-sm btn-danger eliminar-btn" data-id="${p.id}">✕</button>
          </div>
        ` : `
          <div class="deuda-footer">
            <span style="color:var(--green);">✅ Liberado — ${formatSoles(p.monto_total)}</span>
          </div>
          <div class="deuda-actions">
            <button class="btn btn-sm btn-danger eliminar-btn" data-id="${p.id}">✕ Eliminar</button>
          </div>
        `}
      </div>
    `;
  }).join('');

  // Event listeners
  list.querySelectorAll('.pagar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const restante = parseFloat(btn.dataset.restante);
      abrirModalPago(id, restante);
    });
  });

  list.querySelectorAll('.liberar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const total = parseFloat(btn.dataset.total);
      marcarLiberadoConConfirm(id, total);
    });
  });

  list.querySelectorAll('.eliminar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      eliminarConConfirm(id);
    });
  });

  // Click en card para ver detalle
  list.querySelectorAll('.pasivo-card.clickable').forEach(card => {
    card.addEventListener('click', async () => {
      const id = parseInt(card.dataset.id);
      await mostrarDetallePasivo(id);
    });
  });

  // Próximos pagos
  await loadProximosPagos(pasivos);
}

async function loadProximosPagos(pasivos) {
  const list = document.getElementById('proximos-list');
  if (!list) return;

  const activos = pasivos.filter(p => p.estado !== 'pagada' && p.fecha_limite);
  if (activos.length === 0) {
    list.innerHTML = '<div class="list-empty">Sin próximos pagos 🎉</div>';
    return;
  }

  activos.sort((a, b) => {
    if (!a.fecha_limite) return 1;
    if (!b.fecha_limite) return -1;
    return new Date(a.fecha_limite) - new Date(b.fecha_limite);
  });

  list.innerHTML = activos.map(p => {
    const restante = p.monto_total - (p.monto_pagado || 0);
    const diasRestantes = p.fecha_limite ? Math.ceil((new Date(p.fecha_limite) - new Date()) / 86400000) : null;
    const urgente = diasRestantes !== null && diasRestantes <= 3;
    return `
      <div class="list-item" style="cursor:default;">
        <div class="list-item-left">
          <span class="list-item-desc">${urgente ? '🚨 ' : ''}${esc(p.nombre)}</span>
          <span class="list-item-date">${diasRestantes !== null ? (diasRestantes <= 0 ? 'Vencido' : diasRestantes + ' días') : 'Sin fecha'}</span>
        </div>
        <div class="list-item-right deuda-monto">${formatSolesInt(restante)}</div>
      </div>
    `;
  }).join('');
}

function abrirModalPago(id, restante) {
  try {
    const infoEl = document.getElementById('pago-info');
    const montoEl = document.getElementById('pago-monto');
    pasivoPagarId = id;
    pasivoPagarRestante = restante;
    infoEl.textContent = 'Restante: ' + formatSoles(restante);
    montoEl.value = '';
    montoEl.max = restante;
    showModal('modal-pago');
    montoEl?.focus();
  } catch (e) {
    console.error('[ERROR] abrirModalPago:', e);
    showToast('Error al abrir pago', 'error');
  }
}

async function confirmarPago() {
  const monto = parseFloat(document.getElementById('pago-monto').value);
  if (isNaN(monto) || monto <= 0 || monto > pasivoPagarRestante) {
    showToast('Monto inválido', 'error');
    return;
  }

  setLoading('btn-confirmar-pago', true);
  try {
    await pagarPasivo(supabase, deviceId, pasivoPagarId, monto);
    showToast(`💳 Pago registrado: ${formatSoles(monto)}`, 'success');
    hideModal('modal-pago');
    loadPasivosTab();
    loadDashboard();
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    setLoading('btn-confirmar-pago', false);
  }
}

async function marcarLiberadoConConfirm(id, montoTotal) {
  const confirmed = await showConfirm({
    title: '🎉 Liberar Pasivo',
    message: '¿Marcar este pasivo como liberado?',
    confirmText: 'Sí, liberar',
    danger: false
  });
  if (!confirmed) return;
  try {
    await marcarPasivoLiberado(supabase, deviceId, id, montoTotal);
    showToast('✅ Pasivo liberado!', 'success');
    loadPasivosTab();
    loadDashboard();
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
}

async function eliminarConConfirm(id) {
  const confirmed = await showConfirm({
    title: 'Eliminar pasivo',
    message: '¿Eliminar este pasivo definitivamente? Se borrarán también sus pagos.',
    confirmText: 'Eliminar',
    danger: true
  });
  if (!confirmed) return;
  try {
    await eliminarPasivo(supabase, deviceId, id);
    showToast('Pasivo eliminado', 'success');
    loadPasivosTab();
    loadDashboard();
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
}

async function mostrarDetallePasivo(id) {
  try {
    const pasivos = await loadPasivos(supabase, deviceId);
    const p = pasivos.find(x => x.id === id);
    if (!p) return;

    const restante = p.monto_total - (p.monto_pagado || 0);
    const pagado = p.monto_pagado || 0;
    const pct = p.monto_total > 0 ? (pagado / p.monto_total) * 100 : 0;

    document.getElementById('detalle-titulo').textContent = '🌀 ' + esc(p.nombre);
    document.getElementById('detalle-contenido').innerHTML = `
      <div style="padding:8px 0;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">
            <div style="font-size:11px;color:var(--text-dim);">Total</div>
            <div style="font-size:22px;font-weight:700;color:var(--debt);">${formatSolesInt(p.monto_total)}</div>
          </div>
          <div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">
            <div style="font-size:11px;color:var(--text-dim);">Restante</div>
            <div style="font-size:22px;font-weight:700;color:${restante > 0 ? 'var(--debt)' : 'var(--green)'};">${formatSolesInt(restante)}</div>
          </div>
        </div>
        <div style="margin-top:12px;">
          <div class="deuda-progress">
            <div class="deuda-progress-fill" style="width:${Math.min(pct, 100)}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-dim);margin-top:4px;">
            <span>${pct.toFixed(0)}% liberado</span>
            <span>${formatSolesInt(pagado)} de ${formatSolesInt(p.monto_total)}</span>
          </div>
        </div>
        ${p.tasa_interes > 0 ? `<div style="margin-top:8px;padding:8px;background:var(--bg-input);border-radius:6px;font-size:13px;">Interés: ${p.tasa_interes}% mensual</div>` : ''}
        ${p.fecha_limite ? `<div style="margin-top:8px;padding:8px;background:var(--bg-input);border-radius:6px;font-size:13px;">Fecha límite: ${esc(p.fecha_limite)}</div>` : ''}
        <div style="margin-top:8px;padding:8px;background:var(--bg-input);border-radius:6px;font-size:13px;">
          Estado: <strong>${p.estado === 'pagada' ? '✅ Liberado' : '🌀 Activo'}</strong>
        </div>
      </div>
    `;
    showModal('modal-detalle-pasivo');
  } catch (e) {
    console.error('[CRIPTA] detalle pasivo error:', e);
  }
}

// ─── Formulario nuevo pasivo ──────────────────
async function handlePasivo(e) {
  e.preventDefault();
  const nombre = document.getElementById('pasivo-nombre').value.trim();
  const monto = parseFloat(document.getElementById('pasivo-monto').value);
  const interes = parseFloat(document.getElementById('pasivo-interes').value) || 0;
  const fecha = document.getElementById('pasivo-fecha').value || null;

  if (!nombre || isNaN(monto) || monto <= 0 || monto > 999999) {
    showToast('Completa nombre y monto válido', 'error');
    return;
  }

  setLoading('btn-guardar-pasivo', true);
  try {
    await crearPasivo(supabase, deviceId, { nombre, monto, interes, fechaLimite: fecha });
    showToast('🌀 Pasivo registrado', 'success');
    hideModal('modal-pasivo');
    document.getElementById('form-pasivo').reset();
    loadPasivosTab();
  } catch (e) {
    showToast('Error de conexión', 'error');
  } finally {
    setLoading('btn-guardar-pasivo', false);
  }
}

// =============================================
// INVERSIONES
// =============================================
async function loadInversionesTab() {
  const inversiones = await loadInversiones(supabase, deviceId);
  const list = document.getElementById('inversiones-list');
  if (!list) return;

  if (inversiones.length === 0) {
    list.innerHTML = '<div class="list-empty">Sin inversiones registradas 🌱<br><span style="font-size:12px;">Registra desde Registrar → Inversión</span></div>';
    return;
  }

  list.innerHTML = inversiones.map(inv => `
    <div class="list-item clickable" data-id="${inv.id}">
      <div class="list-item-left">
        <span class="list-item-desc">🌱 ${esc(inv.descripcion || 'Inversión')}</span>
        <span class="list-item-date">${esc(inv.fecha)}</span>
      </div>
      <div class="list-item-right inversion">${formatSoles(inv.monto)}</div>
    </div>
  `).join('');

  list.querySelectorAll('.list-item.clickable').forEach(el => {
    el.addEventListener('click', async () => {
      const id = parseInt(el.dataset.id);
      const desc = el.querySelector('.list-item-desc')?.textContent || 'esta inversión';
      const confirmed = await showConfirm({
        title: 'Eliminar inversión',
        message: `¿Eliminar ${desc}?`,
        confirmText: 'Eliminar',
        danger: true
      });
      if (confirmed) {
        try {
          await eliminarMovimiento(supabase, deviceId, 'gastos', id);
          showToast('Inversión eliminada', 'success');
          loadInversionesTab();
          loadDashboard();
        } catch (e) {
          showToast('Error de conexión', 'error');
        }
      }
    });
  });

  const total = await totalInvertidoMes(supabase, deviceId);
  document.getElementById('total-invertido-mes').textContent = formatSolesInt(total);
}

// =============================================
// TOOLS
// =============================================
function handleTool(tool) {
  const actions = {
    meta: showMeta,
    proyectar: () => showModal('modal-proyectar'),
    simular: () => showModal('modal-simular'),
    salida: showSalida,
    exportar: handleExportar,
    presupuesto: showPresupuesto,
    resumen: showResumen
  };
  if (actions[tool]) actions[tool]();
}

// ─── Meta ────────────────────────────────────
async function showMeta() {
  const { deudas, promedioDiario } = await loadMetaData(supabase, deviceId);

  if (deudas.length === 0 && promedioDiario <= 0) {
    document.getElementById('meta-resultado').innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-dim);">Sin pasivos ni ingresos registrados 📭</p>';
    showModal('modal-meta');
    return;
  }

  const hoy = new Date();
  let totalDeuda = 0;
  const deudasDetalle = [];

  deudas.sort((a, b) => (b.tasa_interes || 0) - (a.tasa_interes || 0));

  for (const d of deudas) {
    const restante = d.monto_total - (d.monto_pagado || 0);
    totalDeuda += restante;
    deudasDetalle.push({
      nombre: d.nombre,
      restante,
      tasa: d.tasa_interes || 0,
      fecha: d.fecha_limite
    });
  }

  const diasPorDeuda = deudasDetalle.map(d => {
    if (d.fecha) {
      const diff = Math.ceil((new Date(d.fecha) - hoy) / 86400000);
      return diff > 0 ? diff : 1;
    }
    return 90;
  });
  let diasRestantes = Math.min(...diasPorDeuda);
  if (!isFinite(diasRestantes) || diasRestantes <= 0) diasRestantes = 30;

  const metaDiaria = totalDeuda / diasRestantes;
  const porcentajeIngreso = promedioDiario > 0 ? Math.min((metaDiaria / promedioDiario) * 100, 100) : 100;
  const sugerido = Math.min(metaDiaria, promedioDiario * 0.5);
  const factible = promedioDiario >= metaDiaria;
  const ahorroMensual = promedioDiario * 30 - totalDeuda;

  const html = `
    <div style="padding:12px 0;">
      <div style="text-align:center;padding:12px 0;">
        <div style="font-size:12px;color:var(--text-dim);">🌀 Total pasivos</div>
        <div style="font-size:32px;font-weight:700;color:var(--debt);">${formatSolesInt(totalDeuda)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">
          <div style="font-size:10px;color:var(--text-dim);">🎯 Meta diaria</div>
          <div style="font-size:22px;font-weight:700;color:var(--green);margin-top:2px;">${formatSoles(metaDiaria)}</div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">para liberar en ${diasRestantes} días</div>
        </div>
        <div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">
          <div style="font-size:10px;color:var(--text-dim);">📊 Promedio diario</div>
          <div style="font-size:22px;font-weight:700;color:${factible ? 'var(--green)' : 'var(--red)'};margin-top:2px;">${formatSoles(promedioDiario)}</div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">${factible ? '✅ Suficiente!' : '⚠️ Te faltan ' + formatSoles(metaDiaria - promedioDiario) + '/día'}</div>
        </div>
      </div>
      <div style="margin-top:12px;padding:10px;background:var(--bg-input);border-radius:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
          <span style="color:var(--text-dim);">% de tu ingreso para pasivos</span>
          <span style="font-weight:600;">${porcentajeIngreso.toFixed(0)}%</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(porcentajeIngreso, 100)}%;background:${porcentajeIngreso > 70 ? 'var(--red)' : porcentajeIngreso > 40 ? '#ffa500' : 'var(--green)'};border-radius:4px;"></div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">
          ${factible
            ? `💡 Si hoy ganas ${formatSolesInt(promedioDiario)}, destina ${formatSolesInt(sugerido)} a pasivos`
            : `💡 Necesitas aumentar tu ingreso diario en ${formatSoles(metaDiaria - promedioDiario)}`}
        </div>
      </div>
      ${deudasDetalle.length > 0 ? `
        <div style="margin-top:12px;">
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">📋 Prioridad (mayor interés primero):</div>
          ${deudasDetalle.map((d, i) => `
            <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg-input);border-radius:6px;margin-bottom:4px;font-size:12px;">
              <span>${i + 1}. ${esc(d.nombre)}</span>
              <span style="color:var(--debt);font-weight:600;">${formatSolesInt(d.restante)}${d.tasa > 0 ? ' (' + d.tasa + '%)' : ''}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${ahorroMensual > 0 ? `
        <div style="margin-top:10px;padding:10px;background:var(--bg-input);border-radius:8px;font-size:12px;text-align:center;color:var(--green);">
          🚀 Al paso actual, en 30 días tendrías ${formatSolesInt(ahorroMensual)} libre
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('meta-resultado').innerHTML = html;
  showModal('modal-meta');
}

// ─── Proyectar ───────────────────────────────
async function handleProyectar() {
  const dias = parseInt(document.getElementById('proyectar-dias').value, 10) || 7;
  const promedioDiario = await promediarUltimos30Dias(supabase, deviceId);
  const proyeccion = promedioDiario * dias;

  document.getElementById('proyectar-resultado').innerHTML = `
    <div style="text-align:center;padding:16px 0;">
      <div style="color:var(--text-dim);font-size:14px;">Promedio diario (30 días)</div>
      <div style="font-size:24px;font-weight:700;margin:8px 0;">${formatSoles(promedioDiario)}</div>
      <div style="color:var(--text-dim);font-size:14px;">En ${dias} días tendrás</div>
      <div style="font-size:32px;font-weight:700;color:${proyeccion >= 0 ? 'var(--green)' : 'var(--red)'};">${formatSoles(proyeccion)}</div>
    </div>
  `;
}

// ─── Simular ─────────────────────────────────
async function handleSimular() {
  const ingresoExtra = parseFloat(document.getElementById('simular-ingreso').value) || 0;
  const gastoExtra = parseFloat(document.getElementById('simular-gasto').value) || 0;
  const promedioDiario = await promediarUltimos30Dias(supabase, deviceId);
  const actual = promedioDiario * 30;
  const simulado = actual + ingresoExtra - gastoExtra;
  const diff = simulado - actual;

  document.getElementById('simular-resultado').innerHTML = `
    <div style="text-align:center;padding:16px 0;">
      <div style="color:var(--text-dim);font-size:14px;">Situación actual (30 días)</div>
      <div style="font-size:24px;font-weight:700;margin:8px 0;">${formatSoles(actual)}</div>
      <div style="color:var(--text-dim);font-size:14px;">Con el escenario simulado</div>
      <div style="font-size:28px;font-weight:700;color:${simulado >= 0 ? 'var(--green)' : 'var(--red)'};">${formatSoles(simulado)}</div>
      <div style="font-size:14px;color:${diff >= 0 ? 'var(--green)' : 'var(--red)'};margin-top:8px;">
        ${diff >= 0 ? '📈 +' : '📉 '}${formatSoles(Math.abs(diff))}
      </div>
    </div>
  `;
}

// ─── Plan Salida ─────────────────────────────
async function showSalida() {
  const pasivos = await loadPasivos(supabase, deviceId);
  const activos = pasivos.filter(p => p.estado !== 'pagada');

  if (activos.length === 0) {
    document.getElementById('salida-resultado').innerHTML = '<p style="text-align:center;padding:20px;color:var(--green);">¡Sin pasivos activos! 🎉</p>';
    showModal('modal-salida');
    return;
  }

  let totalPasivo = 0;
  const pagos = [];

  for (const p of activos) {
    const restante = p.monto_total - (p.monto_pagado || 0);
    totalPasivo += restante;
    pagos.push({ nombre: p.nombre, restante, tasa: p.tasa_interes, fecha: p.fecha_limite });
  }

  pagos.sort((a, b) => b.tasa - a.tasa);

  const plan = pagos.map((p, i) =>
    `${i + 1}. ${esc(p.nombre)}: ${formatSoles(p.restante)}${p.tasa > 0 ? ' (' + p.tasa + '% interés)' : ''}${p.fecha ? ' → vence ' + esc(p.fecha) : ''}`
  ).join('\n');

  document.getElementById('salida-resultado').innerHTML = `
    <div style="padding:16px 0;">
      <p style="color:var(--text-dim);">Tu plan de salida:</p>
      <div style="font-size:28px;font-weight:700;color:var(--debt);text-align:center;margin:12px 0;">${formatSoles(totalPasivo)}</div>
      <p style="color:var(--text-dim);margin-bottom:8px;">Prioridad por tasa de interés:</p>
      <pre style="font-family:monospace;font-size:14px;line-height:1.8;white-space:pre-wrap;">${plan}</pre>
      <div style="margin-top:16px;padding:12px;background:var(--bg-input);border-radius:8px;font-size:13px;color:var(--text-dim);">
        💡 Libera primero el pasivo con mayor interés.
      </div>
    </div>
  `;
  showModal('modal-salida');
}

// ─── Exportar CSV ────────────────────────────
async function handleExportar() {
  try {
    await exportarCSV(supabase, deviceId);
    showToast('CSV descargado', 'success');
  } catch (e) {
    showToast('Error al exportar', 'error');
  }
}

// ─── Resumen ─────────────────────────────────
async function showResumen() {
  const data = await resumenMensual(supabase, deviceId);
  if (!data) {
    showToast('Error al cargar resumen', 'error');
    return;
  }

  const html = `
    <div style="padding:8px 0;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:var(--text-dim);">🟢 Ingresos</div>
          <div style="font-size:20px;font-weight:700;color:var(--green);margin-top:4px;">${formatSolesInt(data.iMonto)}</div>
        </div>
        <div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">
          <div style="font-size:11px;color:var(--text-dim);">🔴 Gastos</div>
          <div style="font-size:20px;font-weight:700;color:var(--red);margin-top:4px;">${formatSolesInt(data.gMonto + data.gasMonto)}</div>
        </div>
      </div>
      <div style="background:var(--bg-input);padding:14px;border-radius:10px;text-align:center;margin-top:10px;">
        <div style="font-size:12px;color:var(--text-dim);">📊 Ganancia Neta del Mes</div>
        <div style="font-size:28px;font-weight:700;margin-top:4px;color:${data.neto >= 0 ? 'var(--green)' : 'var(--red)'};">${formatSoles(data.neto)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;">
        <div style="background:var(--bg-input);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:10px;color:var(--text-dim);">📈 Promedio/día</div>
          <div style="font-size:16px;font-weight:600;margin-top:2px;">${formatSoles(data.diarioPromedio)}</div>
        </div>
        <div style="background:var(--bg-input);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:10px;color:var(--text-dim);">📅 Proy. mensual</div>
          <div style="font-size:16px;font-weight:600;color:${data.proyeccionMensual >= 0 ? 'var(--green)' : 'var(--red)'};margin-top:2px;">${formatSolesInt(data.proyeccionMensual)}</div>
        </div>
        <div style="background:var(--bg-input);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:10px;color:var(--text-dim);">🌱 Inversiones</div>
          <div style="font-size:16px;font-weight:600;color:var(--green);margin-top:2px;">${formatSolesInt(data.totalInv)}</div>
        </div>
      </div>
      <div style="margin-top:12px;padding:10px;background:var(--bg-input);border-radius:8px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
          <span style="color:var(--text-dim);">🌀 Total pasivos</span>
          <span style="font-weight:600;color:var(--debt);">${formatSolesInt(data.totalPasivo)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
          <span style="color:var(--text-dim);">✅ Liberado</span>
          <span style="font-weight:600;color:var(--green);">${data.pctLibre}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
          <span style="color:var(--text-dim);">📆 Días del mes</span>
          <span>${data.diasTranscurridos}/${data.diasMes}</span>
        </div>
        ${data.pasivos.slice(0, 3).map(d => {
          const rest = d.monto_total - (d.monto_pagado || 0);
          return `
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-top:1px solid rgba(255,255,255,0.05);">
              <span>${esc(d.nombre)}</span>
              <span style="color:var(--debt);">${formatSolesInt(rest)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('resumen-contenido').innerHTML = html;
  showModal('modal-resumen');
}

// ─── Presupuesto ─────────────────────────────
async function showPresupuesto() {
  const presupuestos = await loadPresupuestosActivos(supabase, deviceId);
  const container = document.getElementById('presupuestos-activos');

  if (!presupuestos || presupuestos.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);font-size:14px;">Sin presupuestos activos esta semana</p>';
  } else {
    const html = '<h4 style="font-size:14px;color:var(--text-dim);margin-bottom:8px;">Activos esta semana:</h4>' +
      presupuestos.map(p => {
        const pct = p.monto_limite > 0 ? ((p.monto_gastado / p.monto_limite) * 100) : 0;
        const barColor = pct < 50 ? 'var(--green)' : (pct < 80 ? '#ffa500' : 'var(--red)');
        const restante = p.monto_limite - p.monto_gastado;
        return `
          <div style="padding:10px;background:var(--bg-input);border-radius:10px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="font-weight:500;">${esc(p.categoria)}</span>
              <span style="font-size:13px;color:${barColor};">${pct.toFixed(0)}% usado</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-bottom:6px;">
              <div style="height:100%;width:${Math.min(pct, 100)}%;background:${barColor};border-radius:3px;transition:width 0.3s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-dim);">${formatSoles(p.monto_gastado)} gastado</span>
              <span style="color:${restante > 0 ? 'var(--green)' : 'var(--red)'};">${formatSoles(Math.max(restante, 0))} restante</span>
            </div>
          </div>
        `;
      }).join('');
    container.innerHTML = html;
  }
  showModal('modal-presupuesto');
}

async function handlePresupuesto(e) {
  e.preventDefault();
  const categoria = document.getElementById('presupuesto-categoria').value;
  const monto = parseFloat(document.getElementById('presupuesto-monto').value);

  if (isNaN(monto) || monto <= 0) {
    showToast('Monto inválido', 'error');
    return;
  }

  try {
    await crearPresupuesto(supabase, deviceId, categoria, monto);
    showToast('Presupuesto creado', 'success');
    hideModal('modal-presupuesto');
    document.getElementById('form-presupuesto').reset();
    showPresupuesto();
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
}

// =============================================
// BOOT
// =============================================
waitForSupabase(initApp);
