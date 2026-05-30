# CRIPTA Web — Plan de Implementación por Fases

> **Proyecto**: Consola financiera para repartidor de moto (Lima, Perú)
> **Stack**: HTML+CSS+JS vanilla, Supabase, Vercel, sin auth (device-based ID)
> **Estado actual**: ~50% funcional — dashboard, registro movimientos, pasivos, inversiones, modo rápido, presupuestos, proyecciones, exportar CSV
> **Última actualización**: 2026-05-30

---

## Resumen de Fases

| Fase | Nombre | Esfuerzo | Dependencias | Prioridad |
|------|--------|----------|--------------|-----------|
| 1 | Documentación y Calidad | M | Ninguna | 🔴 Alta |
| 2 | Metas de Ahorro | S | Fase 1 | 🟡 Media |
| 3 | Rendimiento Gasolina | M | Fase 1 | 🟡 Media |
| 4 | Recordatorios Telegram (Dobby) | L | Ninguna | 🟢 Baja |
| 5 | Dashboard Avanzado | XL | Fase 1 | 🟡 Media |
| 6 | Testing y QA | L | Fase 1 | 🔴 Alta |
| 7 | PWA y Offline | L | Fase 6 | 🟢 Baja |
| 8 | Documentación Técnica | M | Fase 1 | 🟢 Baja |

**Leyenda de esfuerzo**: S = < 1 semana · M = 1-2 semanas · L = 2-4 semanas · XL = > 4 semanas

---

## Fase 1: Documentación y Calidad

**Esfuerzo**: M (1-2 semanas)
**Dependencias**: Ninguna
**Prioridad**: 🔴 Alta — sienta las bases para todo el desarrollo futuro

### Descripción

Estandarizar la base del código, documentar la API pública de cada módulo, y establecer un flujo de trabajo profesional con commits semánticos. Todo nuevo desarrollo se construirá sobre esta base.

### Tareas

#### 1.1 JSDoc completo en todos los archivos JS

- **1.1.1** Documentar `app.js` (~995 líneas):
  - Tipado JSDoc para todas las funciones (`@param`, `@returns`, `@type`)
  - Documentar el flujo de inicialización y ciclo de vida de la app
  - Etiquetar funciones internas vs exportadas
- **1.1.2** Documentar `db.js`:
  - Especificar tipos de retorno de cada query Supabase
  - Documentar los filtros, joins y ordenamientos usados
  - Indicar qué tablas consulta cada función
- **1.1.3** Documentar `ui.js`:
  - Parámetros y comportamiento de modales, toasts, confirm dialog
  - Documentar la función de sanitización `esc()` con ejemplos
- **1.1.4** Documentar `parser.js`:
  - Formato esperado del NLP de Modo Rápido
  - Categorías soportadas y sus alias
  - Ejemplos de entrada → salida esperada
- **1.1.5** Documentar `styles.css`:
  - Secciones con comentarios claros
  - Variables CSS documentadas
  - Breakpoints y responsividad

**Criterios de aceptación**:
- [ ] Cada archivo JS tiene JSDoc en todas las funciones públicas
- [ ] No hay warnings de tipos en el editor (VS Code IntelliSense)
- [ ] La documentación es legible desde el IDE sin abrir el archivo

#### 1.2 README.md profesional

- **1.2.1** Crear `README.md` en la raíz del proyecto
- **1.2.2** Incluir: descripción del proyecto, stack, captura de pantalla, instrucciones de uso, enlaces a producción y repo, badges de estado
- **1.2.3** Sección de "Cómo contribuir" básica
- **1.2.4** Sección de licencia (MIT sugerida)

**Criterios de aceptación**:
- [ ] README renderiza correctamente en GitHub
- [ ] Incluye al menos una captura o mockup de la app
- [ ] Enlaces funcionales a producción y repo

#### 1.3 Commits semánticos convencionales

