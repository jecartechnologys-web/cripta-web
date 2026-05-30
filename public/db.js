/**
 * CRIPTA — DB Module v4.0
 * Todas las interacciones con Supabase.
 * Seguridad: anon key pública + CSP + sanitización frontend.
 */
export const CONFIG = Object.freeze({
  SUPABASE_URL: 'https://myaazbpmhapnqoauqlri.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YWF6YnBtaGFwbnFvYXVxbHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NDA2MTMsImV4cCI6MjA5NTUxNjYxM30.2MWlrQiz6ClP7mkOxrCVQFB0JiWGxq0RUDpNqJ20umg',
  DEVICE_ID_KEY: 'cripta_device_id'
});

// ─── Wait for Supabase SDK ────────────────────
export function waitForSupabase(callback, retries = 30) {
  if (window.supabase?.createClient) {
    callback();
  } else if (retries > 0) {
    setTimeout(() => waitForSupabase(callback, retries - 1), 100);
  } else {
    document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;">' +
      '<div style="font-size:48px;margin-bottom:16px;">⚠️</div>' +
      '<h2 style="color:#ef4444;margin-bottom:8px;">Error de conexión</h2>' +
      '<p style="color:#64748b;font-size:14px;">No se pudo cargar Supabase.</p>' +
      '<button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Reintentar</button>' +
      '</div>';
  }
}

// ─── Create client ────────────────────────────
export function createClient() {
  return window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
}

// ─── UUID v4 (criptográfico) ──────────────────
export function generateUUID() {
  return crypto.randomUUID();
}

// ─── Device ID ────────────────────────────────
export function getDeviceId() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get('device_id');
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (urlId && uuidRe.test(urlId)) {
    localStorage.setItem(CONFIG.DEVICE_ID_KEY, urlId);
    window.history.replaceState({}, document.title, window.location.pathname);
    return urlId;
  }
  let id = localStorage.getItem(CONFIG.DEVICE_ID_KEY);
  if (!id || !uuidRe.test(id)) {
    id = generateUUID();
    localStorage.setItem(CONFIG.DEVICE_ID_KEY, id);
  }
  return id;
}

// ─── Ensure user exists ───────────────────────
export async function ensureUser(supabase, id) {
  try {
    const { error } = await supabase.from('usuarios').upsert(
      { id, nombre: 'device_' + id.substr(0, 8) },
      { onConflict: 'id' }
    );
    if (error) console.warn('[CRIPTA] ensureUser:', error.message);
  } catch (e) {
    console.warn('[CRIPTA] ensureUser error:', e);
  }
}

// ─── DB Query Helpers ─────────────────────────
function safeSum(data, field = 'monto') {
  return (data || []).reduce((s, x) => s + (Number(x[field]) || 0), 0);
}

export async function sumTable(supabase, deviceId, table, dateFrom, dateTo) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('monto')
      .eq('user_id', deviceId)
      .gte('fecha', dateFrom)
      .lte('fecha', dateTo);
    if (error) throw error;
    return safeSum(data);
  } catch (e) {
    console.error('[CRIPTA] sumTable error:', table, e);
    return 0;
  }
}

export async function sumGasolina(supabase, deviceId, dateFrom, dateTo) {
  try {
    const { data, error } = await supabase
      .from('gasolina')
      .select('costo')
      .eq('user_id', deviceId)
      .gte('fecha', dateFrom)
      .lte('fecha', dateTo);
    if (error) throw error;
    return safeSum(data, 'costo');
  } catch (e) {
    console.error('[CRIPTA] sumGasolina error:', e);
    return 0;
  }
}

