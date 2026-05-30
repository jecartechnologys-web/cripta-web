# CRIPTA — Consola Financiera

> App financiera personal para repartidor de moto en Lima, Perú.
> Sin auth. Device-based. Gratis. Offline-ready.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JS vanilla (ES Modules) |
| Backend | Supabase (PostgreSQL + REST API) |
| Deploy | Vercel (Edge Network) |
| NLP | Parser propio de texto natural (Modo Rápido) |

## Estructura

```
cripta-web/
├── public/                  # Frontend estático
│   ├── index.html           # Entry point HTML
│   ├── app.js               # Orquestador principal (~1400 líneas)
│   ├── db.js                # Capa de datos Supabase (~950 líneas)
│   ├── ui.js                # Helpers UI (modales, toast, confirm)
│   ├── parser.js            # NLP de texto natural a transacción
│   ├── styles.css           # Tema dark glassmorphism (~670 líneas)
│   └── manifest.json        # PWA manifest
├── supabase.sql             # Schema SQL completo
├── PHASES.md                # Plan de implementación por fases
├── vercel.json              # Config de deploy
└── AGENTS.md                # Contexto para asistentes IA
```

## Supabase

- 8 tablas: `usuarios`, `ingresos`, `gastos`, `gasolina`, `deudas`, `pagos_deuda`, `metas`, `presupuestos`
- RLS allow-all (seguridad vía device ID aleatorio + CSP headers + anon key pública)
- 4 índices compuestos para performance
- 2 funciones PL/pgSQL: `ganancia_neta()` y `rendimiento_km_l()`

## Features

### Actuales
- 📊 Dashboard con neto diario, stats del mes, gráfico 7 días
- 💰 Registro de ingresos, gastos, gasolina con formulario + NLP
- 🌀 Gestión de pasivos (pagos, progreso, liberación)
- 🌱 Inversiones (categoría especial en gastos)
- 📅 Proyecciones y simulaciones financieras
- 📦 Presupuestos semanales por categoría
- 📥 Exportar CSV

### Próximas
Ver [PHASES.md](./PHASES.md) para el roadmap completo.

## Cómo correr local

```bash
# Servir estático (cualquier HTTP server)
npx serve public/

# O abrir directo (CORS puede fallar con Supabase)
# http://localhost:3000
```

## Cómo deployar

```bash
# Vercel (producción)
npx vercel --prod

# O solo push (CI/CD automático)
git push origin master
```

## Arquitectura

### Flujo de datos

```
Usuario → index.html → app.js (orquestador)
                          ├── db.js → Supabase REST API
                          ├── ui.js → DOM (modales, toast)
                          └── parser.js → NLP (texto natural)
```

### Seguridad

- Sin autenticación. Cada dispositivo genera un UUID v4 como ID.
- RLS allow-all con `USING (true) CHECK (true)` para anon key.
- CSP headers estrictos en Vercel.
- Sanitización de output (XSS) vía `esc()` y `escAttr()`.
- CSV injection protection en exportación.

## Convenciones

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `docs:` documentación
  - `refactor:` reestructuración sin cambio funcional
  - `style:` formato, estilos CSS
- **JSDoc**: Todos los módulos y funciones exportadas tienen JSDoc en español.
- **Lenguaje**: Español. Código financiero en terminología positiva (Pasivos, Liberar, Inversiones).

## Licencia

Uso personal — Jeanca Technologies.