- **1.3.1** Definir convención: `tipo(alcance): descripción` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`)
- **1.3.2** Aplicar a todos los commits futuros
- **1.3.3** Configurar hook de commit-msg (opcional) para validar formato
- **1.3.4** Estandarizar mensajes en español (o inglés, decidir y documentar)

**Criterios de aceptación**:
- [ ] Últimos 10 commits siguen el formato convencional
- [ ] Se documenta la convención en `CONTRIBUTING.md` o README

#### 1.4 Auditoría de rendimiento y seguridad

- **1.4.1** Auditar CSP headers en `vercel.json`
- **1.4.2** Verificar que solo carga scripts de jsDelivr y Supabase
- **1.4.3** Ejecutar Lighthouse audit (mobile + desktop)
- **1.4.4** Verificar que no hay fugas de información en consola
- **1.4.5** Revisar que `sanitize()` / `esc()` se usa en todo `innerHTML`
- **1.4.6** Verificar que el device ID en localStorage no es predecible

**Criterios de aceptación**:
- [ ] Lighthouse score ≥ 90 en Performance, Accessibility, Best Practices
- [ ] CSP bloquea cualquier intento de inyección de script externo
- [ ] No hay `console.log` de datos sensibles en producción

---

## Fase 2: Metas de Ahorro

**Esfuerzo**: S (< 1 semana)
**Dependencias**: Fase 1 (documentación)
**Prioridad**: 🟡 Media — funcionalidad completa pero no crítica

### Descripción

La tabla `metas` ya existe en Supabase pero no tiene interfaz de usuario. Esta fase implementa el CRUD completo de metas de ahorro con seguimiento visual.

### Tareas

#### 2.1 UI para crear metas

- **2.1.1** Formulario modal "Nueva Meta" desde el dashboard
- **2.1.2** Campos: nombre, monto objetivo (S/), fecha límite (datepicker)
- **2.1.3** Validación: monto > 0, fecha futura
- **2.1.4** Guardar en tabla `metas` vía `db.js`
- **2.1.5** Lista de metas activas con opción de editar/eliminar

#### 2.2 Barra de progreso en dashboard

- **2.2.1** Calcular progreso: `SUM(ingresos - gastos - gasolina)` desde fecha_inicio hasta hoy
- **2.2.2** Renderizar barra de progreso con porcentaje y monto restante
- **2.2.3** Animación suave al actualizar
- **2.2.4** Mostrar tarjeta de meta activa más cercana en la parte superior del dashboard

#### 2.3 Notificación al cumplir meta

- **2.3.1** Detectar cuando `monto_ahorrado >= monto_objetivo`
- **2.3.2** Mostrar modal/celebration con 🎉
- **2.3.3** Opción de "Establecer nueva meta" desde el modal
- **2.3.4** Marcar la meta como completada en DB (`completada = true`)

**Criterios de aceptación**:
- [ ] Crear meta con nombre, monto y fecha límite
- [ ] Barra de progreso visible en el dashboard
- [ ] Al cumplir la meta, aparece notificación visual
- [ ] Editar/eliminar metas existentes
- [ ] Datos persisten en Supabase

---

## Fase 3: Rendimiento Gasolina

**Esfuerzo**: M (1-2 semanas)
**Dependencias**: Fase 1 (documentación)
**Prioridad**: 🟡 Media — funcionalidad valiosa para repartidores

### Descripción

Los repartidores de moto necesitan saber el rendimiento de su vehículo. La tabla `gasolina` ya registra litros y km_recorridos. Esta fase agrega cálculos de eficiencia y visualización histórica.

### Tareas

#### 3.1 Cálculo y visualización de km/l

- **3.1.1** Calcular km/l promedio: `SUM(km_recorridos) / SUM(litros)`
- **3.1.2** Usar la función `rendimiento_km_l()` ya existente en PostgreSQL
- **3.1.3** Mostrar tarjeta "Rendimiento" en el dashboard con km/l actual
- **3.1.4** Indicador de eficiencia: bueno (>40 km/l), normal (30-40), bajo (<30)

#### 3.2 Histórico de rendimiento

- **3.2.1** Vista de histórico en la sección Gasolina
- **3.2.2** Tabla paginada con cada registro: fecha, litros, km, costo, km/l
- **3.2.3** Promedio móvil de últimos 5 registros

#### 3.3 Gráfico de tendencia

- **3.3.1** Gráfico de línea con Chart.js (CDN) de km/l por fecha
- **3.3.2** Eje Y: km/l, Eje X: fechas de los registros
- **3.3.3** Línea de promedio general como referencia
- **3.3.4** Tooltip al hover con detalle del registro

**Criterios de aceptación**:
- [ ] km/l visible en dashboard y en vista detalle
- [ ] Tabla histórica con todos los registros de gasolina
- [ ] Gráfico de tendencia interactivo
- [ ] Datos actualizados al agregar nuevo registro de gasolina
- [ ] Nota: Constitution dice "máximo 3 archivos JS", evaluar si Chart.js cuenta como dependencia externa

---

## Fase 4: Recordatorios Telegram (Dobby)

**Esfuerzo**: L (2-4 semanas)
**Dependencias**: Ninguna (paralelizable con Fase 1)
**Prioridad**: 🟢 Baja — feature nice-to-have

### Descripción

Conexión con el bot Dobby (@Dobby_Agente_bot) para enviar recordatorios automáticos de pago de pasivos y resúmenes semanales vía Telegram. Requiere una Edge Function en Supabase para actuar como webhook o scheduler.

### Tareas

#### 4.1 Conexión con Dobby Bot (@Dobby_Agente_bot)

- **4.1.1** Crear Edge Function en Supabase (`telegram-bot`)
- **4.1.2** Configurar webhook de Telegram para recibir comandos
- **4.1.3** Implementar comando `/start` que registra el chat_id con el user_id
- **4.1.4** Almacenar relación user_id ↔ chat_id en nueva tabla `telegram_chats`
- **4.1.5** Comando `/mi_cripta` que responde con resumen rápido del día

#### 4.2 Recordatorios de pago de pasivos (1 día antes)

- **4.2.1** Cron diario (pg_cron o Supabase scheduled function) que consulta deudas con `fecha_limite = tomorrow`
- **4.2.2** Para cada deuda próxima a vencer, enviar mensaje Telegram:
  ```
  ⏰ Recordatorio: mañana vence "Nombre Deuda" — S/ 500.00
  Pagado: S/ 200.00 | Restante: S/ 300.00
  ```
- **4.2.3** Incluir botón inline "Marcar como pagada" (callback query)
- **4.2.4** Manejar el callback para actualizar estado en DB

#### 4.3 Resumen semanal cada domingo

- **4.3.1** Cron semanal (domingo 8 PM) para todos los usuarios registrados
- **4.3.2** Generar mensaje con:
  - Ganancia neta de la semana
  - Total ingresado
  - Total gastado
  - Gasolina consumida
  - Deudas pagadas
  - Meta semanal cumplida (si aplica)
- **4.3.3** Formatear mensaje en Markdown amigable para Telegram

**Criterios de aceptación**:
- [ ] Comando `/start` registra chat_id en DB
- [ ] Comando `/mi_cripta` responde con datos reales del usuario
- [ ] Recordatorio automático 1 día antes de cada vencimiento
- [ ] Resumen semanal cada domingo
- [ ] Botón inline "Marcar como pagada" funciona
- [ ] Mensajes en español, claros y con emojis

---

## Fase 5: Dashboard Avanzado

**Esfuerzo**: XL (> 4 semanas)
**Dependencias**: Fase 1 (documentación)
**Prioridad**: 🟡 Media — mejora significativa de UX

### Descripción

El dashboard actual muestra métricas básicas. Esta fase lo transforma en un panel de control avanzado con visualizaciones, filtros por plataforma, y automatización de gastos recurrentes.

### Tareas

#### 5.1 Gráfico pastel de gastos por categoría

- **5.1.1** Agregar Chart.js vía CDN (evaluar si rompe la regla de "máximo 3 JS" — si es necesario, refactorizar)
- **5.1.2** Query para agrupar gastos del mes por categoría
- **5.1.3** Gráfico pastel interactivo en la sección de dashboard
- **5.1.4** Leyenda con montos y porcentajes
- **5.1.5** Tooltip al hacer hover

#### 5.2 Control por plataforma (Rappi/Uber/PedidosYa)

- **5.2.1** Agregar campo `plataforma` a la tabla `ingresos` (requiere migración)
- **5.2.2** Posibles valores: `'rappi'`, `'uber'`, `'pedidosya'`, `'mandadito'`, `'otros'`
- **5.2.3** Filtro en el formulario de ingreso para seleccionar plataforma
- **5.2.4** Dashboard: sección "Por Plataforma" con tarjetas de:
  - Ingresos del mes por plataforma
  - Promedio diario por plataforma
  - Número de pedidos/deliveries
- **5.2.5** Gráfico de barras comparativo entre plataformas

#### 5.3 Gastos recurrentes automáticos

- **5.3.1** Nueva tabla `gastos_recurrentes` en Supabase:
  ```sql
  CREATE TABLE gastos_recurrentes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES usuarios(id),
    descripcion TEXT NOT NULL,
    monto NUMERIC NOT NULL,
    categoria TEXT DEFAULT 'general',
    frecuencia TEXT NOT NULL CHECK (frecuencia IN ('diario', 'semanal', 'quincenal', 'mensual')),
    ultimo_generado DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **5.3.2** UI para crear/editar/eliminar gastos recurrentes
