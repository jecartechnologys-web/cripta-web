/**
 * CRIPTA — UI Module v4.0
 * Modales, Toast, Confirm dialog, sanitización.
 */

// ─── Sanitizar ───────────────────────────────
export function esc(str) {
  if (!str && str !== 0) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

export function escAttr(str) {
  return esc(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ─── Toast ────────────────────────────────────
let toastTimer = null;

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
export function showModal(id) {
  const el = document.getElementById(id);
  if (!el) { return; }
  el.style.display = 'flex';
  el.setAttribute('aria-hidden', 'false');
}

export function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

export function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => {
    m.style.display = 'none';
    m.setAttribute('aria-hidden', 'true');
  });
}

// ─── Confirm Dialog ──────────────────────────
// Reemplaza confirm() nativo con modal custom.
// Devuelve Promise<boolean>.
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
export function formatSoles(val) {
  const num = Number(val) || 0;
  return 'S/ ' + num.toFixed(2);
}

export function formatSolesInt(val) {
  const num = Number(val) || 0;
  return 'S/ ' + num.toFixed(0);
}
