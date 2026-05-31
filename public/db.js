/**
 * CRIPTA — DB Module v4.0
 * Todas las interacciones con Supabase.
 * Seguridad: anon key pública + CSP + sanitización frontend.
 *
 * @module db
 */

/**
 * Configuración global de conexión a Supabase e identificadores del dispositivo.
 * @type {Readonly<{
 *   SUPABASE_URL: string,
 *   SUPABASE_KEY: string,
 *   DEVICE_ID_KEY: string
 * }>}
 */
export const CONFIG = Object.freeze({
  SUPABASE_URL: 'https://myaazbpmhapnqoauqlri.supabase.co',
  SUPABASE_KEY: 'eyJhbG...0umg',
  DEVICE_ID_KEY: 'cripta_device_id'
});

// ─── Wait for Supabase SDK ────────────────────

/**
 * Espera a que el SDK de Supabase esté disponible en `window.supabase`.
 * Realiza polling cada 100 ms hasta un máximo de reintentos.
 * Si se agotan, muestra un mensaje de error con botón para recargar la página.
 *
 * @param {Function} callback - Función a ejecutar cuando Supabase esté listo
 * @param {number} [retries=30] - Número máximo de reintentos (~3 segundos)
 * @returns {void}
 */
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

/**
 * Crea y devuelve una instancia del cliente de Supabase usando la configuración global.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient} Cliente de Supabase listo para consultas
 */
export function createClient() {
  return window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
}

// ─── UUID v4 (criptográfico) ──────────────────

/**
 * Genera un UUID v4 criptográficamente aleatorio usando la API `crypto.randomUUID()`.
 *
 * @returns {string} UUID en formato estándar `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
 */
export function generateUUID() {
  return crypto.randomUUID();
}

// ─── Device ID ────────────────────────────────

/**
 * App personal de un solo usuario.
 * Retorna siempre el mismo user_id para que cualquier dispositivo
 * vea los mismos datos. Sin login, sin localStorage, sin URL params.
 *
 * @returns {string} ID fijo del usuario
 */
export function getDeviceId() {
  return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
}

// ─── Ensure user exists ───────────────────────

/**
 * Asegura que exista un registro del usuario en la tabla `usuarios`.
 * Usa `upsert` con conflicto en `id` para evitar duplicados.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} id - ID del usuario (device ID)
 * @returns {Promise<void>}
 */
export async function ensureUser(supabase, id) {
  try {
    const { error } = await supabase.from('usuarios').upsert(
      { id, nombre: 'Jn' },
      { onConflict: 'id' }
    );
    if (error) console.warn('[CRIPTA] ensureUser:', error.message);
  } catch (e) {
    console.warn('[CRIPTA] ensureUser error:', e);
  }
}

// ─── DB Query Helpers ─────────────────────────

/**
 * Suma los valores de un campo numérico en un arreglo de objetos.
 * Función interna, no exportada.
 *
 * @param {Array<Object>} data - Arreglo de registros
 * @param {string} [field='monto'] - Nombre del campo a sumar
 * @returns {number} Suma total
 */
function safeSum(data, field = 'monto') {
  return (data || []).reduce((s, x) => s + (Number(x[field]) || 0), 0);
}

/**
 * Suma el campo `monto` de una tabla para un dispositivo y un rango de fechas.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {string} table - Nombre de la tabla en Supabase
 * @param {string} dateFrom - Fecha de inicio (YYYY-MM-DD)
 * @param {string} dateTo - Fecha de fin (YYYY-MM-DD)
 * @returns {Promise<number>} Suma total de montos, 0 si hay error
 */
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

/**
 * Suma los costos de gasolina (`costo`) para un dispositivo en un rango de fechas.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {string} dateFrom - Fecha de inicio (YYYY-MM-DD)
 * @param {string} dateTo - Fecha de fin (YYYY-MM-DD)
 * @returns {Promise<number>} Suma total de costos de gasolina, 0 si hay error
 */
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

/**
 * Calcula el promedio de kilómetros por litro (km/L) basado en los últimos 10 registros de gasolina.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<number>} Promedio de km/L, 0 si no hay datos suficientes
 */
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

/**
 * Cuenta los pasivos (deudas) activas no pagadas de un dispositivo.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<number>} Número de deudas con estado distinto a 'pagada'
 */
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

