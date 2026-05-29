# 🚀 CRIPTA Web — Plan de Ejecución Senior

**Versión:** 1.0  
**Autor:** Ingeniería  
**Estado:** 🔵 EN EJECUCIÓN  
**Stack:** Vanilla JS + Supabase + Vercel  

---

## 1. RESUMEN EJECUTIVO

Migración del bot de Telegram CRIPTA (SQLite + Python) a aplicación web moderna (Supabase + Vercel). Sin login, device-based, zero-dependency frontend.

**Objetivo de negocio:** Un repartidor en Lima necesita saber en <2 taps cuánto ganó hoy, cuánto debe, y cuánto falta para salir del hueco.

**Métrica clave (KPI):** Tiempo para registrar un movimiento ≤ 5 segundos.

---

## 2. DIAGNÓSTICO — Estado Actual

### 2.1 Infraestructura

| Componente | Estado | Observaciones |
|---|---|---|
| **Supabase (PostgreSQL)** | ✅ Operativo | 8 tablas, políticas RLS abiertas (single-user) |
| **Vercel (Hosting)** | ✅ Deploy automático | GitHub → Vercel auto-deploy |
| **GitHub (Repo)** | ✅ Público | `jecartechnologys-web/cripta-web` |
| **SQLite heredado (bot)** | 🗄️ Migrado | 8 deudas + 1 presupuesto → Supabase |
| **Spec-Kit** | ✅ Inicializado | Constitution, SPEC, PLAN documentados |

### 2.2 Feature Parity (Bot vs Web)

| Área | Bot (Python) | Web (actual) | Gap |
|---|---|---|---|
| Registrar ingreso/gasto | ✅ | ✅ | — |
| Modo rápido texto libre | ❌ | ✅ **(NUEVO)** | Web gana |
| Gasolina (litros + km) | ✅ | ✅ | — |
| Dashboard neto diario | ✅ | ✅ | — |
| Resumen mensual completo | ✅ | ✅ **(NUEVO)** | Web gana |
| **Presupuestos vivos** | ✅ | ⚠️ No actualiza `monto_gastado` | **GAP** |
| Gráficos visuales | ✅ (/grafico) | ❌ | **GAP** |
| Meta diaria inteligente | ✅ | ⚠️ Solo básica | **GAP** |
| Exportar CSV | ✅ | ✅ | — |
| Eliminar deuda | ✅ | ✅ **(NUEVO)** | — |

---

## 3. FASES DE EJECUCIÓN

### 🟢 FASE 0 — ESTABILIZACIÓN (COMPLETADA ✅)

| Tarea | Esfuerzo | Estado | Commit |
|---|---|---|---|
| Conexión Supabase verificada | 15min | ✅ | — |
| UUID fix (deviceId → UUIDv4) | 30min | ✅ | `ace1546` |
| `ensureUser()` upsert en init | 15min | ✅ | `ace1546` |
| Schema: user_id TEXT (no UUID) | 30min | ✅ | `ace1546` |
| RLS open policies (anon write) | 15min | ✅ | Aplicado por usuario |
| Spec-Kit init (constitution, SPEC, PLAN) | 1h | ✅ | `ace1546` |
| AGENTS.md con referencias spec-kit | 10min | ✅ | `ace1546` |
| .gitignore robusto | 5min | ✅ | `ace1546` |
| CSP + headers seguridad | 15min | ✅ | Desde v1.0 |
| Gasolina insert: `monto`→`costo` 🐛 | 10min | ✅ | `121c739` |
| Modo Rápido (texto libre) | 45min | ✅ | `fd517c3` |
| Eliminar deuda 🗑️ | 20min | ✅ | `fd517c3` |
| Resumen financiero completo | 1h | ✅ | `fd517c3` |
| Migración datos SQLite→Supabase | 30min | ✅ | Ejecutado |
| URL param `?device_id=` | 15min | ✅ | `99c60be` |

**Total Fase 0: ~5h | Estado: ✅ COMPLETADA**

---

### 🟡 FASE 1 — PARIDAD CON BOT (COMPLETADA ✅)

#### P1.1 Presupuestos Vivos (Prioridad: ALTA ✅)
```yaml
escenario: >
  Usuario registra gasto de S/20 en "comida".
  La app busca presupuesto activo de "comida",
  suma S/20 a monto_gastado, y muestra barra de progreso.
```

**Implementación:** ✅ Completada
- `actualizarPresupuesto()` busca presupuestos activos por categoría
- Se llama automáticamente desde `handleMovimiento()` y Modo Rápido
- `showPresupuesto()` mejorado con barra de progreso (verde <50%, naranja <80%, rojo >80%)
- Commit: `5b6a3c5`

---

#### P1.2 Meta Diaria Inteligente (Prioridad: MEDIA ✅)
```yaml
escenario: >
  Usuario tiene 3 deudas activas con fechas límite.
  La app calcula cuánto debe ganar por día para
  pagar todo a tiempo, priorizando por interés.
```

**Implementación:** ✅ Completada
- Muestra meta diaria + factibilidad vs promedio real de 30 días
- Barra de progreso de % ingreso destinado a deudas
- Ranking de deudas ordenado por tasa de interés
- Sugerencia: "Si hoy ganas S/120, destina S/45 a deudas"
- Proyección a 30 días ("Al paso actual, tendrías S/X libre")
- Commit: `5b6a3c5`

---

#### P1.3 Gráfico Canvas 7 Días (Prioridad: MEDIA ✅)
```yaml
escenario: >
  Dashboard muestra minigráfico de barras con
  ganancia neta de los últimos 7 días. Sin librerías.
```