- **5.3.3** Lógica que al cargar el dashboard revisa si hay gastos recurrentes pendientes de generar
- **5.3.4** Si el gasto recurrente vence hoy, preguntar: "¿Registrar gasto de S/ XX por 'Descripción'?"
- **5.3.5** Auto-generar con confirmación del usuario

**Criterios de aceptación**:
- [ ] Gráfico pastel muestra distribución de gastos del mes
- [ ] Formulario de ingreso permite seleccionar plataforma
- [ ] Dashboard muestra métricas por plataforma
- [ ] Gastos recurrentes se generan automáticamente (con confirmación)
- [ ] No hay regresión en funcionalidad existente
- [ ] Performance: dashboard carga en < 3s incluso con 3 gráficos

---

## Fase 6: Testing y QA

**Esfuerzo**: L (2-4 semanas)
**Dependencias**: Fase 1 (documentación y calidad)
**Prioridad**: 🔴 Alta — garantiza estabilidad antes de features avanzadas

### Descripción

Establecer una suite de pruebas automatizadas para asegurar que la app no se rompa con los cambios. Incluye tests unitarios, de integración, y de seguridad.

### Tareas

#### 6.1 Tests unitarios con Jest

- **6.1.1** Configurar Jest + jsdom para pruebas en Node.js
- **6.1.2** Tests para `parser.js`:
  - Parseo de "cena 15" → `{ tipo: 'gasto', monto: 15, categoria: 'comida' }`
  - Parseo de "+50 rappi" → `{ tipo: 'ingreso', monto: 50, plataforma: 'rappi' }`
  - Parseo de "gas 8.5 litros 1.2km" → `{ tipo: 'gasolina', litros: 8.5, km: 1.2 }`
  - Edge cases: montos con decimales, strings vacíos, categorías inválidas