/**
 * Carga todos los datos necesarios para la vista del Dashboard:
 * ingresos/gastos/gasolina del día y del mes, inversiones del mes,
 * km/L promedio y cantidad de pasivos activos.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<{
 *   ingresosHoy: number,
 *   gastosHoy: number,
 *   gasolinaHoy: number,
 *   ingresosMes: number,
 *   gastosMes: number,
 *   totalInversiones: number,
 *   kml: number,
 *   pasivosCount: number,
 *   monthStart: string,
 *   today: string,
 *   monthEnd: number,
 *   dayOfMonth: number
 * }>} Objeto con todos los indicadores del dashboard
 */
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

/**
 * Carga el historial combinado de ingresos, gastos y gasolina (últimos N registros).
 * Los resultados se ordenan por fecha descendente y se limitan al número solicitado.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {number} [limit=20] - Cantidad máxima de registros a retornar
 * @returns {Promise<Array<{id: number, table: string, fecha: string, descripcion: string, categoria: string, monto: number, label: string, colorClass: string}>>} Arreglo de movimientos combinados
 */
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

/**
 * Obtiene todas las deudas (pasivos) de un dispositivo, ordenadas por estado y fecha límite.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<Array<Object>>} Arreglo de registros de deudas
 */
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

/**
 * Crea un nuevo pasivo (deuda) en la base de datos.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {Object} pasivo - Datos del pasivo
 * @param {string} pasivo.nombre - Nombre o descripción de la deuda
 * @param {number} pasivo.monto - Monto total adeudado
 * @param {number} [pasivo.interes=0] - Tasa de interés asociada
 * @param {string|null} [pasivo.fechaLimite=null] - Fecha límite de pago (YYYY-MM-DD)
 * @returns {Promise<boolean>} `true` si se creó correctamente
 * @throws {Error} Si ocurre un error en la inserción
 */
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

/**
 * Registra un pago parcial o total a un pasivo y actualiza su estado.
 * Si el monto pagado alcanza o supera el total, la deuda se marca como 'pagada'.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {number} pasivoId - ID del pasivo a pagar
 * @param {number} monto - Monto del pago
 * @returns {Promise<{estado: string, nuevoPagado: number, montoTotal: number}>} Estado actualizado, total pagado acumulado y monto total de la deuda
 * @throws {Error} Si ocurre algún error en el proceso
 */
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

/**
 * Marca un pasivo como completamente liberado (pagado), forzando el monto pagado al total.
 * Útil para cerrar deudas sin registrar pagos individuales.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {number} pasivoId - ID del pasivo a liberar
 * @param {number} montoTotal - Monto total a registrar como pagado
 * @returns {Promise<boolean>} `true` si se actualizó correctamente
 * @throws {Error} Si ocurre un error en la actualización
 */
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

/**
 * Elimina un pasivo y todos sus pagos asociados de la base de datos.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {number} pasivoId - ID del pasivo a eliminar
 * @returns {Promise<boolean>} `true` si se eliminó correctamente
 * @throws {Error} Si ocurre un error en la eliminación
 */
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

/**
 * Elimina un movimiento (ingreso, gasto o gasolina) por su ID y tabla.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {string} table - Nombre de la tabla ('ingresos', 'gastos' o 'gasolina')
 * @param {number} id - ID del registro a eliminar
 * @returns {Promise<boolean>} `true` si se eliminó correctamente
 * @throws {Error} Si ocurre un error en la eliminación
 */
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

/**
 * Obtiene todos los gastos categorizados como 'inversión' para un dispositivo,
 * ordenados por fecha descendente.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<Array<Object>>} Arreglo de inversiones
 */
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

/**
 * Calcula el total invertido durante el mes actual (gastos categoría 'inversion').
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<number>} Suma total de inversiones del mes, 0 si hay error
 */
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

/**
 * Obtiene los presupuestos activos del dispositivo, es decir, aquellos
 * cuya fecha actual está dentro del rango `fecha_inicio` — `fecha_fin`.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<Array<Object>>} Arreglo de presupuestos activos
 */
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

