/**
 * CRIPTA — UI Module v4.0
 * Modales, Toast, Confirm dialog, sanitización y formateo de moneda.
 *
 * @module ui
 */

// ─── Sanitizar ───────────────────────────────

/**
 * Escapa caracteres HTML para prevenir XSS.
 * Convierte cualquier string en texto seguro usando `createTextNode`.
 *
 * @param {*} str - Valor a sanitizar (se convierte a string automáticamente)
 * @returns {string} Texto con caracteres HTML escapados, o cadena vacía si es null/undefined
 */
export function esc(str) {
  if (!str && str !== 0) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/**
 * Escapa un string para usar como valor en atributos HTML.
 * Además del escape básico de `esc()`, reemplaza comillas simples y dobles.
 *
 * @param {*} str - Valor a sanitizar para atributo HTML
 * @returns {string} Texto seguro para usar en atributos HTML
 */
export function escAttr(str) {
  return esc(str).replace(/'/g, '&#39;').replace(/\"/g, '&quot;');
}

// ─── Toast ────────────────────────────────────

/** @type {number|null} */
let toastTimer = null;

/**
 * Muestra un mensaje tipo toast (notificación emergente) que se oculta
 * automáticamente después de 3.5 segundos.
 *
 * @param {string} msg - Mensaje a mostrar
 * @param {'success'|'error'|'info'|'warning'} [type='success'] - Tipo de toast (determina el color)
 * @returns {void}
 */
export function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  if (toastTimer) clearTimeout(toastTimer);
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    toastTimer = null;
  }, 3500);
}

// ─── Modales ──────────────────────────────────

/**
 * Muestra un modal por su ID (cambia display a 'flex' y aria-hidden a 'false').
 *
 * @param {string} id - ID del elemento modal a mostrar
 * @returns {void}
 */
export function showModal(id) {
  const el = document.getElementById(id);
  if (!el) { return; }
  el.style.display = 'flex';
  el.setAttribute('aria-hidden', 'false');
}

/**
 * Oculta un modal por su ID (cambia display a 'none' y aria-hidden a 'true').
 *
 * @param {string} id - ID del elemento modal a ocultar
 * @returns {void}
 */
export function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

/**
 * Cierra todos los modales abiertos en la página.
 * Selecciona todos los elementos con la clase 'modal' y los oculta.
 *
 * @returns {void}
 */
export function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => {
    m.style.display = 'none';
    m.setAttribute('aria-hidden', 'true');
  });
}

// ─── Confirm Dialog ──────────────────────────

/**
 * Muestra un diálogo de confirmación personalizado que reemplaza el `confirm()` nativo.
 * Devuelve una Promesa que resuelve a `true` (aceptar) o `false` (cancelar).
 * Incluye soporte para tecla Escape y clic fuera del modal.
 * Si el modal `#confirm-overlay` no existe en el DOM, fallback a `window.confirm()`.
 *
 * @param {Object} options - Opciones del diálogo
 * @param {string} [options.title='Confirmar'] - Título del diálogo
 * @param {string} options.message - Mensaje de confirmación
 * @param {string} [options.confirmText='Sí'] - Texto del botón de confirmación
 * @param {string} [options.cancelText='Cancelar'] - Texto del botón de cancelación
 * @param {boolean} [options.danger=false] - Si es `true`, el botón de confirmar se muestra en rojo
 * @returns {Promise<boolean>} `true` si el usuario confirma, `false` en caso contrario
 */
export function showConfirm({ title = 'Confirmar', message, confirmText = 'Sí', cancelText = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-overlay');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const btnConfirm = document.getElementById('confirm-btn-yes');
    const btnCancel = document.getElementById('confirm-btn-no');

    if (!overlay) {
      // Fallback si el modal no existe en el DOM
      resolve(window.confirm(message || title));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message || '';
    btnConfirm.textContent = confirmText;
    btnCancel.textContent = cancelText;

    // Modo peligro (rojo)
    btnConfirm.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');

    // Limpiar listeners previos clonando
    const newConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);
    const newCancel = btnCancel.cloneNode(true);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    const cleanup = () => {
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
    };

    newConfirm.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    newCancel.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // Cerrar con Escape
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', keyHandler);
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Cerrar al hacer clic fuera del contenido
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    newConfirm.focus();
  });
}

// ─── Loading State ────────────────────────────

/**
 * Activa o desactiva el estado de carga en un botón.
 * Cuando está cargando, deshabilita el botón y cambia su texto.
 * Restaura el texto original al finalizar.
 *
 * @param {string} btnId - ID del botón a controlar
 * @param {boolean} loading - `true` para activar carga, `false` para restaurar
 * @param {string} [customText='Guardando...'] - Texto personalizado durante la carga
 * @returns {void}
 */
export function setLoading(btnId, loading, customText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = customText || 'Guardando...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}

// ─── Formateo de moneda ──────────────────────

/**
 * Formatea un número como moneda en soles peruanos con dos decimales.
 *
 * @param {number|string} val - Valor a formatear
 * @returns {string} Cadena formateada, ej: "S/ 150.00"
 */
export function formatSoles(val) {
  const num = Number(val) || 0;
  return 'S/ ' + num.toFixed(2);
}

/**
 * Formatea un número como moneda en soles peruanos sin decimales.
 *
 * @param {number|string} val - Valor a formatear
 * @returns {string} Cadena formateada, ej: "S/ 150"
 */
export function formatSolesInt(val) {
  const num = Number(val) || 0;
  return 'S/ ' + num.toFixed(0);
}