- **6.1.3** Tests para `ui.js`:
  - `esc()` sanitiza correctamente HTML
  - `mostrarToast()` inserta y remueve el DOM correctamente
  - `confirmar()` resuelve promesa correctamente
- **6.1.4** Tests para utilidades matemáticas en `app.js`:
  - Cálculos de ganancia neta
  - Cálculo de rendimiento km/l
  - Proyecciones y simulaciones

#### 6.2 Tests de integración con Supabase

- **6.2.1** Configurar entorno de test con Supabase branch (aislado)
- **6.2.2** Tests para `db.js`:
  - CRUD en tabla `ingresos`
  - CRUD en tabla `gastos`
  - CRUD en tabla `gasolina`
  - CRUD en tabla `deudas` y `pagos_deuda`
  - CRUD en tabla `presupuestos`
  - CRUD en tabla `metas`
- **6.2.3** Tests de funciones PostgreSQL:
  - `ganancia_neta()` devuelve valores correctos
  - `rendimiento_km_l()` calcula correctamente
- **6.2.4** Tests de edge cases: device ID vacío, fechas inválidas, montos negativos

#### 6.3 Validación de RLS policies

- **6.3.1** Script de pruebas que verifica:
  - Usuario A NO puede ver datos del usuario B
  - Usuario B NO puede modificar datos del usuario A
  - Anon key puede leer/escribir solo su propio device_id
- **6.3.2** Verificar que DELETE en `usuarios` cascadea correctamente
- **6.3.3** Verificar que DELETE en `deudas` cascadea a `pagos_deuda`
- **6.3.4** Prueba de penetración básica: intentar SQL injection vía campos de texto

#### 6.4 Pruebas de carga y estrés

- **6.4.1** Configurar k6 o Artillery para simular:
  - 100 usuarios concurrentes consultando dashboard
  - 10 registros/segundo en horas pico
- **6.4.2** Verificar que Supabase free tier responde en < 500ms con 50 conexiones simultáneas
- **6.4.3** Identificar cuellos de botella y optimizar queries (índices, paginación)

**Criterios de aceptación**:
- [ ] Cobertura de tests > 70% en funciones críticas (db.js, parser.js)
- [ ] Todos los tests unitarios pasan en CI
- [ ] Tests de integración confirman aislamiento entre usuarios
- [ ] RLS policies no tienen fugas de datos
- [ ] App responde en < 3s bajo carga simulada de 50 usuarios
- [ ] Scripts de test documentados en README (cómo ejecutar)

---

## Fase 7: PWA y Offline