/**
 * Crea un nuevo presupuesto semanal para una categoría específica.
 * La duración del presupuesto es de 7 días a partir de la fecha actual.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {string} categoria - Categoría del presupuesto
 * @param {number} montoLimite - Monto límite del presupuesto
 * @returns {Promise<boolean>} `true` si se creó correctamente
 * @throws {Error} Si ocurre un error en la inserción
 */
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

/**
 * Actualiza el monto gastado de un presupuesto activo para una categoría específica.
 * Suma el monto proporcionado al valor actual de `monto_gastado`.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {string} categoria - Categoría del presupuesto a actualizar
 * @param {number} monto - Monto a agregar al gastado acumulado
 * @returns {Promise<void>}
 */
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

/**
 * Registra un nuevo movimiento financiero: ingreso, gasto, gasolina o inversión.
 * Según el tipo, inserta en la tabla correspondiente con los campos adecuados.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {'ingreso'|'gasto'|'gasolina'|'inversion'} tipo - Tipo de movimiento
 * @param {Object} datos - Datos del movimiento
 * @param {number} datos.monto - Monto del movimiento
 * @param {string} datos.descripcion - Descripción del movimiento
 * @param {string} [datos.categoria] - Categoría (no aplica para gasolina/inversión)
 * @param {number} [datos.litros=0] - Litros cargados (solo gasolina)
 * @param {number} [datos.km=0] - Kilómetros recorridos (solo gasolina)
 * @returns {Promise<boolean>} `true` si se registró correctamente
 * @throws {Error} Si ocurre un error en la inserción
 */
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

/**
 * Genera datos para el gráfico semanal de balance neto (ingresos - gastos - gasolina).
 * Calcula el balance para cada uno de los últimos 7 días.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<Array<{label: string, value: number}>>} Arreglo con el balance de cada día
 */
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

/**
 * Carga los datos necesarios para la vista de Meta y proyección financiera:
 * deudas activas, promedios de ingresos/gastos/gasolina de los últimos 30 días
 * y el promedio diario neto.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<{
 *   deudas: Array<Object>,
 *   promedioDiario: number,
 *   ingMes: number,
 *   gasMes: number,
 *   gasoMes: number
 * }>} Datos de meta y proyección
 */
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

/**
 * Calcula el promedio diario neto (ingresos - gastos - gasolina) de los últimos 30 días.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<number>} Promedio diario neto, 0 si hay error
 */
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

/**
 * Genera un resumen mensual completo con ingresos, gastos, gasolina,
 * pasivos, inversiones, promedio diario y proyección mensual estimada.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<{
 *   iMonto: number,
 *   gMonto: number,
 *   gasMonto: number,
 *   neto: number,
 *   pasivos: Array<Object>,
 *   totalPasivo: number,
 *   pctLibre: string,
 *   totalInv: number,
 *   diarioPromedio: number,
 *   proyeccionMensual: number,
 *   diasTranscurridos: number,
 *   diasMes: number
 * }|null>} Resumen mensual o `null` si hay error
 */
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

// ─── Movimientos del mes (lista detallada) ──

/**
 * Obtiene los movimientos del mes actual para un tipo específico (ingresos, gastos o gasolina).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {'ingresos'|'gastos'|'gasolina'} tipo - Tipo de movimiento a consultar
 * @returns {Promise<Array<{id: number, fecha: string, descripcion: string, monto: number, categoria: string}>>} Arreglo de movimientos del mes
 */
export async function loadMovimientosMes(supabase, deviceId, tipo) {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    let table, montoField;
    if (tipo === 'ingresos') { table = 'ingresos'; montoField = 'monto'; }
    else if (tipo === 'gastos') { table = 'gastos'; montoField = 'monto'; }
    else if (tipo === 'gasolina') { table = 'gasolina'; montoField = 'costo'; }
    else return [];

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', deviceId)
      .gte('fecha', monthStart)
      .lte('fecha', today)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      fecha: r.fecha,
      descripcion: r.descripcion || tipo,
      monto: Number(r[montoField]) || 0,
      categoria: r.categoria || ''
    }));
  } catch (e) {
    console.error('[CRIPTA] loadMovimientosMes error:', tipo, e);
    return [];
  }
}

// ─── Exportar CSV ─────────────────────────────