export async function getKmL(supabase, deviceId) {
  try {
    const { data, error } = await supabase
      .from('gasolina')
      .select('km_recorridos, litros')
      .eq('user_id', deviceId)
      .order('fecha', { ascending: false })
      .limit(10);
    if (error) throw error;
    if (!data || data.length === 0) return 0;
    const valid = data.filter(x => Number(x.litros) > 0 && Number(x.km_recorridos) > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((s, x) => s + (Number(x.km_recorridos) / Number(x.litros)), 0) / valid.length;
  } catch (e) {
    console.error('[CRIPTA] getKmL error:', e);
    return 0;
  }
}

export async function countPasivos(supabase, deviceId) {
  try {
    const { data, error } = await supabase
      .from('deudas')
      .select('id')
      .eq('user_id', deviceId)
      .neq('estado', 'pagada');
    if (error) throw error;
    return (data || []).length;
  } catch (e) {
    console.error('[CRIPTA] countPasivos error:', e);
    return 0;
  }
}

// ─── Dashboard ────────────────────────────────
export async function loadDashboardData(supabase, deviceId) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();

  const [ingresosHoy, gastosHoy, gasolinaHoy, ingresosMes, gastosMes, kml, pasivosCount] = await Promise.all([
    sumTable(supabase, deviceId, 'ingresos', today, today),
    sumTable(supabase, deviceId, 'gastos', today, today),
    sumGasolina(supabase, deviceId, today, today),
    sumTable(supabase, deviceId, 'ingresos', monthStart, today),
    sumTable(supabase, deviceId, 'gastos', monthStart, today),
    getKmL(supabase, deviceId),
    countPasivos(supabase, deviceId)
  ]);

  // Inversiones del mes
  let totalInversiones = 0;
  try {
    const { data: invData } = await supabase
      .from('gastos')
      .select('monto')
      .eq('user_id', deviceId)
      .eq('categoria', 'inversion')
      .gte('fecha', monthStart)
      .lte('fecha', today);
    totalInversiones = safeSum(invData);
  } catch (e) {
    console.error('[CRIPTA] loadDashboardData inversiones error:', e);
  }

  return {
    ingresosHoy, gastosHoy, gasolinaHoy,
    ingresosMes, gastosMes,
    totalInversiones, kml, pasivosCount,
    monthStart, today, monthEnd, dayOfMonth
  };
}

// ─── Historial ────────────────────────────────
export async function loadHistorial(supabase, deviceId, limit = 20) {
  try {
    const tables = ['ingresos', 'gastos', 'gasolina'];
    const labels = { ingresos: '💰 Ingreso', gastos: '🛒 Gasto', gasolina: '⛽ Gasolina' };
    const colorClass = { ingresos: 'ingreso', gastos: 'gasto', gasolina: 'gasolina' };
    const montoField = { ingresos: 'monto', gastos: 'monto', gasolina: 'costo' };

    const results = await Promise.all(tables.map(t =>
      supabase.from(t).select('*').eq('user_id', deviceId).order('fecha', { ascending: false }).limit(limit)
    ));

    let items = [];
    tables.forEach((t, i) => {
      (results[i].data || []).forEach(row => {
        items.push({
          id: row.id,
          table: t,
          fecha: row.fecha,
          descripcion: row.descripcion || t,
          categoria: row.categoria || '',
          monto: Number(row[montoField[t]]) || 0,
          label: labels[t],
          colorClass: colorClass[t]
        });
      });
    });

    items.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    return items.slice(0, limit);
  } catch (e) {
    console.error('[CRIPTA] loadHistorial error:', e);
    return [];
  }
}

