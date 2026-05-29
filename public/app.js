/**
 * CRIPTA — Tu Consola Financiera
 * v3.0 — Pasivos, Inversiones, Vibra Positiva
 */
(function() {
  'use strict';

  // =============================================
  // CONFIG
  // =============================================
  var SUPABASE_URL = 'https://myaazbpmhapnqoauqlri.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YWF6YnBtaGFwbnFvYXVxbHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNTc0ODksImV4cCI6MjA1MDkzMzQ4OX0.6V3D8tGc6-_k6v6Lq1ULS5nBvAoEOSOcKFNxFUG0umg';
  var DEVICE_ID_KEY = 'cripta_device_id';

  // =============================================
  // UUID — generador de UUID v4 para user_id
  // =============================================
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // =============================================
  // SANITIZE — previene XSS
  // =============================================
  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escAttr(str) {
    return esc(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // =============================================
  // DEVICE ID — identificador anónimo local
  // =============================================
  function getDeviceId() {
    var urlParams = new URLSearchParams(window.location.search);
    var urlId = urlParams.get('device_id');
    if (urlId && urlId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      localStorage.setItem(DEVICE_ID_KEY, urlId);
      window.history.replaceState({}, document.title, window.location.pathname);
      return urlId;
    }
    var id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      id = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  // =============================================
  // ENSURE USER — upsert en tabla usuarios
  // =============================================
  async function ensureUser(supabase, id) {
    try {
      await supabase.from('usuarios').upsert(
        { id: id, nombre: 'device_' + id.substr(0, 8) },
        { onConflict: 'id' }
      );
    } catch (e) {}
  }

  // =============================================
  // WAIT FOR SUPABASE SDK
  // =============================================
  function waitForSupabase(callback, retries) {
    retries = retries || 30;
    if (window.supabase && window.supabase.createClient) {
      callback();
    } else if (retries > 0) {
      setTimeout(function() { waitForSupabase(callback, retries - 1); }, 100);
    } else {
      document.body.innerHTML = '<div style="text-align:center;padding:60px;color:#ff6b6b;">Error: No se pudo cargar Supabase. Recarga la página.</div>';
    }
  }

  waitForSupabase(initApp);

  // =============================================
  // MAIN
  // =============================================
  function initApp() {
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    var deviceId = getDeviceId();
    var currentType = 'ingreso';
    var pasivoPagarId = null;
    var pasivoPagarRestante = 0;

    ensureUser(supabase, deviceId);

    // =============================================
    // INIT DOM
    // =============================================
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('app-screen').classList.add('active');

      // Tabs
      var tabs = document.querySelectorAll('.tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() { switchTab(this.dataset.tab); });
      }

      // Type selector (ahora con 4 tipos: ingreso, gasto, inversion, gasolina)
      var typeBtns = document.querySelectorAll('.type-btn');
      for (var i = 0; i < typeBtns.length; i++) {
        typeBtns[i].addEventListener('click', function() { selectType(this.dataset.type); });
      }

      // Forms
      document.getElementById('form-movimiento').addEventListener('submit', handleMovimiento);
      document.getElementById('form-pasivo').addEventListener('submit', handlePasivo);
      document.getElementById('form-presupuesto').addEventListener('submit', handlePresupuesto);

      // Modal buttons — Pasivos
      document.getElementById('btn-nuevo-pasivo').addEventListener('click', function() { showModal('modal-pasivo'); });
      document.getElementById('btn-cancelar-pasivo').addEventListener('click', function() { hideModal('modal-pasivo'); });
      document.getElementById('btn-cerrar-detalle').addEventListener('click', function() { hideModal('modal-detalle-pasivo'); });
      document.getElementById('btn-cancelar-proyectar').addEventListener('click', function() { hideModal('modal-proyectar'); });
      document.getElementById('btn-cancelar-simular').addEventListener('click', function() { hideModal('modal-simular'); });
      document.getElementById('btn-cancelar-presupuesto').addEventListener('click', function() { hideModal('modal-presupuesto'); });
      document.getElementById('btn-cerrar-meta').addEventListener('click', function() { hideModal('modal-meta'); });
      document.getElementById('btn-cerrar-salida').addEventListener('click', function() { hideModal('modal-salida'); });
      document.getElementById('btn-cerrar-resumen').addEventListener('click', function() { hideModal('modal-resumen'); });
      document.getElementById('btn-cancelar-pago').addEventListener('click', function() { hideModal('modal-pago'); });
      document.getElementById('btn-confirmar-pago').addEventListener('click', confirmarPago);

      // Tools
      var toolBtns = document.querySelectorAll('.tool-btn');
      for (var i = 0; i < toolBtns.length; i++) {
        toolBtns[i].addEventListener('click', function() { handleTool(this.dataset.tool); });
      }

      // Tool actions
      document.getElementById('btn-proyectar').addEventListener('click', handleProyectar);
      document.getElementById('btn-simular').addEventListener('click', handleSimular);

      // Stat cards — click para detalle contextual
      var statCards = document.querySelectorAll('.stat-card');
      for (var i = 0; i < statCards.length; i++) {
        statCards[i].addEventListener('click', function() {
          var stat = this.dataset.stat;
          if (stat === 'pasivos') showMeta();
          else if (stat === 'inversiones') { switchTab('inversiones'); }
          else if (stat === 'ingresos') showResumen();
          else if (stat === 'gastos') showResumen();
        });
      }

      // Load data
      loadDashboard();
    });

    // =============================================
    // TABS
    // =============================================
    function switchTab(tabName) {
      var tabs = document.querySelectorAll('.tab');
      for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
      document.querySelector('.tab[data-tab="' + tabName + '"]').classList.add('active');

      var contents = document.querySelectorAll('.tab-content');
      for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
      document.getElementById('tab-' + tabName).classList.add('active');

      if (tabName === 'dashboard') loadDashboard();
      if (tabName === 'pasivos') loadPasivos();
      if (tabName === 'inversiones') loadInversiones();
    }

    // =============================================
    // TYPE SELECTOR
    // =============================================
    function selectType(type) {
      currentType = type;
      var btns = document.querySelectorAll('.type-btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
      document.querySelector('.type-btn[data-type="' + type + '"]').classList.add('active');

      var show = type === 'gasolina';
      document.getElementById('campo-litros').style.display = show ? 'block' : 'none';
      document.getElementById('campo-km').style.display = show ? 'block' : 'none';
    }

    // =============================================
    // LOADING STATE
    // =============================================
    function setLoading(btnId, loading) {
      var btn = document.getElementById(btnId);
      if (!btn) return;
      if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = 'Guardando...';
      } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || btn.textContent;
      }
    }

    // =============================================
    // MOVIMIENTOS
    // =============================================
    async function handleMovimiento(e) {
      e.preventDefault();
      setLoading('btn-movimiento', true);

      var monto = parseFloat(document.getElementById('input-monto').value);
      var descripcion = document.getElementById('input-descripcion').value.trim();
      var categoria = document.getElementById('input-categoria').value;

      if (isNaN(monto) || monto <= 0 || monto > 999999) {
        toast('Monto inválido (1 - 999,999)', 'error');
        setLoading('btn-movimiento', false);
        return;
      }

      try {
        if (currentType === 'inversion') {
          // Inversión fija mensual — se guarda en gastos con categoria=inversion
          var { error } = await supabase.from('gastos').insert({
            user_id: deviceId, monto: monto, descripcion: descripcion, categoria: 'inversion'
          });
          if (error) { toast('Error: ' + error.message, 'error'); return; }
          toast('🌱 Inversión registrada: S/ ' + monto.toFixed(2), 'success');
        } else if (currentType === 'gasolina') {
          var data = {
            user_id: deviceId, costo: monto, descripcion: descripcion,
            litros: parseFloat(document.getElementById('input-litros').value) || 0,
            km_recorridos: parseFloat(document.getElementById('input-km').value) || 0
          };
          var { error } = await supabase.from('gasolina').insert(data);
          if (error) { toast('Error: ' + error.message, 'error'); return; }
          actualizarPresupuesto('gasolina', monto);
          toast('⛽ Gasolina registrada: S/ ' + monto.toFixed(2), 'success');
        } else {
          var table = currentType === 'ingreso' ? 'ingresos' : 'gastos';
          var { error } = await supabase.from(table).insert({
            user_id: deviceId, monto: monto, descripcion: descripcion, categoria: categoria
          });
          if (error) { toast('Error: ' + error.message, 'error'); return; }
          if (currentType === 'gasto') actualizarPresupuesto(categoria, monto);
          toast(currentType.charAt(0).toUpperCase() + currentType.slice(1) + ' registrado: S/ ' + monto.toFixed(2), 'success');
        }

        document.getElementById('form-movimiento').reset();
        selectType('ingreso');
        loadDashboard();
      } catch (e) {
        toast('Error de conexión', 'error');
      } finally {
        setLoading('btn-movimiento', false);
      }
    }

    // =============================================
    // MODO RAPIDO — texto libre
    // =============================================
    document.getElementById('form-rapido').addEventListener('submit', async function(e) {
      e.preventDefault();
      var input = document.getElementById('input-rapido');
      var preview = document.getElementById('rapido-preview');
      var text = input.value.trim().toLowerCase();
      if (!text) return;

      var montoMatch = text.match(/(\d+\.?\d*)/);
      if (!montoMatch) { preview.textContent = '❌ No entendí. Ej: "gaste 20 en gasolina"'; return; }
      var monto = parseFloat(montoMatch[1]);
      if (monto <= 0 || monto > 999999) { preview.textContent = '❌ Monto inválido'; return; }
      input.value = '';

      var tipo = 'gasto';
      var categoria = 'general';
      var descripcion = text;
      var litros = 0;
      var km = 0;

      if (text.includes('ingreso') || text.includes('gane') || text.includes('recib')) {
        tipo = 'ingreso';
        categoria = 'delivery';
      } else if (text.includes('inversion') || text.includes('inversión') || text.includes('invierto') || text.includes('plan') || text.includes('cuota')) {
        tipo = 'inversion';
        categoria = 'inversion';
      } else if (text.includes('gasolina') || text.includes('tanque') || text.includes('bencina') || text.includes('grifo')) {
        tipo = 'gasolina';
        categoria = 'gasolina';
        var litrosMatch = text.match(/(\d+\.?\d*)\s*litros?/);
        if (litrosMatch) litros = parseFloat(litrosMatch[1]);
      } else if (text.includes('comida') || text.includes('almuerzo') || text.includes('cena') || text.includes('desayuno')) {
        categoria = 'comida';
      } else if (text.includes('transporte') || text.includes('pasaje') || text.includes('taxi') || text.includes('uber')) {
        categoria = 'transporte';
      } else if (text.includes('salud') || text.includes('doctor') || text.includes('medico') || text.includes('farmacia')) {
        categoria = 'salud';
      }

      try {
        if (tipo === 'gasolina') {
          await supabase.from('gasolina').insert({ user_id: deviceId, costo: monto, descripcion: descripcion, litros: litros, km_recorridos: 0 });
          actualizarPresupuesto('gasolina', monto);
        } else if (tipo === 'inversion') {
          await supabase.from('gastos').insert({ user_id: deviceId, monto: monto, descripcion: descripcion, categoria: 'inversion' });
        } else {
          var table = tipo === 'ingreso' ? 'ingresos' : 'gastos';
          await supabase.from(table).insert({ user_id: deviceId, monto: monto, descripcion: descripcion, categoria: categoria });
          if (tipo === 'gasto') actualizarPresupuesto(categoria, monto);
        }
        var icono = tipo === 'inversion' ? '🌱' : (tipo === 'gasolina' ? '⛽' : (tipo === 'ingreso' ? '💰' : '🛒'));
        preview.innerHTML = '✅ ' + icono + ' ' + tipo.charAt(0).toUpperCase() + tipo.slice(1) + ' registrado: S/ ' + monto.toFixed(2);
        preview.style.color = 'var(--success)';
        loadDashboard();
      } catch (e) {
        preview.textContent = '❌ Error de conexión';
        preview.style.color = 'var(--error)';
      }
      setTimeout(function() { preview.textContent = ''; }, 4000);
    });

    // =============================================
    // DASHBOARD
    // =============================================
    async function loadDashboard() {
      var today = new Date().toISOString().split('T')[0];
      var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      try {
        var results = await Promise.all([
          sumTable('ingresos', today, today),
          sumTable('gastos', today, today),
          sumGasolina(today, today),
          sumTable('ingresos', monthStart, today),
          sumTable('gastos', monthStart, today),
          getKmL(),
          countPasivos()
        ]);

        var ingresosHoy = results[0], gastosHoy = results[1], gasolinaHoy = results[2];
        var ingresosMes = results[3], gastosMes = results[4];
        var kml = results[5], pasivosCount = results[6];

        var neto = ingresosHoy - gastosHoy - gasolinaHoy;
        var netoEl = document.getElementById('neto-hoy');
        netoEl.textContent = 'S/ ' + neto.toFixed(2);
        netoEl.className = 'big-number ' + (neto >= 0 ? 'positive' : 'negative');

        document.getElementById('neto-ingresos').textContent = 'S/ ' + ingresosHoy.toFixed(2);
        document.getElementById('neto-gastos').textContent = 'S/ ' + gastosHoy.toFixed(2);
        document.getElementById('neto-gasolina').textContent = 'S/ ' + gasolinaHoy.toFixed(2);

        document.getElementById('stat-ingresos-mes').textContent = 'S/ ' + ingresosMes.toFixed(0);
        document.getElementById('stat-gastos-mes').textContent = 'S/ ' + gastosMes.toFixed(0);
        document.getElementById('stat-pasivos-rest').textContent = pasivosCount;

        // Inversiones del mes
        var { data: invData } = await supabase.from('gastos').select('monto')
          .eq('user_id', deviceId).eq('categoria', 'inversion')
          .gte('fecha', monthStart).lte('fecha', today);
        var totalInv = (invData || []).reduce(function(s, x) { return s + x.monto; }, 0);
        document.getElementById('stat-inversiones-mes').textContent = 'S/ ' + totalInv.toFixed(0);

        await loadHistorial();
        drawChart7d();
      } catch (e) {
        console.error('[CRIPTA] Dashboard error');
      }
    }

    // =============================================
    // CHARTS — reutilizable, retina-ready
    // =============================================
    async function drawChart7d() {
      var canvas = document.getElementById('chart-canvas');
      if (!canvas) return;
      var days = [];
      for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      try {
        var queries = days.map(function(d) {
          return Promise.all([
            supabase.from('ingresos').select('monto').eq('user_id', deviceId).eq('fecha', d),
            supabase.from('gastos').select('monto').eq('user_id', deviceId).eq('fecha', d),
            supabase.from('gasolina').select('costo').eq('user_id', deviceId).eq('fecha', d)
          ]);
        });
        var results = await Promise.all(queries);
        var chartData = results.map(function(r, i) {
          var ing = (r[0].data || []).reduce(function(s, x) { return s + x.monto; }, 0);
          var gas = (r[1].data || []).reduce(function(s, x) { return s + x.monto; }, 0);
          var gaso = (r[2].data || []).reduce(function(s, x) { return s + x.costo; }, 0);
          return { label: days[i].slice(5), value: ing - gas - gaso };
        });

        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        var w = rect.width, h = rect.height;

        ctx.clearRect(0, 0, w, h);
        var hasData = chartData.some(function(d) { return d.value !== 0; });
        if (!hasData) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Sin datos — registra movimientos para ver tu tendencia', w/2, h/2);
          return;
        }

        var maxVal = Math.max.apply(null, chartData.map(function(d) { return Math.abs(d.value); }));
        maxVal = Math.max(maxVal, 1);
        var barW = (w - 8) / 7 * 0.6;
        var gap = (w - 8) / 7 * 0.4;
        var baseY = h - 18;

        chartData.forEach(function(d, i) {
          var x = 4 + i * (barW + gap) + gap/2;
          var barH = (Math.abs(d.value) / maxVal) * (h - 28);
          var y = d.value >= 0 ? baseY - barH : baseY;
          ctx.fillStyle = d.value >= 0 ? '#22c55e' : '#ef4444';
          ctx.fillRect(x, y, barW, Math.max(barH, 1));
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(d.label, x + barW/2, h - 4);
          if (d.value !== 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText((d.value > 0 ? '+' : '') + (d.value < 0 ? '' : '') + 'S/' + Math.abs(d.value).toFixed(0), x + barW/2, d.value >= 0 ? y - 4 : y + barH + 12);
          }
        });
      } catch (e) { /* silencioso */ }
    }

    async function sumTable(table, from, to) {
      var { data } = await supabase.from(table).select('monto')
        .eq('user_id', deviceId)
        .gte('fecha', from).lte('fecha', to);
      return (data || []).reduce(function(s, r) { return s + r.monto; }, 0);
    }

    async function sumGasolina(from, to) {
      var { data } = await supabase.from('gasolina').select('costo')
        .eq('user_id', deviceId)
        .gte('fecha', from).lte('fecha', to);
      return (data || []).reduce(function(s, r) { return s + r.costo; }, 0);
    }

    async function getKmL() {
      var { data } = await supabase.from('gasolina').select('km_recorridos, litros')
        .eq('user_id', deviceId);
      if (!data || data.length === 0) return '0';
      var totalKm = data.reduce(function(s, r) { return s + (r.km_recorridos || 0); }, 0);
      var totalL = data.reduce(function(s, r) { return s + (r.litros || 0); }, 0);
      return totalL > 0 ? (totalKm / totalL).toFixed(1) : '0';
    }

    // =============================================
    // HISTORIAL
    // =============================================
    async function loadHistorial() {
      var list = document.getElementById('historial-list');
      var results = await Promise.all([
        supabase.from('ingresos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }).limit(10),
        supabase.from('gastos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }).limit(10),
        supabase.from('gasolina').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }).limit(10)
      ]);

      var all = [];
      var i, r;
      for (i = 0; i < (results[0].data || []).length; i++) {
        r = results[0].data[i]; r.tipo = 'ingreso'; all.push(r);
      }
      for (i = 0; i < (results[1].data || []).length; i++) {
        r = results[1].data[i]; r.tipo = 'gasto'; all.push(r);
      }
      for (i = 0; i < (results[2].data || []).length; i++) {
        r = results[2].data[i]; r.tipo = 'gasolina'; r.monto = r.costo; all.push(r);
      }

      all.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      all = all.slice(0, 15);

      if (all.length === 0) {
        list.innerHTML = '<div class="list-empty">Sin movimientos hoy</div>';
        return;
      }

      var html = '';
      for (i = 0; i < all.length; i++) {
        var m = all[i];
        var colorClass = m.tipo === 'ingreso' ? 'ingreso' : (m.categoria === 'inversion' ? 'inversion' : 'gasto');
        var sign = m.tipo === 'ingreso' ? '+' : '-';
        var icono = m.categoria === 'inversion' ? '🌱 ' : '';
        html += '<div class="list-item clickable" data-id="' + m.id + '" data-tipo="' + m.tipo + '" data-table="' + (m.tipo === 'gasolina' ? 'gasolina' : (m.tipo === 'ingreso' ? 'ingresos' : 'gastos')) + '">' +
          '<div class="list-item-left">' +
            '<span class="list-item-desc">' + icono + esc(m.descripcion || m.tipo) + '</span>' +
            '<span class="list-item-date">' + esc(m.fecha) + ' · ' + esc(m.categoria || '') + '</span>' +
          '</div>' +
          '<div class="list-item-right ' + colorClass + '">' +
            sign + ' S/ ' + m.monto.toFixed(2) +
          '</div>' +
        '</div>';
      }
      list.innerHTML = html;

      var items = list.querySelectorAll('.list-item.clickable');
      for (var k = 0; k < items.length; k++) {
        items[k].addEventListener('click', function() {
          var id = parseInt(this.dataset.id);
          var table = this.dataset.table;
          var desc = this.querySelector('.list-item-desc').textContent;
          if (confirm('¿Eliminar "' + desc + '"?')) {
            eliminarMovimiento(table, id);
          }
        });
      }
    }

    // =============================================
    // PASIVOS (antes Deudas)
    // =============================================
    async function countPasivos() {
      var { count } = await supabase.from('deudas').select('*', { count: 'exact', head: true })
        .eq('user_id', deviceId);
      return count || 0;
    }

    async function loadPasivos() {
      var { data: pasivos } = await supabase.from('deudas').select('*')
        .eq('user_id', deviceId).order('created_at', { ascending: false });

      var list = document.getElementById('pasivos-list');

      if (!pasivos || pasivos.length === 0) {
        list.innerHTML = '<div class="list-empty">Sin pasivos registrados 🌟</div>';
        document.getElementById('proximos-list').innerHTML = '';
        return;
      }

      var html = '';
      for (var i = 0; i < pasivos.length; i++) {
        var d = pasivos[i];
        var pct = d.monto_total > 0 ? ((d.monto_pagado / d.monto_total) * 100).toFixed(0) : 0;
        var restante = d.monto_total - d.monto_pagado;
        var estadoLabel = d.estado === 'pagada' ? '✅ Liberado' : '🌀 Activo';
        html += '<div class="pasivo-card clickable" data-id="' + d.id + '">' +
          '<div class="deuda-header">' +
            '<span class="deuda-nombre">' + esc(d.nombre) + '</span>' +
            '<span class="deuda-monto">S/ ' + restante.toFixed(2) + '</span>' +
          '</div>' +
          '<div class="deuda-progress">' +
            '<div class="deuda-progress-fill" style="width:' + pct + '%;background:' + (d.estado === 'pagada' ? 'var(--green)' : '') + '"></div>' +
          '</div>' +
          '<div class="deuda-footer">' +
            '<span>' + estadoLabel + ' · Pagado: ' + pct + '%</span>' +
            '<span>Total: S/ ' + d.monto_total.toFixed(2) + '</span>' +
          '</div>' +
          (d.fecha_limite ? '<div class="deuda-footer" style="margin-top:4px;"><span>Vence: ' + esc(d.fecha_limite) + '</span></div>' : '') +
          '<div class="deuda-actions">' +
            '<button class="btn btn-primary btn-sm btn-pagar" data-id="' + d.id + '" data-restante="' + restante + '">Pagar</button>' +
            (d.estado === 'activa' ? '<button class="btn btn-secondary btn-sm btn-marcar" data-id="' + d.id + '" data-total="' + d.monto_total + '">Liberar ✅</button>' : '') +
            '<button class="btn btn-sm btn-eliminar" data-id="' + d.id + '" style="background:var(--gasto);color:white;padding:4px 8px;border:none;border-radius:6px;font-size:12px;cursor:pointer;">🗑️</button>' +
          '</div>' +
        '</div>';
      }
      list.innerHTML = html;

      // Click en card → detalle del pasivo
      var cards = list.querySelectorAll('.pasivo-card');
      for (var ci = 0; ci < cards.length; ci++) {
        cards[ci].addEventListener('click', function(e) {
          if (e.target.tagName === 'BUTTON') return; // no interferir con botones internos
          mostrarDetallePasivo(parseInt(this.dataset.id));
        });
      }

      // Bind PAGAR buttons
      var pagarBtns = list.querySelectorAll('.btn-pagar');
      for (var j = 0; j < pagarBtns.length; j++) {
        pagarBtns[j].addEventListener('click', function() {
          abrirModalPago(parseInt(this.dataset.id), parseFloat(this.dataset.restante));
        });
      }

      // Bind LIBERAR buttons
      var marcarBtns = list.querySelectorAll('.btn-marcar');
      for (var j = 0; j < marcarBtns.length; j++) {
        marcarBtns[j].addEventListener('click', function() {
          marcarPagado(parseInt(this.dataset.id), parseFloat(this.dataset.total));
        });
      }

      // Bind ELIMINAR buttons
      var eliminarBtns = list.querySelectorAll('.btn-eliminar');
      for (var j = 0; j < eliminarBtns.length; j++) {
        eliminarBtns[j].addEventListener('click', function() {
          eliminarPasivo(parseInt(this.dataset.id));
        });
      }

      // Próximos pagos
      var proximos = pasivos.filter(function(d) { return d.estado === 'activa' && d.fecha_limite; })
        .sort(function(a, b) { return new Date(a.fecha_limite) - new Date(b.fecha_limite); });
      var proximosList = document.getElementById('proximos-list');

      if (proximos.length === 0) {
        proximosList.innerHTML = '<div class="list-empty">Sin pagos próximos</div>';
      } else {
        var phtml = '';
        for (var k = 0; k < proximos.length; k++) {
          var p = proximos[k];
          phtml += '<div class="list-item">' +
            '<div class="list-item-left">' +
              '<span class="list-item-desc">' + esc(p.nombre) + '</span>' +
              '<span class="list-item-date">Vence: ' + esc(p.fecha_limite) + '</span>' +
            '</div>' +
            '<div class="list-item-right deuda">S/ ' + (p.monto_total - p.monto_pagado).toFixed(2) + '</div>' +
          '</div>';
        }
        proximosList.innerHTML = phtml;
      }
    }

    // =============================================
    // DETALLE DE PASIVO — progreso + historial de pagos
    // =============================================
    async function mostrarDetallePasivo(pasivoId) {
      var { data: pasivo } = await supabase.from('deudas').select('*').eq('id', pasivoId).single();
      if (!pasivo) { toast('Pasivo no encontrado', 'error'); return; }

      var { data: pagos } = await supabase.from('pagos_deuda').select('*')
        .eq('deuda_id', pasivoId).order('created_at', { ascending: false });

      var restante = pasivo.monto_total - pasivo.monto_pagado;
      var pct = pasivo.monto_total > 0 ? ((pasivo.monto_pagado / pasivo.monto_total) * 100).toFixed(1) : 0;
      var estadoLabel = pasivo.estado === 'pagada' ? '✅ Liberado' : '🌀 En progreso';

      document.getElementById('detalle-titulo').textContent = '🌀 ' + pasivo.nombre;

      var pagosHtml = '';
      if (!pagos || pagos.length === 0) {
        pagosHtml = '<div style="color:var(--text-dim);font-size:13px;">Sin pagos registrados aún</div>';
      } else {
        pagosHtml = pagos.map(function(p) {
          return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:13px;">' +
            '<span style="color:var(--text-dim);">' + esc(p.created_at ? p.created_at.slice(0,10) : '—') + '</span>' +
            '<span style="color:var(--green);font-weight:600;">- S/ ' + p.monto.toFixed(2) + '</span>' +
          '</div>';
        }).join('');
      }

      var html =
        '<div style="padding:8px 0;">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
            '<div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">' +
              '<div style="font-size:11px;color:var(--text-dim);">Total</div>' +
              '<div style="font-size:20px;font-weight:700;color:var(--debt);margin-top:4px;">S/ ' + pasivo.monto_total.toFixed(0) + '</div>' +
            '</div>' +
            '<div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">' +
              '<div style="font-size:11px;color:var(--text-dim);">Restante</div>' +
              '<div style="font-size:20px;font-weight:700;color:var(--debt);margin-top:4px;">S/ ' + restante.toFixed(0) + '</div>' +
            '</div>' +
          '</div>' +

          '<div style="background:var(--bg-input);padding:12px;border-radius:10px;margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">' +
              '<span style="color:var(--text-dim);">Progreso</span>' +
              '<span style="font-weight:600;">' + pct + '%</span>' +
            '</div>' +
            '<div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">' +
              '<div style="height:100%;width:' + Math.min(pct, 100) + '%;background:' + (pasivo.estado === 'pagada' ? 'var(--green)' : 'var(--brand)') + ';border-radius:4px;"></div>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-dim);margin-top:6px;">' + estadoLabel + '</div>' +
          '</div>' +

          '<div style="background:var(--bg-input);padding:12px;border-radius:10px;">' +
            '<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">📋 Historial de Pagos</div>' +
            pagosHtml +
          '</div>' +
        '</div>';

      document.getElementById('detalle-contenido').innerHTML = html;
      showModal('modal-detalle-pasivo');
    }

    // =============================================
    // PAGO DE PASIVO
    // =============================================
    function abrirModalPago(pasivoId, restante) {
      pasivoPagarId = pasivoId;
      pasivoPagarRestante = restante;
      document.getElementById('pago-info').textContent = 'Restante: S/ ' + restante.toFixed(2);
      document.getElementById('pago-monto').value = '';
      document.getElementById('pago-monto').max = restante;
      showModal('modal-pago');
      document.getElementById('pago-monto').focus();
    }

    async function confirmarPago() {
      var monto = parseFloat(document.getElementById('pago-monto').value);
      if (isNaN(monto) || monto <= 0 || monto > pasivoPagarRestante) {
        toast('Monto inválido', 'error');
        return;
      }
      setLoading('btn-confirmar-pago', true);
      try {
        await supabase.from('pagos_deuda').insert({ deuda_id: pasivoPagarId, monto: monto });
        var { data: pasivo } = await supabase.from('deudas').select('monto_pagado, monto_total').eq('id', pasivoPagarId).single();
        var nuevoPagado = (pasivo.monto_pagado || 0) + monto;
        var estado = nuevoPagado >= pasivo.monto_total ? 'pagada' : 'activa';
        await supabase.from('deudas').update({ monto_pagado: nuevoPagado, estado: estado }).eq('id', pasivoPagarId);
        toast('💳 Pago registrado: S/ ' + monto.toFixed(2), 'success');
        hideModal('modal-pago');
        loadPasivos();
        loadDashboard();
      } catch (e) {
        toast('Error de conexión', 'error');
      } finally {
        setLoading('btn-confirmar-pago', false);
      }
    }

    // =============================================
    // CRUD PASIVOS
    // =============================================
    async function handlePasivo(e) {
      e.preventDefault();
      var nombre = document.getElementById('pasivo-nombre').value.trim();
      var monto = parseFloat(document.getElementById('pasivo-monto').value);
      var interes = parseFloat(document.getElementById('pasivo-interes').value) || 0;
      var fecha = document.getElementById('pasivo-fecha').value || null;

      if (!nombre || isNaN(monto) || monto <= 0 || monto > 999999) {
        toast('Completa nombre y monto válido', 'error');
        return;
      }
      setLoading('btn-guardar-pasivo', true);
      try {
        var { error } = await supabase.from('deudas').insert({
          user_id: deviceId, nombre: nombre, monto_total: monto,
          tasa_interes: interes, fecha_limite: fecha
        });
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        toast('🌀 Pasivo registrado', 'success');
        hideModal('modal-pasivo');
        document.getElementById('form-pasivo').reset();
        loadPasivos();
      } catch (e) {
        toast('Error de conexión', 'error');
      } finally {
        setLoading('btn-guardar-pasivo', false);
      }
    }

    async function marcarPagado(pasivoId, montoTotal) {
      if (!confirm('¿Marcar como liberado? 🎉')) return;
      try {
        await supabase.from('deudas').update({ monto_pagado: montoTotal, estado: 'pagada' }).eq('id', pasivoId);
        toast('✅ Pasivo liberado!', 'success');
        loadPasivos();
        loadDashboard();
      } catch (e) {
        toast('Error de conexión', 'error');
      }
    }

    async function eliminarPasivo(pasivoId) {
      if (!confirm('¿Eliminar este pasivo definitivamente?')) return;
      try {
        await supabase.from('pagos_deuda').delete().eq('deuda_id', pasivoId);
        await supabase.from('deudas').delete().eq('id', pasivoId);
        toast('Pasivo eliminado', 'success');
        loadPasivos();
        loadDashboard();
      } catch (e) {
        toast('Error de conexión', 'error');
      }
    }

    async function eliminarMovimiento(table, id) {
      try {
        await supabase.from(table).delete().eq('id', id);
        toast('Movimiento eliminado', 'success');
        loadDashboard();
      } catch (e) {
        toast('Error de conexión', 'error');
      }
    }

    // =============================================
    // INVERSIONES
    // =============================================
    async function loadInversiones() {
      var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      var today = new Date().toISOString().split('T')[0];

      var { data: inversiones } = await supabase.from('gastos').select('*')
        .eq('user_id', deviceId).eq('categoria', 'inversion')
        .order('fecha', { ascending: false });

      var list = document.getElementById('inversiones-list');

      if (!inversiones || inversiones.length === 0) {
        list.innerHTML = '<div class="list-empty">Sin inversiones registradas 🌱<br><span style="font-size:12px;">Registra desde la pestaña Registrar → Inversión</span></div>';
      } else {
        var html = '';
        for (var i = 0; i < inversiones.length; i++) {
          var inv = inversiones[i];
          html += '<div class="list-item clickable" data-id="' + inv.id + '" data-table="gastos">' +
            '<div class="list-item-left">' +
              '<span class="list-item-desc">🌱 ' + esc(inv.descripcion || 'Inversión') + '</span>' +
              '<span class="list-item-date">' + esc(inv.fecha) + '</span>' +
            '</div>' +
            '<div class="list-item-right inversion">S/ ' + inv.monto.toFixed(2) + '</div>' +
          '</div>';
        }
        list.innerHTML = html;

        // Click para eliminar inversión
        var items = list.querySelectorAll('.list-item.clickable');
        for (var k = 0; k < items.length; k++) {
          items[k].addEventListener('click', function() {
            var id = parseInt(this.dataset.id);
            var desc = this.querySelector('.list-item-desc').textContent;
            if (confirm('¿Eliminar ' + desc + '?')) {
              eliminarMovimiento('gastos', id);
              loadInversiones();
              loadDashboard();
            }
          });
        }
      }

      // Total invertido este mes
      var { data: invMes } = await supabase.from('gastos').select('monto')
        .eq('user_id', deviceId).eq('categoria', 'inversion')
        .gte('fecha', monthStart).lte('fecha', today);
      var totalInv = (invMes || []).reduce(function(s, x) { return s + x.monto; }, 0);
      document.getElementById('total-invertido-mes').textContent = 'S/ ' + totalInv.toFixed(2);
    }

    // =============================================
    // TOOLS
    // =============================================
    function handleTool(tool) {
      var actions = { meta: showMeta, proyectar: function() { showModal('modal-proyectar'); },
        simular: function() { showModal('modal-simular'); }, salida: showSalida,
        exportar: exportarCSV, presupuesto: showPresupuesto, resumen: showResumen };
      if (actions[tool]) actions[tool]();
    }

    async function showMeta() {
      var results = await Promise.all([
        supabase.from('deudas').select('*').eq('user_id', deviceId),
        supabase.from('ingresos').select('monto').eq('user_id', deviceId).gte('fecha', new Date(Date.now() - 30*86400000).toISOString().split('T')[0]).lte('fecha', new Date().toISOString().split('T')[0]),
        supabase.from('gastos').select('monto').eq('user_id', deviceId).gte('fecha', new Date(Date.now() - 30*86400000).toISOString().split('T')[0]).lte('fecha', new Date().toISOString().split('T')[0]),
        supabase.from('gasolina').select('costo').eq('user_id', deviceId).gte('fecha', new Date(Date.now() - 30*86400000).toISOString().split('T')[0]).lte('fecha', new Date().toISOString().split('T')[0])
      ]);

      var deudas = results[0].data || [];
      var ingMes = (results[1].data || []).reduce(function(s, x){ return s + x.monto; }, 0);
      var gasMes = (results[2].data || []).reduce(function(s, x){ return s + x.monto; }, 0);
      var gasoMes = (results[3].data || []).reduce(function(s, x){ return s + x.costo; }, 0);
      var promedioDiario = Math.max((ingMes - gasMes - gasoMes) / 30, 0);

      if (deudas.length === 0 && promedioDiario <= 0) {
        document.getElementById('meta-resultado').innerHTML = '<p style="text-align:center;padding:20px;">Sin pasivos ni ingresos registrados 📭</p>';
        showModal('modal-meta');
        return;
      }

      var hoy = new Date();
      var totalDeuda = 0;
      var pesoInteres = 0;
      var deudasDetalle = [];

      deudas.sort(function(a, b) { return (b.tasa_interes || 0) - (a.tasa_interes || 0); });

      for (var i = 0; i < deudas.length; i++) {
        var d = deudas[i];
        var restante = d.monto_total - d.monto_pagado;
        totalDeuda += restante;
        pesoInteres += (d.tasa_interes || 0) * restante;
        deudasDetalle.push({ nombre: d.nombre, restante: restante, tasa: d.tasa_interes || 0, fecha: d.fecha_limite });
      }

      var diasPorDeuda = deudasDetalle.map(function(d) {
        if (d.fecha) {
          var diff = Math.ceil((new Date(d.fecha) - hoy) / 86400000);
          return diff > 0 ? diff : 1;
        }
        return 90;
      });
      var diasRestantes = Math.min.apply(null, diasPorDeuda);
      if (diasRestantes === Infinity || diasRestantes <= 0) diasRestantes = 30;

      var metaDiaria = totalDeuda / diasRestantes;
      var porcentajeIngreso = promedioDiario > 0 ? Math.min((metaDiaria / promedioDiario) * 100, 100) : 100;
      var sugerido = Math.min(metaDiaria, promedioDiario * 0.5);
      var factible = promedioDiario >= metaDiaria;
      var ahorroMensual = promedioDiario * 30 - totalDeuda;

      var html =
        '<div style="padding:12px 0;">' +
          '<div style="text-align:center;padding:12px 0;">' +
            '<div style="font-size:12px;color:var(--text-dim);">🌀 Total pasivos</div>' +
            '<div style="font-size:32px;font-weight:700;color:var(--deuda);">S/ ' + totalDeuda.toFixed(0) + '</div>' +
          '</div>' +

          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
            '<div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">' +
              '<div style="font-size:10px;color:var(--text-dim);">🎯 Meta diaria</div>' +
              '<div style="font-size:22px;font-weight:700;color:var(--ingreso);margin-top:2px;">S/ ' + metaDiaria.toFixed(2) + '</div>' +
              '<div style="font-size:10px;color:var(--text-dim);margin-top:4px;">para liberar en ' + diasRestantes + ' días</div>' +
            '</div>' +
            '<div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">' +
              '<div style="font-size:10px;color:var(--text-dim);">📊 Promedio diario</div>' +
              '<div style="font-size:22px;font-weight:700;color:' + (factible ? 'var(--ingreso)' : 'var(--gasto)') + ';margin-top:2px;">S/ ' + promedioDiario.toFixed(2) + '</div>' +
              '<div style="font-size:10px;color:var(--text-dim);margin-top:4px;">' + (factible ? '✅ Suficiente!' : '⚠️ Te faltan S/ ' + (metaDiaria - promedioDiario).toFixed(2) + '/día') + '</div>' +
            '</div>' +
          '</div>' +

          '<div style="margin-top:12px;padding:10px;background:var(--bg-input);border-radius:10px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">' +
              '<span style="color:var(--text-dim);">% de tu ingreso para pasivos</span>' +
              '<span style="font-weight:600;">' + porcentajeIngreso.toFixed(0) + '%</span>' +
            '</div>' +
            '<div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">' +
              '<div style="height:100%;width:' + Math.min(porcentajeIngreso, 100) + '%;background:' + (porcentajeIngreso > 70 ? 'var(--gasto)' : porcentajeIngreso > 40 ? '#ffa500' : 'var(--ingreso)') + ';border-radius:4px;"></div>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-dim);margin-top:6px;">' +
              (factible
                ? '💡 Si hoy ganas S/ ' + promedioDiario.toFixed(0) + ', destina S/ ' + sugerido.toFixed(0) + ' a pasivos'
                : '💡 Necesitas aumentar tu ingreso diario en S/ ' + (metaDiaria - promedioDiario).toFixed(2)) +
            '</div>' +
          '</div>' +

          (deudasDetalle.length > 0 ?
            '<div style="margin-top:12px;">' +
              '<div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">📋 Prioridad (mayor interés primero):</div>' +
              deudasDetalle.map(function(d, i) {
                return '<div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg-input);border-radius:6px;margin-bottom:4px;font-size:12px;">' +
                  '<span>' + (i+1) + '. ' + esc(d.nombre) + '</span>' +
                  '<span style="color:var(--deuda);font-weight:600;">S/ ' + d.restante.toFixed(0) + (d.tasa > 0 ? ' (' + d.tasa + '%)' : '') + '</span>' +
                '</div>';
              }).join('') +
            '</div>' : '') +

          (ahorroMensual > 0 ?
            '<div style="margin-top:10px;padding:10px;background:var(--bg-input);border-radius:8px;font-size:12px;text-align:center;color:var(--ingreso);">' +
              '🚀 Al paso actual, en 30 días tendrías S/ ' + ahorroMensual.toFixed(0) + ' libre' +
            '</div>' : '') +
        '</div>';

      document.getElementById('meta-resultado').innerHTML = html;
      showModal('modal-meta');
    }

    async function handleProyectar() {
      var dias = parseInt(document.getElementById('proyectar-dias').value) || 7;
      var today = new Date().toISOString().split('T')[0];
      var monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      var results = await Promise.all([sumTable('ingresos', monthAgo, today), sumTable('gastos', monthAgo, today), sumGasolina(monthAgo, today)]);
      var promedioDiario = (results[0] - results[1] - results[2]) / 30;
      var proyeccion = promedioDiario * dias;
      document.getElementById('proyectar-resultado').innerHTML =
        '<div style="text-align:center;padding:16px 0;">' +
          '<div style="color:var(--text-dim);font-size:14px;">Promedio diario (30 días)</div>' +
          '<div style="font-size:24px;font-weight:700;margin:8px 0;">S/ ' + promedioDiario.toFixed(2) + '</div>' +
          '<div style="color:var(--text-dim);font-size:14px;">En ' + dias + ' días tendrás</div>' +
          '<div style="font-size:32px;font-weight:700;color:' + (proyeccion >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';">S/ ' + proyeccion.toFixed(2) + '</div>' +
        '</div>';
    }

    async function handleSimular() {
      var ingresoExtra = parseFloat(document.getElementById('simular-ingreso').value) || 0;
      var gastoExtra = parseFloat(document.getElementById('simular-gasto').value) || 0;
      var today = new Date().toISOString().split('T')[0];
      var monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      var results = await Promise.all([sumTable('ingresos', monthAgo, today), sumTable('gastos', monthAgo, today), sumGasolina(monthAgo, today)]);
      var actual = results[0] - results[1] - results[2];
      var simulado = actual + ingresoExtra - gastoExtra;
      var diff = simulado - actual;
      document.getElementById('simular-resultado').innerHTML =
        '<div style="text-align:center;padding:16px 0;">' +
          '<div style="color:var(--text-dim);font-size:14px;">Situación actual (30 días)</div>' +
          '<div style="font-size:24px;font-weight:700;margin:8px 0;">S/ ' + actual.toFixed(2) + '</div>' +
          '<div style="color:var(--text-dim);font-size:14px;">Con el escenario simulado</div>' +
          '<div style="font-size:28px;font-weight:700;color:' + (simulado >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';">S/ ' + simulado.toFixed(2) + '</div>' +
          '<div style="font-size:14px;color:' + (diff >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';margin-top:8px;">' +
            (diff >= 0 ? '📈 +' : '📉 ') + 'S/ ' + diff.toFixed(2) +
          '</div>' +
        '</div>';
    }

    async function showSalida() {
      var { data: pasivos } = await supabase.from('deudas').select('*')
        .eq('user_id', deviceId).eq('estado', 'activa');
      if (!pasivos || pasivos.length === 0) {
        document.getElementById('salida-resultado').innerHTML = '<p style="text-align:center;">¡Sin pasivos activos! 🎉</p>';
        showModal('modal-salida');
        return;
      }
      var totalPasivo = 0;
      var pagos = [];
      for (var i = 0; i < pasivos.length; i++) {
        var restante = pasivos[i].monto_total - pasivos[i].monto_pagado;
        totalPasivo += restante;
        pagos.push({ nombre: pasivos[i].nombre, restante: restante, tasa: pasivos[i].tasa_interes, fecha: pasivos[i].fecha_limite });
      }
      pagos.sort(function(a, b) { return b.tasa - a.tasa; });
      var plan = pagos.map(function(p, i) {
        return (i + 1) + '. ' + esc(p.nombre) + ': S/ ' + p.restante.toFixed(2) +
          (p.tasa > 0 ? ' (' + p.tasa + '% interés)' : '') +
          (p.fecha ? ' → vence ' + esc(p.fecha) : '');
      }).join('\n');
      document.getElementById('salida-resultado').innerHTML =
        '<div style="padding:16px 0;">' +
          '<p style="color:var(--text-dim);">Tu plan de salida:</p>' +
          '<div style="font-size:28px;font-weight:700;color:var(--deuda);text-align:center;margin:12px 0;">S/ ' + totalPasivo.toFixed(2) + '</div>' +
          '<p style="color:var(--text-dim);margin-bottom:8px;">Prioridad por tasa de interés:</p>' +
          '<pre style="font-family:monospace;font-size:14px;line-height:1.8;white-space:pre-wrap;">' + plan + '</pre>' +
          '<div style="margin-top:16px;padding:12px;background:var(--bg-input);border-radius:8px;font-size:13px;color:var(--text-dim);">' +
            '💡 Libera primero el pasivo con mayor interés.' +
          '</div>' +
        '</div>';
      showModal('modal-salida');
    }

    async function exportarCSV() {
      var results = await Promise.all([
        supabase.from('ingresos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }),
        supabase.from('gastos').select('*').eq('user_id', deviceId).order('fecha', { ascending: false }),
        supabase.from('gasolina').select('*').eq('user_id', deviceId).order('fecha', { ascending: false })
      ]);
      var csv = 'Fecha,Tipo,Descripcion,Categoria,Monto\n';
      var i, r;
      for (i = 0; i < (results[0].data || []).length; i++) {
        r = results[0].data[i];
        csv += r.fecha + ',Ingreso,"' + (r.descripcion || '').replace(/"/g, '""') + '",' + (r.categoria || '') + ',' + r.monto + '\n';
      }
      for (i = 0; i < (results[1].data || []).length; i++) {
        r = results[1].data[i];
        csv += r.fecha + ',Gasto,"' + (r.descripcion || '').replace(/"/g, '""') + '",' + (r.categoria || '') + ',' + r.monto + '\n';
      }
      for (i = 0; i < (results[2].data || []).length; i++) {
        r = results[2].data[i];
        csv += r.fecha + ',Gasolina,"' + (r.descripcion || '').replace(/"/g, '""') + '",gasolina,' + r.costo + '\n';
      }
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'cripta_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV descargado', 'success');
    }

    async function showResumen() {
      var today = new Date().toISOString().split('T')[0];
      var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      try {
        var r = await Promise.all([
          supabase.from('ingresos').select('monto').eq('user_id', deviceId).gte('fecha', monthStart).lte('fecha', today),
          supabase.from('gastos').select('monto').eq('user_id', deviceId).gte('fecha', monthStart).lte('fecha', today),
          supabase.from('gasolina').select('costo').eq('user_id', deviceId).gte('fecha', monthStart).lte('fecha', today),
          supabase.from('deudas').select('*').eq('user_id', deviceId)
        ]);
        var iMonto = (r[0].data || []).reduce(function(s, x) { return s + x.monto; }, 0);
        var gMonto = (r[1].data || []).reduce(function(s, x) { return s + x.monto; }, 0);
        var gasMonto = (r[2].data || []).reduce(function(s, x) { return s + x.costo; }, 0);
        var neto = iMonto - gMonto - gasMonto;
        var pasivos = r[3].data || [];
        var totalPasivo = pasivos.reduce(function(s, d) { return s + (d.monto_total - d.monto_pagado); }, 0);
        var totalPasivoOrig = pasivos.reduce(function(s, d) { return s + d.monto_total; }, 0);
        var pctLibre = totalPasivoOrig > 0 ? ((1 - totalPasivo / totalPasivoOrig) * 100).toFixed(0) : 100;

        // Inversiones este mes
        var { data: invData } = await supabase.from('gastos').select('monto')
          .eq('user_id', deviceId).eq('categoria', 'inversion')
          .gte('fecha', monthStart).lte('fecha', today);
        var totalInv = (invData || []).reduce(function(s, x) { return s + x.monto; }, 0);

        var diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        var diasTranscurridos = new Date().getDate();
        var diarioPromedio = diasTranscurridos > 0 ? ((iMonto - gMonto - gasMonto) / diasTranscurridos) : 0;
        var proyeccionMensual = diarioPromedio * diasMes;

        var html =
          '<div style="padding:8px 0;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
              '<div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">' +
                '<div style="font-size:11px;color:var(--text-dim);">🟢 Ingresos</div>' +
                '<div style="font-size:20px;font-weight:700;color:var(--ingreso);margin-top:4px;">S/ ' + iMonto.toFixed(0) + '</div>' +
              '</div>' +
              '<div style="background:var(--bg-input);padding:12px;border-radius:10px;text-align:center;">' +
                '<div style="font-size:11px;color:var(--text-dim);">🔴 Gastos</div>' +
                '<div style="font-size:20px;font-weight:700;color:var(--gasto);margin-top:4px;">S/ ' + (gMonto + gasMonto).toFixed(0) + '</div>' +
              '</div>' +
            '</div>' +

            '<div style="background:var(--bg-input);padding:14px;border-radius:10px;text-align:center;margin-top:10px;">' +
              '<div style="font-size:12px;color:var(--text-dim);">📊 Ganancia Neta del Mes</div>' +
              '<div style="font-size:28px;font-weight:700;margin-top:4px;color:' + (neto >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';">S/ ' + neto.toFixed(2) + '</div>' +
            '</div>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;">' +
              '<div style="background:var(--bg-input);padding:10px;border-radius:8px;text-align:center;">' +
                '<div style="font-size:10px;color:var(--text-dim);">📈 Promedio/día</div>' +
                '<div style="font-size:16px;font-weight:600;margin-top:2px;">S/ ' + diarioPromedio.toFixed(2) + '</div>' +
              '</div>' +
              '<div style="background:var(--bg-input);padding:10px;border-radius:8px;text-align:center;">' +
                '<div style="font-size:10px;color:var(--text-dim);">📅 Proy. mensual</div>' +
                '<div style="font-size:16px;font-weight:600;color:' + (proyeccionMensual >= 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';margin-top:2px;">S/ ' + proyeccionMensual.toFixed(0) + '</div>' +
              '</div>' +
              '<div style="background:var(--bg-input);padding:10px;border-radius:8px;text-align:center;">' +
                '<div style="font-size:10px;color:var(--text-dim);">🌱 Inversiones</div>' +
                '<div style="font-size:16px;font-weight:600;color:var(--green);margin-top:2px;">S/ ' + totalInv.toFixed(0) + '</div>' +
              '</div>' +
            '</div>' +

            '<div style="margin-top:12px;padding:10px;background:var(--bg-input);border-radius:8px;">' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">' +
                '<span style="color:var(--text-dim);">🌀 Total pasivos</span>' +
                '<span style="font-weight:600;color:var(--deuda);">S/ ' + totalPasivo.toFixed(0) + '</span>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">' +
                '<span style="color:var(--text-dim);">✅ Liberado</span>' +
                '<span style="font-weight:600;color:var(--green);">' + pctLibre + '%</span>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">' +
                '<span style="color:var(--text-dim);">📆 Días del mes</span>' +
                '<span>' + diasTranscurridos + '/' + diasMes + '</span>' +
              '</div>' +
              pasivos.slice(0, 3).map(function(d) {
                var rest = d.monto_total - d.monto_pagado;
                return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-top:1px solid rgba(255,255,255,0.05);">' +
                  '<span>' + esc(d.nombre) + '</span>' +
                  '<span style="color:var(--deuda);">S/ ' + rest.toFixed(0) + '</span>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>';

        document.getElementById('resumen-contenido').innerHTML = html;
        showModal('modal-resumen');
      } catch (e) {
        toast('Error de conexión', 'error');
      }
    }

    async function showPresupuesto() {
      var today = new Date().toISOString().split('T')[0];
      var { data } = await supabase.from('presupuestos').select('*')
        .eq('user_id', deviceId)
        .lte('fecha_inicio', today).gte('fecha_fin', today);
      var container = document.getElementById('presupuestos-activos');
      if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dim);font-size:14px;">Sin presupuestos activos esta semana</p>';
      } else {
        var html = '<h4 style="font-size:14px;color:var(--text-dim);margin-bottom:8px;">Activos esta semana:</h4>';
        for (var i = 0; i < data.length; i++) {
          var p = data[i];
          var pct = p.monto_limite > 0 ? ((p.monto_gastado / p.monto_limite) * 100) : 0;
          var barColor = pct < 50 ? 'var(--ingreso)' : (pct < 80 ? '#ffa500' : 'var(--gasto)');
          var restante = p.monto_limite - p.monto_gastado;
          html += '<div style="padding:10px;background:var(--bg-input);border-radius:10px;margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
              '<span style="font-weight:500;">' + esc(p.categoria) + '</span>' +
              '<span style="font-size:13px;color:' + barColor + ';">' + pct.toFixed(0) + '% usado</span>' +
            '</div>' +
            '<div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-bottom:6px;">' +
              '<div style="height:100%;width:' + Math.min(pct, 100) + '%;background:' + barColor + ';border-radius:3px;transition:width 0.3s;"></div>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;">' +
              '<span style="color:var(--text-dim);">S/ ' + p.monto_gastado.toFixed(2) + ' gastado</span>' +
              '<span style="color:' + (restante > 0 ? 'var(--ingreso)' : 'var(--gasto)') + ';">S/ ' + Math.max(restante, 0).toFixed(2) + ' restante</span>' +
            '</div>' +
          '</div>';
        }
        container.innerHTML = html;
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
      if (isNaN(monto) || monto <= 0) { toast('Monto inválido', 'error'); return; }
      var { error } = await supabase.from('presupuestos').insert({
        user_id: deviceId, categoria: categoria, monto_limite: monto,
        fecha_inicio: hoy.toISOString().split('T')[0], fecha_fin: fin.toISOString().split('T')[0]
      });
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      toast('Presupuesto creado', 'success');
      hideModal('modal-presupuesto');
      document.getElementById('form-presupuesto').reset();
      showPresupuesto();
    }

    // =============================================
    // PRESUPUESTOS VIVOS — auto-sync
    // =============================================
    async function actualizarPresupuesto(categoria, monto) {
      try {
        var today = new Date().toISOString().split('T')[0];
        var { data } = await supabase.from('presupuestos').select('id, monto_gastado')
          .eq('user_id', deviceId).eq('categoria', categoria)
          .lte('fecha_inicio', today).gte('fecha_fin', today);
        if (data && data.length > 0) {
          var nuevo = (data[0].monto_gastado || 0) + monto;
          await supabase.from('presupuestos').update({ monto_gastado: nuevo }).eq('id', data[0].id);
        }
      } catch (e) { /* silencioso */ }
    }

    // =============================================
    // UTILS
    // =============================================
    function showModal(id) { document.getElementById(id).style.display = 'flex'; }
    function hideModal(id) { document.getElementById(id).style.display = 'none'; }

    function toast(msg, type) {
      type = type || 'success';
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast ' + type + ' show';
      setTimeout(function() { t.classList.remove('show'); }, 3000);
    }
  }
})();