/**
 * Exporta todos los movimientos (ingresos, gastos, gasolina) a un archivo CSV
 * y lo descarga automáticamente. Incluye protección contra inyección CSV
 * prefijando fórmulas con tabulación.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<boolean>} `true` si la exportación se completó correctamente
 * @throws {Error} Si ocurre un error en la consulta o descarga
 */
export async function exportarCSV(supabase, deviceId) {
  try {
    const [ingRes, gasRes, gasoRes] = await Promise.all([
      supabase.from('ingresos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }),
      supabase.from('gastos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }),
      supabase.from('gasolina').select('*').eq('user_id', deviceId).order('fecha', { ascending: false })
    ]);

    const escCSV = (str) => {
      const s = (str || '').replace(/\"/g, '""');
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

// ─── Metas de Ahorro ───────────────────────────

/**
 * Obtiene todas las metas de ahorro del usuario.
 * @async
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} deviceId - ID del dispositivo
 * @returns {Promise<Array<{id: number, nombre: string, monto_objetivo: number, monto_ahorrado: number, fecha: string, completada: boolean}>>}
 */
export async function loadMetas(supabase, deviceId) {
  try {
    const { data } = await supabase
      .from('metas')
      .select('*')
      .eq('user_id', deviceId)
      .order('created_at', { ascending: false });
    return data || [];
  } catch (e) {
    console.error('[CRIPTA] loadMetas error:', e);
    return [];
  }
}

/**
 * Crea una nueva meta de ahorro.
 * @async
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {{nombre: string, monto_objetivo: number, fecha?: string}} meta - Datos de la meta
 * @returns {Promise<boolean>} true si se creó correctamente
 */
export async function crearMeta(supabase, deviceId, meta) {
  try {
    const { error } = await supabase.from('metas').insert({
      user_id: deviceId,
      nombre: meta.nombre || 'Meta',
      monto_objetivo: meta.monto_objetivo,
      fecha: meta.fecha || null,
      monto_ahorrado: 0,
      completada: false
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[CRIPTA] crearMeta error:', e);
    throw e;
  }
}

/**
 * Abona un monto a una meta de ahorro (incrementa monto_ahorrado).
 * @async
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {number} id - ID de la meta
 * @param {number} monto - Monto a abonar
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function abonarMeta(supabase, deviceId, id, monto) {
  try {
    // Obtener monto actual
    const { data } = await supabase
      .from('metas')
      .select('monto_ahorrado, monto_objetivo')
      .eq('id', id)
      .eq('user_id', deviceId)
      .single();

    if (!data) throw new Error('Meta no encontrada');

    const nuevoAhorrado = (data.monto_ahorrado || 0) + monto;
    const completada = nuevoAhorrado >= data.monto_objetivo;

    const { error } = await supabase
      .from('metas')
      .update({ monto_ahorrado: nuevoAhorrado, completada })
      .eq('id', id)
      .eq('user_id', deviceId);

    if (error) throw error;
    return completada;
  } catch (e) {
    console.error('[CRIPTA] abonarMeta error:', e);
    throw e;
  }
}

/**
 * Marca una meta como completada manualmente.
 * @async
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {number} id - ID de la meta
 * @returns {Promise<boolean>}
 */
export async function completarMeta(supabase, deviceId, id) {
  try {
    // Actualizar monto_ahorrado al objetivo y marcar completada
    const { data } = await supabase
      .from('metas')
      .select('monto_objetivo')
      .eq('id', id)
      .eq('user_id', deviceId)
      .single();

    if (!data) throw new Error('Meta no encontrada');

    const { error } = await supabase
      .from('metas')
      .update({ completada: true, monto_ahorrado: data.monto_objetivo })
      .eq('id', id)
      .eq('user_id', deviceId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[CRIPTA] completarMeta error:', e);
    throw e;
  }
}

/**
 * Elimina una meta de ahorro.
 * @async
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} deviceId - ID del dispositivo
 * @param {number} id - ID de la meta
 * @returns {Promise<boolean>}
 */
export async function eliminarMeta(supabase, deviceId, id) {
  try {
    const { error } = await supabase
      .from('metas')
      .delete()
      .eq('id', id)
      .eq('user_id', deviceId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[CRIPTA] eliminarMeta error:', e);
    throw e;
  }
}