// ─── Pasivos ──────────────────────────────────
export async function loadPasivos(supabase, deviceId) {
  try {
    const { data, error } = await supabase
      .from('deudas')
      .select('*')
      .eq('user_id', deviceId)
      .order('estado', { ascending: true })
      .order('fecha_limite', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[CRIPTA] loadPasivos error:', e);
    return [];
  }
}

export async function crearPasivo(supabase, deviceId, { nombre, monto, interes = 0, fechaLimite = null }) {
  try {
    const { error } = await supabase.from('deudas').insert({
      user_id: deviceId,
      nombre,
      monto_total: monto,
      tasa_interes: interes,
      fecha_limite: fechaLimite || null
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[CRIPTA] crearPasivo error:', e);
    throw e;
  }
}

export async function pagarPasivo(supabase, deviceId, pasivoId, monto) {
  try {
    // Registrar pago
    const { error: pagoError } = await supabase.from('pagos_deuda').insert({
      deuda_id: pasivoId, monto
    });
    if (pagoError) throw pagoError;

    // Actualizar estado del pasivo
    const { data: pasivo, error: selectError } = await supabase
      .from('deudas')
      .select('monto_pagado, monto_total')
      .eq('id', pasivoId)
      .single();
    if (selectError) throw selectError;

    const nuevoPagado = (pasivo.monto_pagado || 0) + monto;
    const estado = nuevoPagado >= pasivo.monto_total ? 'pagada' : 'activa';

    const { error: updateError } = await supabase
      .from('deudas')
      .update({ monto_pagado: nuevoPagado, estado })
      .eq('id', pasivoId);
    if (updateError) throw updateError;

    return { estado, nuevoPagado, montoTotal: pasivo.monto_total };
  } catch (e) {
    console.error('[CRIPTA] pagarPasivo error:', e);
    throw e;
  }
}

export async function marcarPasivoLiberado(supabase, deviceId, pasivoId, montoTotal) {
  try {
    const { error } = await supabase
      .from('deudas')
      .update({ monto_pagado: montoTotal, estado: 'pagada' })
      .eq('id', pasivoId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[CRIPTA] marcarPasivoLiberado error:', e);
    throw e;
  }
}

export async function eliminarPasivo(supabase, deviceId, pasivoId) {
  try {
    const { error: e1 } = await supabase.from('pagos_deuda').delete().eq('deuda_id', pasivoId);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('deudas').delete().eq('id', pasivoId);
    if (e2) throw e2;
    return true;
  } catch (e) {
    console.error('[CRIPTA] eliminarPasivo error:', e);
    throw e;
  }
}

export async function eliminarMovimiento(supabase, deviceId, table, id) {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[CRIPTA] eliminarMovimiento error:', e);
    throw e;
  }
}

// ─── Inversiones ──────────────────────────────
export async function loadInversiones(supabase, deviceId) {
  try {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('user_id', deviceId)
      .eq('categoria', 'inversion')
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[CRIPTA] loadInversiones error:', e);
    return [];
  }
}

export async function totalInvertidoMes(supabase, deviceId) {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('gastos')
      .select('monto')
      .eq('user_id', deviceId)
      .eq('categoria', 'inversion')
      .gte('fecha', monthStart)
      .lte('fecha', today);
    if (error) throw error;
    return safeSum(data);
  } catch (e) {
    console.error('[CRIPTA] totalInvertidoMes error:', e);
    return 0;
  }
}

// ─── Presupuestos ─────────────────────────────
export async function loadPresupuestosActivos(supabase, deviceId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('user_id', deviceId)
      .lte('fecha_inicio', today)
      .gte('fecha_fin', today);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[CRIPTA] loadPresupuestosActivos error:', e);
    return [];
  }
}

export async function crearPresupuesto(supabase, deviceId, categoria, montoLimite) {
  try {
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 7);
    const { error } = await supabase.from('presupuestos').insert({
      user_id: deviceId,
      categoria,
      monto_limite: montoLimite,
      fecha_inicio: hoy.toISOString().split('T')[0],
      fecha_fin: fin.toISOString().split('T')[0]
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[CRIPTA] crearPresupuesto error:', e);
    throw e;
  }
}

export async function actualizarPresupuesto(supabase, deviceId, categoria, monto) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('presupuestos')
      .select('id, monto_gastado')
      .eq('user_id', deviceId)
      .eq('categoria', categoria)
      .lte('fecha_inicio', today)
      .gte('fecha_fin', today);
    if (error) throw error;
    if (data && data.length > 0) {
      const nuevo = (data[0].monto_gastado || 0) + monto;
      await supabase.from('presupuestos').update({ monto_gastado: nuevo }).eq('id', data[0].id);
    }
  } catch (e) {
    console.warn('[CRIPTA] actualizarPresupuesto error:', e);
  }
}

// ─── Registrar Movimiento ─────────────────────
export async function registrarMovimiento(supabase, deviceId, tipo, { monto, descripcion, categoria, litros = 0, km = 0 }) {
  try {
    if (tipo === 'inversion') {
      const { error } = await supabase.from('gastos').insert({
        user_id: deviceId, monto, descripcion, categoria: 'inversion'
      });
      if (error) throw error;
    } else if (tipo === 'gasolina') {
      const { error } = await supabase.from('gasolina').insert({
        user_id: deviceId, costo: monto, descripcion, litros, km_recorridos: km
      });
      if (error) throw error;
    } else {
      const table = tipo === 'ingreso' ? 'ingresos' : 'gastos';
      const { error } = await supabase.from(table).insert({
        user_id: deviceId, monto, descripcion, categoria
      });
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.error('[CRIPTA] registrarMovimiento error:', e);
    throw e;
  }
}

// ─── Chart Data (7 días) ──────────────────────
export async function loadChartData(supabase, deviceId) {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const queries = days.map(d => Promise.all([
      supabase.from('ingresos').select('monto').eq('user_id', deviceId).eq('fecha', d),
      supabase.from('gastos').select('monto').eq('user_id', deviceId).eq('fecha', d),
      supabase.from('gasolina').select('costo').eq('user_id', deviceId).eq('fecha', d)
    ]));

    const results = await Promise.all(queries);
    return results.map((r, i) => ({
      label: days[i].slice(5),
      value: safeSum(r[0].data) - safeSum(r[1].data) - safeSum(r[2].data, 'costo')
    }));
  } catch (e) {
    console.error('[CRIPTA] loadChartData error:', e);
    return [];
  }
}

