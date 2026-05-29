# CRIPTA Constitution

## Core Principles

### I. Datos Primero, Opinionismo Cero
Cada feature debe resolver un problema real de un repartidor en Lima. Si no hay datos que lo soporten, no se construye. Las decisiones se basan en feedback de usuarios, no en suposiciones del desarrollador.

### II. Simpleza Brutal
Si se puede hacer en 10 líneas, no hacerlo en 100. CRIPTA es una herramienta, no una plataforma. Sin abstracciones innecesarias, sin patrones de diseño por decorado. Código que un repartidor podría entender si supiera leer JS.

### III. Mobile-First, Siempre
El 99% de los usuarios acceden desde celular. Cada decisión de UI asume pantalla de 5 pulgadas, dedos grasosos, y conexión lenta. Desktop es el caso edge, no el principal.

### IV. Costo Cero, Escalable
Firebase Spark tier, Supabase free, Vercel free. CRIPTA debe funcionar sin presupuesto. Si una feature requiere pago, documentar por qué y cuándo se justifica escalar.

### V. Offline-First (futuro)
Los repartidores no siempre tienen señal. Cada feature debe pensar en: ¿qué pasa si se corta internet? LocalStorage → sync cuando haya red.

## Stack Tecnológico

- **Frontend**: HTML + CSS + JavaScript (vanilla, sin framework)
- **Backend**: Supabase (Auth + DB + RLS)
- **Deploy**: Vercel (static hosting)
- **Repo**: GitHub
- **Runtime**: Browser moderno (Chrome 90+, Safari 14+)

## Restricciones

- Sin frameworks JS (React, Vue, Angular) — vanilla only
- Sin build step (no Webpack, no Vite) — archivos estáticos directos
- Sin dependencias npm en runtime — solo Supabase CDN
- Máximo 3 archivos JS (app.js, utils.js, charts.js)
- CSS en un solo archivo, sin preprocesador

## Workflow

1. **Spec first** — documentar antes de codear
2. **Commit atómico** — un feature por commit
3. **Test manual** — probar en celular antes de push
4. **Deploy automático** — push a main = deploy a producción
5. **Rollback rápido** — si algo rompe, revert inmediato

## Governance

- Constitution rige sobre todas las decisiones técnicas
- Cambios a stack requieren documentación de por qué
- Cada PR debe incluir: qué cambió, por qué, cómo probarlo
- Version: 1.0.0 | Ratified: 2026-05-28 | Last Amended: 2026-05-28
