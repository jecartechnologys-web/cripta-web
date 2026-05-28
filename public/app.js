// =============================================
// CRIPTA — App Logic
// =============================================

(function() {
  'use strict';

  // Wait for Supabase CDN to be available
  function waitForSupabase(callback, retries = 20) {
    if (window.supabase && window.supabase.createClient) {
      console.log('[CRIPTA] Supabase SDK ready');
      callback();
    } else if (retries > 0) {
      console.log('[CRIPTA] Waiting for Supabase SDK... (' + retries + ')');
      setTimeout(() => waitForSupabase(callback, retries - 1), 200);
    } else {
      console.error('[CRIPTA] Supabase SDK failed to load');
      document.getElementById('auth-error').textContent = 'Error: No se pudo cargar el servicio. Recarga la página.';
    }
  }

  waitForSupabase(initApp);

  function initApp() {
    // Config Supabase
    const SUPABASE_URL = 'https://myaazbpmhapnqoauqlri.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YWF6YnBtaGFwbnFvYXVxbHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NDA2MTMsImV4cCI6MjA5NTUxNjYxM30.2MWlrQiz6ClP7mkOxrCVQFB0JiWGxq0RUDpNqJ20umg';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Estado
    let currentUser = null;
    let currentType = 'ingreso';

    // =============================================
    // INIT
    // =============================================

    document.addEventListener('DOMContentLoaded', async () => {
      // Hide loading, show auth
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('auth-screen').classList.add('active');

      // Check session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          loginSuccess(session.user);
        }
      } catch (e) {
        console.error('[CRIPTA] Session check error:', e);
      }

      // Auth events
      document.getElementById('btn-login').addEventListener('click', handleLogin);
      document.getElementById('btn-register').addEventListener('click', handleRegister);
      document.getElementById('btn-logout').addEventListener('click', handleLogout);

      // Tab navigation
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
      });

      // Type selector
      document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => selectType(btn.dataset.type));
      });

      // Forms
      document.getElementById('form-movimiento').addEventListener('submit', handleMovimiento);
      document.getElementById('form-deuda').addEventListener('submit', handleDeuda);
      document.getElementById('form-presupuesto').addEventListener('submit', handlePresupuesto);

      // Modal buttons
      document.getElementById('btn-nueva-deuda').addEventListener('click', () => showModal('modal-deuda'));
      document.getElementById('btn-cancelar-deuda').addEventListener('click', () => hideModal('modal-deuda'));
      document.getElementById('btn-cancelar-proyectar').addEventListener('click', () => hideModal('modal-proyectar'));
      document.getElementById('btn-cancelar-simular').addEventListener('click', () => hideModal('modal-simular'));
      document.getElementById('btn-cancelar-presupuesto').addEventListener('click', () => hideModal('modal-presupuesto'));
      document.getElementById('btn-cerrar-meta').addEventListener('click', () => hideModal('modal-meta'));
      document.getElementById('btn-cerrar-salida').addEventListener('click', () => hideModal('modal-salida'));

      // Tools
      document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => handleTool(btn.dataset.tool));
      });

      // Tool actions
      document.getElementById('btn-proyectar').addEventListener('click', handleProyectar);
      document.getElementById('btn-simular').addEventListener('click', handleSimular);

      console.log('[CRIPTA] App initialized');
    });

    // =============================================
    // AUTH
    // =============================================

    async function handleLogin() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const errorEl = document.getElementById('auth-error');

      if (!email || !password) {
        errorEl.textContent = 'Ingresa email y contraseña';
        return;
      }

      errorEl.textContent = '';

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          errorEl.textContent = error.message;
          return;
        }
        loginSuccess(data.user);
      } catch (e) {
        console.error('[CRIPTA] Login error:', e);
        errorEl.textContent = 'Error de conexión. Intenta de nuevo.';
      }
    }

    async function handleRegister() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const errorEl = document.getElementById('auth-error');

      if (!email || !password) {
        errorEl.textContent = 'Ingresa email y contraseña';
        return;
      }

      if (password.length < 6) {
        errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
        return;
      }

      errorEl.textContent = '';

      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          errorEl.textContent = error.message;
          return;
        }

        // Create user profile
        if (data.user) {
          await supabase.from('usuarios').insert({ id: data.user.id, nombre: email.split('@')[0] });
        }

        toast('Cuenta creada. Revisa tu email para confirmar.', 'success');
      } catch (e) {
        console.error('[CRIPTA] Register error:', e);
        errorEl.textContent = 'Error de conexión. Intenta de nuevo.';
      }
    }

    async function handleLogout() {
      await supabase.auth.signOut();
      currentUser = null;
      document.getElementById('auth-screen').classList.add('active');
      document.getElementById('app-screen').classList.remove('active');
    }

    function loginSuccess(user) {
      currentUser = user;
      document.getElementById('auth-screen').classList.remove('active');
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('app-screen').classList.add('active');
      document.getElementById('user-email').textContent = user.email;
      loadDashboard();
    }

    // =============================================
    // TABS
    // =============================================

    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab[data-tab="' + tabName + '"]').classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      document.getElementById('tab-' + tabName).classList.add('active');

      if (tabName === 'dashboard') loadDashboard();
      if (tabName === 'deudas') loadDeudas();
    }

    // =============================================
    // TYPE SELECTOR
    // =============================================

    function selectType(type) {
      currentType = type;
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.type-btn[data-type="' + type + '"]').classList.add('active');

      var showLitros = type === 'gasolina';
      document.getElementById('campo-litros').style.display = showLitros ? 'block' : 'none';
      document.getElementById('campo-km').style.display = showLitros ? 'block' : 'none';
    }

    // =============================================
    // MOVIMIENTOS
    // =============================================

    async function handleMovimiento(e) {
      e.preventDefault();

      var monto = parseFloat(document.getElementById('input-monto').value);
      var descripcion = document.getElementById('input-descripcion').value;
      var categoria = document.getElementById('input-categoria').value;

      if (isNaN(monto) || monto <= 0) {
        toast('Ingresa un monto válido', 'error');
        return;
      }

      var data = { user_id: currentUser.id, monto: monto, descripcion: descripcion, categoria: categoria };

      try {
        if (currentType === 'gasolina') {
          data.litros = parseFloat(document.getElementById('input-litros').value) || 0;
          data.km_recorridos = parseFloat(document.getElementById('input-km').value) || 0;
          var { error } = await supabase.from('gasolina').insert(data);
          if (error) { toast('Error: ' + error.message, 'error'); return; }
        } else {
          var table = currentType === 'ingreso' ? 'ingresos' : 'gastos';
          var { error } = await supabase.from(table).insert(data);
          if (error) { toast('Error: ' + error.message, 'error'); return; }
        }

        toast(currentType.charAt(0).toUpperCase() + currentType.slice(1) + ' registrado: S/ ' + monto.toFixed(2), 'success');
        document.getElementById('form-movimiento').reset();
        selectType('ingreso');
        loadDashboard();
      } catch (e) {
        console.error('[CRIPTA] Movimiento error:', e);
        toast('Error de conexión', 'error');
      }
    }

    // =============================================
    // DASHBOARD
    // =============================================

    async function loadDashboard() {
      if (!currentUser) return;

      var today = new Date().toISOString().split('T')[0];
      var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      try {
        // Neto del día
        var [ingresosHoy, gastosHoy, gasolinaHoy] = await Promise.all([
          sumTable('ingresos', today, today),
          sumTable('gastos', today, today),
          sumGasolina(today, today)
        ]);

        var neto = ingresosHoy - gastosHoy - gasolinaHoy;
        var netoEl = document.getElementById('neto-hoy');
        netoEl.textContent = 'S/ ' + neto.toFixed(2);
        netoEl.className = 'big-number ' + (neto >= 0 ? 'positive' : 'negative');

        document.getElementById('neto-ingresos').textContent = 'S/ ' + ingresosHoy.toFixed(2);
        document.getElementById('neto-gastos').textContent = 'S/ ' + gastosHoy.toFixed(2);
        document.getElementById('neto-gasolina').textContent = 'S/ ' + gasolinaHoy.toFixed(2);

        // Stats del mes
        var [ingresosMes, gastosMes] = await Promise.all([
          sumTable('ingresos', monthStart, today),
          sumTable('gastos', monthStart, today)
        ]);

        document.getElementById('stat-ingresos-mes').textContent = 'S/ ' + ingresosMes.toFixed(0);
        document.getElementById('stat-gastos-mes').textContent = 'S/ ' + gastosMes.toFixed(0);

        // km/L
        var kml = await getKmL();
        document.getElementById('stat-km-l').textContent = kml + ' km/L';

        // Deudas
        var { count } = await supabase.from('deudas').select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id).eq('estado', 'activa');
        document.getElementById('stat-deudas-rest').textContent = count || 0;

        // Historial
        await loadHistorial();
      } catch (e) {
        console.error('[CRIPTA] Dashboard error:', e);
      }
    }

    async function sumTable(table, from, to) {
      var { data } = await supabase.from(table).select('monto')
        .eq('user_id', currentUser.id)
        .gte('fecha', from).lte('fecha', to);
      return (data || []).reduce(function(sum, r) { return sum + r.monto; }, 0);
    }

    async function sumGasolina(from, to) {
      var { data } = await supabase.from('gasolina').select('costo')
        .eq('user_id', currentUser.id)
        .gte('fecha', from).lte('fecha', to);
      return (data || []).reduce(function(sum, r) { return sum + r.costo; }, 0);
    }

    async function getKmL() {
      var { data } = await supabase.from('gasolina').select('km_recorridos, litros')
        .eq('user_id', currentUser.id);
      if (!data || data.length === 0) return '0';
      var totalKm = data.reduce(function(s, r) { return s + (r.km_recorridos || 0); }, 0);
      var totalL = data.reduce(function(s, r) { return s + (r.litros || 0); }, 0);
      return totalL > 0 ? (totalKm / totalL).toFixed(1) : '0';
    }

    async function loadHistorial() {
      var list = document.getElementById('historial-list');
      var [ingresos, gastos, gasolina] = await Promise.all([
        supabase.from('ingresos').select('*').eq('user_id', currentUser.id).order('fecha', { ascending: false }).limit(10),
        supabase.from('gastos').select('*').eq('user_id', currentUser.id).order('fecha', { ascending: false }).limit(10),
        supabase.from('gasolina').select('*').eq('user_id', currentUser.id).order('fecha', { ascending: false }).limit(10)
      ]);

      var all = [
        ...(ingresos.data || []).map(function(r) { return Object.assign({}, r, { tipo: 'ingreso' }); }),
        ...(gastos.data || []).map(function(r) { return Object.assign({}, r, { tipo: 'gasto' }); }),
        ...(gasolina.data || []).map(function(r) { return Object.assign({}, r, { tipo: 'gasolina', monto: r.costo }); })
      ].sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); }).slice(0, 15);

      if (all.length === 0) {
        list.innerHTML = '<div class="list-empty">Sin movimientos hoy</div>';
        return;
      }

      list.innerHTML = all.map(function(m) {
        return '<div class="list-item">' +
          '<div class="list-item-left">' +
            '<span class="list-item-desc">' + (m.descripcion || m.tipo) + '</span>' +
            '<span class="list-item-date">' + m.fecha + ' · ' + (m.categoria || '') + '</span>' +
          '</div>' +
          '<div class="list-item-right ' + (m.tipo === 'ingreso' ? 'ingreso' : 'gasto') + '">' +
            (m.tipo === 'ingreso' ? '+' : '-') + ' S/ ' + m.monto.toFixed(2) +
          '</div>' +
        '</div>';
      }).join('');
    }

    // =============================================
    // DEUDAS
    // =============================================

    async function loadDeudas() {
      if (!currentUser) return;

      var { data: deudas } = await supabase.from('deudas').select('*')
        .eq('user_id', currentUser.id).order('created_at', { ascending: false });

      var list = document.getElementById('deudas-list');

      if (!deudas || deudas.length === 0) {
        list.innerHTML = '<div class="list-empty">Sin deudas registradas 🎉</div>';
        document.getElementById('proximos-list').innerHTML = '';
        return;
      }

      list.innerHTML = deudas.map(function(d) {
        var pct = d.monto_total > 0 ? ((d.monto_pagado / d.monto_total) * 100).toFixed(0) : 0;
        var restante = d.monto_total - d.monto_pagado;
        return '<div class="deuda-card">' +
          '<div class="deuda-header">' +
            '<span class="deuda-nombre">' + d.nombre + '</span>' +
            '<span class="deuda-monto">S/ ' + restante.toFixed(2) + '</span>' +
          '</div>' +
          '<div class="deuda-progress">' +
            '<div class="deuda-progress-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<div class="deuda-footer">' +
            '<span>Pagado: ' + pct + '%</span>' +
            '<span>Total: S/ ' + d.monto_total.toFixed(2) + '</span>' +
          '</div>' +
          (d.fecha_limite ? '<div class="deuda-footer" style="margin-top:4px;"><span>Vence: ' + d.fecha_limite + '</span></div>' : '') +
          '<div class="deuda-actions">' +
            '<button class="btn btn-primary btn-sm" onclick="window._app.pagarDeuda(' + d.id + ', ' + restante + ')">Pagar</button>' +
            (d.estado === 'activa' ? '<button class="btn btn-secondary btn-sm" onclick="window._app.marcarPagada(' + d.id + ')">Marcar pagada</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      // Próximos pagos
      var proximos = deudas.filter(function(d) { return d.estado === 'activa' && d.fecha_limite; })
        .sort(function(a, b) { return new Date(a.fecha_limite) - new Date(b.fecha_limite); });
      var proximosList = document.getElementById('proximos-list');

      if (proximos.length === 0) {
        proximosList.innerHTML = '<div class="list-empty">Sin pagos próximos</div>';
      } else {
        proximosList.innerHTML = proximos.map(function(d) {
          return '<div class="list-item">' +
            '<div class="list-item-left">' +
              '<span class="list-item-desc">' + d.nombre + '</span>' +
              '<span class="list-item-date">Vence: ' + d.fecha_limite + '</span>' +
            '</div>' +
            '<div class="list-item-right deuda">S/ ' + (d.monto_total - d.monto_pagado).toFixed(2) + '</div>' +
          '</div>';
        }).join('');
      }
    }

    async function handleDeuda(e) {
      e.preventDefault();
      var nombre = document.getElementById('deuda-nombre').value;
      var monto = parseFloat(document.getElementById('deuda-monto').value);
      var interes = parseFloat(document.getElementById('deuda-interes').value) || 0;
      var fecha = document.getElementById('deuda-fecha').value || null;

      if (!nombre || isNaN(monto) || monto <= 0) {
        toast('Completa nombre y monto', 'error');
        return;
      }

      try {
        var { error } = await supabase.from('deudas').insert({
          user_id: currentUser.id,
          nombre: nombre,
          monto_total: monto,
          tasa_interes: interes,
          fecha_limite: fecha
        });

        if (error) { toast('Error: ' + error.message, 'error'); return; }

        toast('Deuda registrada', 'success');
        hideModal('modal-deuda');
        document.getElementById('form-deuda').reset();
        loadDeudas();
      } catch (e) {
        console.error('[CRIPTA] Deuda error:', e);
        toast('Error de conexión', 'error');
      }
    }

    async function pagarDeuda(deudaId, restante) {
      var monto = prompt('Monto a pagar (restante: S/ ' + restante.toFixed(2) + '):');
      if (!monto) return;

      var montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0) { toast('Monto inválido', 'error'); return; }

      try {
        await supabase.from('pagos_deuda').insert({ deuda_id: deudaId, monto: montoNum });

        var { data: deuda } = await supabase.from('deudas').select('monto_pagado, monto_total').eq('id', deudaId).single();
        var nuevoPagado = (deuda.monto_pagado || 0) + montoNum;
        var estado = nuevoPagado >= deuda.monto_total ? 'pagada' : 'activa';

        await supabase.from('deudas').update({ monto_pagado: nuevoPagado, estado: estado }).eq('id', deudaId);

        toast('Pago registrado: S/ ' + montoNum.toFixed(2), 'success');
        loadDeudas();
        loadDashboard();
      } catch (e) {
        console.error('[CRIPTA] Pago error:', e);
        toast('Error de conexión', 'error');
      }
    }

    async function marcarPagada(deudaId) {
      if (!confirm('¿Marcar como pagada?')) return;
      try {
        var { data: deuda } = await supabase.from('deudas').select('monto_total').eq('id', deudaId).single();
        await supabase.from('deudas').update({ monto_pagado: deuda.monto_total, estado: 'pagada' }).eq('id', deudaId);
        toast('Deuda marcada como pagada', 'success');
        loadDeudas();
        loadDashboard();
      } catch (e) {
        console.error('[CRIPTA] Marcar pagada error:', e);
        toast('Error de conexión', 'error');
      }
    }

    // =============================================
    // TOOLS
    // =============================================

    async function handleTool(tool) {
      switch (tool) {
        case 'meta': await showMeta(); break;
        case 'proyectar': showModal('modal-proyectar'); break;
        case 'simular': showModal('modal-simular'); break;
        case 'salida': await showSalida(); break;
        case 'exportar': await exportarCSV(); break;
        case 'presupuesto': await showPresupuesto(); break;
      }
    }

    async function showMeta() {
      var { data: deudas } = await supabase.from('deudas').select('*')
        .eq('user_id', currentUser.id).eq('estado', 'activa');

      if (!deudas || deudas.length === 0) {
        document.getElementById('meta-resultado').innerHTML = '<p>No tienes deudas activas. ¡Sigue así! 🎉</p>';
        showModal('modal-meta');
        return;
      }

      var hoy = new Date();
      var totalDeuda = 0;
      var diasRestantes = Infinity;

      deudas.forEach(function(d) {
        var restante = d.monto_total - d.monto_pagado;
        totalDeuda += restante;
        if (d.fecha_limite) {
          var dias = Math.ceil((new Date(d.fecha_limite) - hoy) / (1000 * 60 * 60 * 24));
          if (dias > 0 && dias < diasRestantes) diasRestantes = dias;
        }
      });

      if (diasRestantes === Infinity) diasRestantes = 30;
      var metaDiaria = totalDeuda / diasRestantes;

      document.getElementById('meta-resultado').innerHTML =
        '<div style="text-align:center; padding: 20px 0;">' +
          '<div style="font-size:14px; color:var(--text-dim);">Debes</div>' +
          '<div style="font-size:28px; font-weight:700; color:var(--deuda);">S/ ' + totalDeuda.toFixed(2) + '</div>' +
          '<div style="font-size:14px; color:var(--text-dim); margin:12px 0;">en ' + diasRestantes + ' días</div>' +
          '<div style="font-size:14px; color:var(--text-dim);">Necesitas ganar diario</div>' +
          '<div style="font-size:36px; font-weight:700; color:var(--ingreso);">S/ ' + metaDiaria.toFixed(2) + '</div>' +
        '</div>';
      showModal('modal-meta');
    }

    async function handleProyectar() {
      var dias = parseInt(document.getElementById('proyectar-dias').value) || 7;
      var today = new Date().toISOString().split('T')[0];
      var monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      var [ingresos, gastos, gasolina] = await Promise.all([
        sumTable('ingresos', monthAgo, today),
        sumTable('gastos', monthAgo, today),
        sumGasolina(monthAgo, today)
      ]);

      var promedioDiario = (ingresos - gastos - gasolina) / 30;
      var proyeccion = promedioDiario * dias;

      document.getElementById('proyectar-resultado').innerHTML =
        '<div style="text-align:center; padding:16px 0;">' +
          '<div style="color:var(--text-dim); font-size:14px;">Promedio diario (30 días)</div>' +
          '<div style="font-size:24px; font-weight:700; margin:8px 0;">S/ ' + promedioDiario.toFixed(2) + '</div>' +
          '<div style="color:var(--text-dim); font-size:14px;">En ' + dias + ' días tendrás</div>' +
          '<div style="font-size:32px; font-weight:700; color:' + (proyeccion >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';">' +
            'S/ ' + proyeccion.toFixed(2) +
          '</div>' +
        '</div>';
    }

    async function handleSimular() {
      var ingresoExtra = parseFloat(document.getElementById('simular-ingreso').value) || 0;
      var gastoExtra = parseFloat(document.getElementById('simular-gasto').value) || 0;

      var today = new Date().toISOString().split('T')[0];
      var monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      var [ingresos, gastos, gasolina] = await Promise.all([
        sumTable('ingresos', monthAgo, today),
        sumTable('gastos', monthAgo, today),
        sumGasolina(monthAgo, today)
      ]);

      var actual = ingresos - gastos - gasolina;
      var simulado = actual + ingresoExtra - gastoExtra;
      var diff = simulado - actual;

      document.getElementById('simular-resultado').innerHTML =
        '<div style="text-align:center; padding:16px 0;">' +
          '<div style="color:var(--text-dim); font-size:14px;">Situación actual (30 días)</div>' +
          '<div style="font-size:24px; font-weight:700; margin:8px 0;">S/ ' + actual.toFixed(2) + '</div>' +
          '<div style="color:var(--text-dim); font-size:14px;">Con el escenario simulado</div>' +
          '<div style="font-size:28px; font-weight:700; color:' + (simulado >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';">' +
            'S/ ' + simulado.toFixed(2) +
          '</div>' +
          '<div style="font-size:14px; color:' + (diff >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + '; margin-top:8px;">' +
            (diff >= 0 ? '📈' : '📉') + ' ' + (diff >= 0 ? '+' : '') + 'S/ ' + diff.toFixed(2) +
          '</div>' +
        '</div>';
    }

    async function showSalida() {
      var { data: deudas } = await supabase.from('deudas').select('*')
        .eq('user_id', currentUser.id).eq('estado', 'activa');

      if (!deudas || deudas.length === 0) {
        document.getElementById('salida-resultado').innerHTML = '<p style="text-align:center;">¡No tienes deudas! 🎉</p>';
        showModal('modal-salida');
        return;
      }

      var totalDeuda = 0;
      var pagos = [];
      deudas.forEach(function(d) {
        var restante = d.monto_total - d.monto_pagado;
        totalDeuda += restante;
        pagos.push({ nombre: d.nombre, restante: restante, tasa: d.tasa_interes, fecha: d.fecha_limite });
      });

      pagos.sort(function(a, b) { return b.tasa - a.tasa; });

      var plan = pagos.map(function(p, i) {
        var line = (i + 1) + '. ' + p.nombre + ': S/ ' + p.restante.toFixed(2);
        var extra = p.tasa > 0 ? ' (' + p.tasa + '% interés)' : '';
        var fecha = p.fecha ? ' → vence ' + p.fecha : '';
        return line + extra + fecha;
      }).join('\n');

      document.getElementById('salida-resultado').innerHTML =
        '<div style="padding:16px 0;">' +
          '<p style="color:var(--text-dim);">Tu plan de salida:</p>' +
          '<div style="font-size:28px; font-weight:700; color:var(--deuda); text-align:center; margin:12px 0;">' +
            'S/ ' + totalDeuda.toFixed(2) +
          '</div>' +
          '<p style="color:var(--text-dim); margin-bottom:8px;">Prioridad por tasa de interés:</p>' +
          '<pre style="font-family:monospace; font-size:14px; line-height:1.8;">' + plan + '</pre>' +
          '<div style="margin-top:16px; padding:12px; background:var(--bg-input); border-radius:8px; font-size:13px; color:var(--text-dim);">' +
            '💡 Estrategia: Paga primero la deuda con mayor interés. Mientras tanto, mantén gastos fijos al mínimo.' +
          '</div>' +
        '</div>';
      showModal('modal-salida');
    }

    async function exportarCSV() {
      var [ingresos, gastos, gasolina] = await Promise.all([
        supabase.from('ingresos').select('*').eq('user_id', currentUser.id).order('fecha', { ascending: false }),
        supabase.from('gastos').select('*').eq('user_id', currentUser.id).order('fecha', { ascending: false }),
        supabase.from('gasolina').select('*').eq('user_id', currentUser.id).order('fecha', { ascending: false })
      ]);

      var csv = 'Fecha,Tipo,Descripcion,Categoria,Monto\n';

      (ingresos.data || []).forEach(function(r) {
        csv += r.fecha + ',Ingreso,"' + (r.descripcion || '') + '",' + (r.categoria || '') + ',' + r.monto + '\n';
      });
      (gastos.data || []).forEach(function(r) {
        csv += r.fecha + ',Gasto,"' + (r.descripcion || '') + '",' + (r.categoria || '') + ',' + r.monto + '\n';
      });
      (gasolina.data || []).forEach(function(r) {
        csv += r.fecha + ',Gasolina,"' + (r.descripcion || '') + '",gasolina,' + r.costo + '\n';
      });

      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'cripta_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
      URL.revokeObjectURL(url);

      toast('CSV descargado', 'success');
    }

    async function showPresupuesto() {
      var today = new Date().toISOString().split('T')[0];
      var { data } = await supabase.from('presupuestos').select('*')
        .eq('user_id', currentUser.id)
        .lte('fecha_inicio', today)
        .gte('fecha_fin', today);

      var container = document.getElementById('presupuestos-activos');
      if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dim); font-size:14px;">Sin presupuestos activos esta semana</p>';
      } else {
        container.innerHTML = '<h4 style="font-size:14px; color:var(--text-dim); margin-bottom:8px;">Activos esta semana:</h4>' +
          data.map(function(p) {
            var pct = p.monto_limite > 0 ? ((p.monto_gastado / p.monto_limite) * 100).toFixed(0) : 0;
            return '<div style="padding:8px; background:var(--bg-input); border-radius:8px; margin-bottom:8px;">' +
              '<div style="display:flex; justify-content:space-between;">' +
                '<span>' + p.categoria + '</span>' +
                '<span>' + pct + '% usado</span>' +
              '</div>' +
              '<div style="font-size:13px; color:var(--text-dim);">' +
                'S/ ' + p.monto_gastado.toFixed(2) + ' / S/ ' + p.monto_limite.toFixed(2) +
              '</div>' +
            '</div>';
          }).join('');
      }

      showModal('modal-presupuesto');
    }

    async function handlePresupuesto(e) {
      e.preventDefault();
      var categoria = document.getElementById('presupuesto-categoria').value;
      var monto = parseFloat(document.getElementById('presupuesto-monto').value);
      var hoy = new Date();
      var fin = new Date(hoy);
      fin.setDate(fin.getDate() + 7);

      if (isNaN(monto) || monto <= 0) {
        toast('Ingresa un monto válido', 'error');
        return;
      }

      var { error } = await supabase.from('presupuestos').insert({
        user_id: currentUser.id,
        categoria: categoria,
        monto_limite: monto,
        fecha_inicio: hoy.toISOString().split('T')[0],
        fecha_fin: fin.toISOString().split('T')[0]
      });

      if (error) { toast('Error: ' + error.message, 'error'); return; }

      toast('Presupuesto creado', 'success');
      hideModal('modal-presupuesto');
      document.getElementById('form-presupuesto').reset();
      showPresupuesto();
    }

    // =============================================
    // UTILS
    // =============================================

    function showModal(id) {
      document.getElementById(id).style.display = 'flex';
    }

    function hideModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    function toast(msg, type) {
      type = type || 'success';
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast ' + type + ' show';
      setTimeout(function() { t.classList.remove('show'); }, 3000);
    }

    // Expose functions for onclick handlers
    window._app = {
      pagarDeuda: pagarDeuda,
      marcarPagada: marcarPagada
    };
  }
})();