**Implementación:** ✅ Completada
- `<canvas>` nativo en dashboard, sin dependencias
- 7 barras: verde (neto > 0), rojo (neto < 0)
- Etiquetas con fecha + monto sobre cada barra
- Retina-ready (devicePixelRatio), responsive
- Mensaje vacío si no hay datos
- Commit: `5b6a3c5`

---

### 🟠 FASE 2 — ANALYTICS & DIARIO (FUTURO)

#### P2.1 Diario Financiero (Prioridad: BAJA)
- Cron job diario que calcula resumen del día
- Almacena en nueva tabla `diario`
- Muestra timeline en web app

#### P2.2 Notificaciones Diarias
- Usar Telegram bot existente para enviar resumen diario
- "Hoy ganaste S/85, gastaste S/32, te quedan 23 días para pagar SUNAT"

#### P2.3 Sesiones por Fecha
- Poder ver histórico de un día específico
- Selector de fecha en dashboard

---

## 4. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Pérdida de datos SQLite | 🟢 Baja | 🔴 Alto | Backup `~/.cripta.db` ya migrado |
| Token Supabase expuesto | 🟡 Media | 🟡 Medio | Solo anon key (público por diseño). Service role key NUNCA en frontend |
| RLS mal configurado expone datos | 🟢 Baja | 🔴 Alto | Single-user app. Open policies aceptables. |
| Vercel deploy rompe algo | 🟡 Media | 🟡 Medio | Rollback: `git revert HEAD && git push` |
| Usuario pierde localStorage | 🟡 Media | 🟡 Medio | Usar `?device_id=` param para recuperar |
| Sin conexión a internet | 🟡 Media | 🟡 Medio | App no funciona offline (futuro: Service Worker) |

---

## 5. MÉTRICAS DE ÉXITO

| Métrica | Target | Cómo se mide |
|---|---|---|
| Tiempo registrar movimiento | ≤ 5s | Stopwatch manual |
| Taps para ver ganancia neta | ≤ 2 | Conteo de interacciones |
| Dashboard carga en 3G | ≤ 3s | DevTools → Network throttling |
| Sin errores en consola | 0 | `console.error` count |
| Datos persisten entre sesiones | ✅ | Abrir/cerrar navegador |
| Responsive 320px-1024px | ✅ | Chrome DevTools device toolbar |

---

## 6. ARQUITECTURA TÉCNICA (POST-MIGRACIÓN)

```
┌─────────────────────────────────────────┐
│              Navegador (Mobile)         │
│  ┌─────────────────────────────────┐    │
│  │  app.js (908 líneas)            │    │
│  │  ├── IIFE + 'use strict'        │    │
│  │  ├── getDeviceId() → UUIDv4     │    │
│  │  ├── waitForSupabase() → poll   │    │
│  │  ├── ensureUser() → upsert      │    │
│  │  ├── handleMovimiento()         │    │
│  │  ├── modoRapido() → NLP básico  │    │
│  │  ├── loadDashboard()            │    │
│  │  ├── loadDeudas() + CRUD        │    │
│  │  ├── showResumen()              │    │
│  │  ├── showMeta()                 │    │
│  │  └── esc() sanitizer            │    │
│  └─────────────────────────────────┘    │
└──────────────┬──────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────┐
│           Supabase Cloud                │
│  ┌─────────────────────────────────┐    │
│  │  PostgreSQL 16 + RLS abiertas   │    │
│  │  ├── usuarios (TEXT PK)         │    │
│  │  ├── ingresos / gastos          │    │
│  │  ├── gasolina (costo)           │    │
│  │  ├── deudas / pagos_deuda       │    │
│  │  ├── presupuestos               │    │
│  │  └── metas                      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 7. CHECKLIST DE DEPLOY A PRODUCCIÓN

### Pre-deploy
- [x] Schema SQL aplicado en Supabase
- [x] Políticas RLS creadas
- [x] Anon key verificada (curl test)
- [x] Vercel.json con headers CSP
- [x] .gitignore configurado
- [x] AGENTS.md con referencias spec-kit
- [x] Datos SQLite migrados a Supabase

### Post-deploy
- [ ] Probar registro de ingreso (formulario)
- [ ] Probar Modo Rápido ("gaste 20 en gasolina")
- [ ] Probar creación/eliminación de deuda
- [ ] Probar Resumen Financiero
- [ ] Probar en celular real (no emulador)
- [ ] Probar en 3G (DevTools throttling)
- [ ] Verificar 0 errores en consola
- [ ] Verificar datos persisten al recargar

---

## 8. ÓRDENES DE EJECUCIÓN RECOMENDADAS

Basado en costo/esfuerzo vs impacto:

| Orden | Feature | Esfuerzo | Impacto | Prioridad |
|---|---|---|---|---|
| 1️⃣ | Presupuestos Vivos | 30min | 🔴 Alto | **AHORA** |
| 2️⃣ | Gráfico Canvas 7d | 1h | 🟡 Medio | **PRÓXIMO** |
| 3️⃣ | Meta Inteligente | 45min | 🟡 Medio | **PRÓXIMO** |
| 4️⃣ | Diario Financiero | 2h | 🟢 Bajo | **FUTURO** |
| 5️⃣ | Notificaciones | 3h | 🟢 Bajo | **FUTURO** |

---

*Documento generado: 2026-05-29 | Próxima revisión: post-Fase 1*