// ─── Meta / Proyección / Simulación ───────────
export async function loadMetaData(supabase, deviceId) {
  try {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [deudasRes, ingRes, gasRes, gasoRes] = await Promise.all([
      supabase.from('deudas').select('*').eq('user_id', deviceId),
      supabase.from('ingresos').select('monto').eq('user_id', deviceId).gte('fecha', monthAgo).lte('fecha', today),
      supabase.from('gastos').select('monto').eq('user_id', deviceId).gte('fecha', monthAgo).lte('fecha', today),
      supabase.from('gasolina').select('costo').eq('user_id', deviceId).gte('fecha', monthAgo).lte('fecha', today)
    ]);

    const deudas = deudasRes.data || [];
    const ingMes = safeSum(ingRes.data);
    const gasMes = safeSum(gasRes.data);
    const gasoMes = safeSum(gasoRes.data, 'costo');
    const promedioDiario = Math.max((ingMes - gasMes - gasoMes) / 30, 0);

    return { deudas, promedioDiario, ingMes, gasMes, gasoMes };
  } catch (e) {
    console.error('[CRIPTA] loadMetaData error:', e);
    return { deudas: [], promedioDiario: 0, ingMes: 0, gasMes: 0, gasoMes: 0 };
  }
}

export async function promediarUltimos30Dias(supabase, deviceId) {
  try {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const [ing, gas, gaso] = await Promise.all([
      sumTable(supabase, deviceId, 'ingresos', monthAgo, today),
      sumTable(supabase, deviceId, 'gastos', monthAgo, today),
      sumGasolina(supabase, deviceId, monthAgo, today)
    ]);
    return (ing - gas - gaso) / 30;
  } catch (e) {
    console.error('[CRIPTA] promediarUltimos30Dias error:', e);
    return 0;
  }
}

export async function resumenMensual(supabase, deviceId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const diasTranscurridos = new Date().getDate();

    const [ingRes, gasRes, gasoRes, deudasRes, invRes] = await Promise.all([
      supabase.from('ingresos').select('monto').eq('user_id', deviceId).gte('fecha', monthStart).lte('fecha', today),
      supabase.from('gastos').select('monto').eq('user_id', deviceId).gte('fecha', monthStart).lte('fecha', today),
      supabase.from('gasolina').select('costo').eq('user_id', deviceId).gte('fecha', monthStart).lte('fecha', today),
      supabase.from('deudas').select('*').eq('user_id', deviceId),
      supabase.from('gastos').select('monto').eq('user_id', deviceId).eq('categoria', 'inversion').gte('fecha', monthStart).lte('fecha', today)
    ]);

    const iMonto = safeSum(ingRes.data);
    const gMonto = safeSum(gasRes.data);
    const gasMonto = safeSum(gasoRes.data, 'costo');
    const neto = iMonto - gMonto - gasMonto;
    const pasivos = deudasRes.data || [];
    const totalPasivo = pasivos.reduce((s, d) => s + (d.monto_total - (d.monto_pagado || 0)), 0);
    const totalPasivoOrig = pasivos.reduce((s, d) => s + d.monto_total, 0);
    const pctLibre = totalPasivoOrig > 0 ? ((1 - totalPasivo / totalPasivoOrig) * 100).toFixed(0) : 100;
    const totalInv = safeSum(invRes.data);
    const diarioPromedio = diasTranscurridos > 0 ? neto / diasTranscurridos : 0;
    const proyeccionMensual = diarioPromedio * diasMes;

    return { iMonto, gMonto, gasMonto, neto, pasivos, totalPasivo, pctLibre, totalInv, diarioPromedio, proyeccionMensual, diasTranscurridos, diasMes };
  } catch (e) {
    console.error('[CRIPTA] resumenMensual error:', e);
    return null;
  }
}

// ─── Exportar CSV ─────────────────────────────
export async function exportarCSV(supabase, deviceId) {
  try {
    const [ingRes, gasRes, gasoRes] = await Promise.all([
      supabase.from('ingresos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }),
      supabase.from('gastos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }),
      supabase.from('gasolina').select('*').eq('user_id', deviceId).order('fecha', { ascending: false })
    ]);

    const escCSV = (str) => {
      const s = (str || '').replace(/"/g, '""');
      // CSV injection protection: prefix formulas with tab
      if (/^[=+\-@\t]/.test(s)) return '"' + '\t' + s + '"';
      return '"' + s + '"';
    };
    const safeVal = (v) => {
      const s = String(v);
      return s;
    };

    let csv = 'Fecha,Tipo,Descripcion,Categoria,Monto\n';
    (ingRes.data || []).forEach(r => {
      csv += `${r.fecha},Ingresso,${escCSV(r.descripcion)},${escCSV(r.categoria)},${safeVal(r.monto)}\n`;
    });
    (gasRes.data || []).forEach(r => {
      csv += `${r.fecha},Gasto,${escCSV(r.descripcion)},${escCSV(r.categoria)},${safeVal(r.monto)}\n`;
    });
    (gasoRes.data || []).forEach(r => {
      csv += `${r.fecha},Gasolina,${escCSV(r.descripcion)},gasolina,${safeVal(r.costo)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cripta_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('[CRIPTA] exportarCSV error:', e);
    throw e;
  }
}