**Esfuerzo**: L (2-4 semanas)
**Dependencias**: Fase 6 (testing garantiza estabilidad)
**Prioridad**: 🟢 Baja — mejora de UX para usuarios con conectividad limitada

### Descripción

Transformar CRIPTA en una aplicación web progresiva (PWA) completa con funcionalidad offline-first. Los repartidores frecuentemente pierden señal en zonas de Lima. Esta fase asegura que la app funcione sin conexión y sincronice cuando la red esté disponible.

### Tareas

#### 7.1 Service Worker con caché de datos

- **7.1.1** Crear `public/sw.js` con estrategia cache-first para assets estáticos
- **7.1.2** Cachear: index.html, styles.css, app.js, db.js, ui.js, parser.js, manifest.json
- **7.1.3** Estrategia network-first para datos de Supabase (con fallback a cache)
- **7.1.4** Registrar SW desde `index.html` con registro condicional
- **7.1.5** Versioneo de cache para facilitar actualizaciones
- **7.1.6** Botón "Actualizar disponible" cuando se detecte nuevo SW

#### 7.2 Sincronización offline-first

- **7.2.1** Usar IndexedDB (via idb library o wrapper minimalista) como almacén local
- **7.2.2** Al crear un movimiento sin conexión:
  - Guardar en IndexedDB con flag `pending: true`
  - Mostrar en UI con indicador "⏳ Pendiente de sync"
- **7.2.3** Al recuperar conexión:
  - Sincronizar todos los registros pendientes a Supabase
  - Manejar conflictos (último escritor gana, con notificación)
  - Actualizar UI: quitar flag "pendiente"
- **7.2.4** Queue de reintentos con backoff exponencial (máx 3 intentos)
- **7.2.5** Indicador visual de estado de conexión en el header

#### 7.3 Notificaciones push

- **7.3.1** Configurar VAPID keys para push notifications
- **7.3.2** Edge Function para enviar notificaciones push
- **7.3.3** Notificaciones para: recordatorio de meta, deuda próxima a vencer
- **7.3.4** Manejar clic en notificación para abrir la app en la sección correspondiente
- **7.3.5** Botón de "Activar notificaciones" con solicitud de permiso

**Criterios de aceptación**:
- [ ] App carga completamente offline (después de primera visita)
- [ ] Registrar movimiento sin internet → aparece en UI como pendiente
- [ ] Al recuperar conexión, los datos se sincronizan automáticamente
- [ ] Indicador visual de online/offline en el header
- [ ] Notificaciones push aparecen en Android (Chrome)
- [ ] Service Worker registrado sin errores en consola
- [ ] Lighthouse PWA audit supera todos los checks

---

## Fase 8: Documentación Técnica

**Esfuerzo**: M (1-2 semanas)
**Dependencias**: Fase 1 (documentación base)
**Prioridad**: 🟢 Baja — documentación para contribuidores y mantenimiento futuro

### Descripción

Crear documentación técnica completa del proyecto: wiki, diagrama de arquitectura, y guía de contribución para que otros desarrolladores puedan entender y contribuir al proyecto.

### Tareas

#### 8.1 Wiki del proyecto

- **8.1.1** Habilitar GitHub Wiki en el repo
- **8.1.2** Páginas de wiki:
  - **Home**: Visión general y stack
  - **Setup local**: Cómo clonar, configurar variables de entorno, correr localmente
  - **Base de datos**: Diagrama ER, descripción de tablas, RLS policies
  - **Deploy**: Cómo hacer deploy a Vercel, configuración de Supabase
  - **Troubleshooting**: Problemas comunes y soluciones
  - **Roadmap**: Features planeadas y completadas
- **8.1.3** Vincular wiki desde README.md

#### 8.2 Diagrama de arquitectura

- **8.2.1** Crear diagrama de arquitectura (Mermaid.js o draw.io)
- **8.2.2** Incluir:
  - Browser → Vercel CDN → Supabase (flujo de datos)
  - Tablas y sus relaciones
  - Flujo de autenticación device-based
  - Flujo offline (Fase 7)
  - Flujo de Telegram Bot (Fase 4)
- **8.2.3** Guardar como `docs/architecture.md` y `docs/architecture.png`
- **8.2.4** Incluir diagrama en README.md

#### 8.3 Guía de contribución

- **8.3.1** Crear `CONTRIBUTING.md` en la raíz
- **8.3.2** Incluir:
  - Cómo reportar bugs
  - Cómo solicitar features
  - Flujo de PR: fork, branch, commit, push, PR
  - Convención de commits semánticos
  - Estándares de código (basados en Constitution)
  - Cómo ejecutar tests
  - Code review checklist
- **8.3.3** Crear templates de GitHub Issues:
  - `bug_report.md`
  - `feature_request.md`
- **8.3.4** Crear template de PR:
  - `pull_request_template.md`
- **8.3.5** Crear `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1)

**Criterios de aceptación**:
- [ ] Wiki en GitHub con mínimo 6 páginas
- [ ] Diagrama de arquitectura claro y actualizado
- [ ] CONTRIBUTING.md completo
- [ ] Templates de Issues y PR funcionando en GitHub
- [ ] Cualquier desarrollador nuevo puede configurar el proyecto en < 15 minutos siguiendo la guía

---

## Roadmap Visual

```
Fase 1 ── Documentación y Calidad ─────────────────────────────── 🔴
  │
  ├── Fase 2 ── Metas de Ahorro (S) ───────────────────────────── 🟡
  ├── Fase 3 ── Rendimiento Gasolina (M) ──────────────────────── 🟡
  │
  ├── Fase 5 ── Dashboard Avanzado (XL) ───────────────────────── 🟡
  │
  ├── Fase 6 ── Testing y QA (L) ──────────────────────────────── 🔴
  │   │
  │   └── Fase 7 ── PWA y Offline (L) ─────────────────────────── 🟢
  │
  ├── Fase 8 ── Documentación Técnica (M) ─────────────────────── 🟢
  │
Fase 4 ── Recordatorios Telegram (L) ── (paralelizable) ──────── 🟢
```

**Orden recomendado de implementación**:
1. **Fase 1** (base para todo)
2. **Fase 6** (testing antes de features complejas)
3. **Fase 2 + Fase 3** (en paralelo, independientes)
4. **Fase 5** (dashboard avanzado, consume los datos de fases anteriores)
5. **Fase 7** (offline, requiere estabilidad de Fase 6)
6. **Fase 8** (documentación final, puede hacerse en paralelo con Fase 7)
7. **Fase 4** (independiente, puede hacerse en cualquier momento)

---

## Notas técnicas

### Restricciones de Constitution que aplicar

| Restricción | Implicación en fases |
|-------------|---------------------|
| Sin frameworks JS | Fase 5 (Chart.js) y Fase 3 (gráficos) deben evaluar si librería CDN cuenta como "framework". Chart.js por CDN es aceptable como dependencia externa |
| Sin build step | Fase 6 (Jest) requiere Node.js solo para tests, no afecta build |
| Máximo 3 archivos JS | Actualmente hay 4 JS (`app.js`, `db.js`, `ui.js`, `parser.js`). Evaluar merge `parser.js` → `ui.js` o refactor. Fase 7 agrega `sw.js` que no cuenta como archivo de lógica |
| Costo cero | Fase 4 (Telegram Bot) puede requerir pg_cron que no está en free tier. Alternativa: Edge Function con `cron: true` en Supabase |
| Mobile-first | Todas las fases deben priorizar UX móvil. Fase 5 (dashboard avanzado) debe evitar sobrecargar la vista móvil |

### Migraciones de BD necesarias

| Fase | Tabla | Tipo | SQL |
|------|-------|------|-----|
| 4 | `telegram_chats` | CREATE | user_id TEXT, chat_id BIGINT, created_at TIMESTAMPTZ |
| 5 | `ingresos` | ALTER | ADD COLUMN plataforma TEXT DEFAULT 'otros' |
| 5 | `gastos_recurrentes` | CREATE | user_id, descripcion, monto, categoria, frecuencia, ultimo_generado, activo |
| 7 | IndexedDB | Client-side | Estructura en cliente (no afecta Supabase) |

### Estimaciones de carga Supabase

| Operación | Frecuencia estimada | Impacto |
|-----------|-------------------|---------|
| Dashboard load | Cada apertura de app (varias veces/día) | Medio |
| Registrar movimiento | 10-30 veces/día por usuario | Bajo |
| Recordatorio Telegram (F4) | 1 vez/día por usuario con deuda | Bajo |
| Resumen semanal (F4) | 1 vez/semana por usuario | Muy bajo |
| Sincronización offline (F7) | Variable, depende de conectividad | Medio-alto en picos |

---

> **Documento mantenido por**: Equipo CRIPTA
> **Próxima revisión**: Al completar cada fase
