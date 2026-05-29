# CRIPTA — Plan de Implementación

## Arquitectura

```
┌─────────────────────────────────────────┐
│              Browser (Mobile)           │
│  ┌─────────────────────────────────┐    │
│  │         index.html              │    │
│  │  ┌──────────┐  ┌──────────┐    │    │
│  │  │ app.js   │  │ styles   │    │    │
│  │  │ (lógica) │  │ .css     │    │    │
│  │  └────┬─────┘  └──────────┘    │    │
│  │       │                         │    │
│  │  ┌────▼─────────────────────┐   │    │
│  │  │    Supabase JS Client    │   │    │
│  │  └────────────┬─────────────┘   │    │
│  └───────────────┼─────────────────┘    │
└──────────────────┼──────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────┐
│           Supabase Cloud                │
│  ┌─────────────────────────────────┐    │
│  │  PostgreSQL + RLS               │    │
│  │  - usuarios                     │    │
│  │  - ingresos                     │    │
│  │  - gastos                       │    │
│  │  - gasolina                     │    │
│  │  - deudas                       │    │
│  │  - pagos_deuda                  │    │
│  │  - presupuestos                 │    │
│  │  - metas                        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Stack

| Capa | Tecnología | Versión | Costo |
|------|-----------|---------|-------|
| Frontend | HTML/CSS/JS | Vanilla | $0 |
| CDN | jsDelivr | supabase-js@2 | $0 |
| Backend | Supabase | Free tier | $0 |
| DB | PostgreSQL | Supabase managed | $0 |
| Hosting | Vercel | Static | $0 |
| Repo | GitHub | Public | $0 |

## Estructura de Archivos

```
cripta-web/
├── public/
│   ├── index.html          # UI principal
│   ├── styles.css          # Estilos
│   ├── app.js              # Lógica principal
│   └── manifest.json       # PWA
├── supabase.sql            # Schema DB
├── vercel.json             # Config deploy
├── .specify/               # Spec-Kit
│   ├── memory/constitution.md
│   └── specs/SPEC.md
└── .gitignore
```

## Base de Datos

### Tablas

| Tabla | Propósito | RLS |
|-------|-----------|-----|
| usuarios | Perfil (opcional) | user_id = device_id |
| ingresos | Ingresos diarios | user_id = device_id |
| gastos | Gastos diarios | user_id = device_id |
| gasolina | Registros de tanqueo | user_id = device_id |
| deudas | Deudas activas/pagadas | user_id = device_id |
| pagos_deuda | Historial de pagos | via deudas FK |
| presupuestos | Límites semanales | user_id = device_id |
| metas | Metas diarias | user_id = device_id |

### Índices Recomendados

```sql
CREATE INDEX idx_ingresos_fecha ON ingresos(user_id, fecha);
CREATE INDEX idx_gastos_fecha ON gastos(user_id, fecha);
CREATE INDEX idx_gasolina_fecha ON gasolina(user_id, fecha);
CREATE INDEX idx_deudas_estado ON deudas(user_id, estado);
```

## Seguridad

- **RLS**: Cada tabla filtra por device_id
- **CSP**: Solo carga scripts de jsDelivr + Supabase
- **Sanitización**: `esc()` en todo innerHTML
- **Input validation**: Montos 1-999,999, strings max 200 chars
- **No auth**: Device ID en localStorage (trade-off aceptado para MVP)

## Performance

- **Target**: Dashboard < 2s en 3G
- **Estrategia**: 
  - 3 queries paralelas (Promise.all) en dashboard
  - Límite 15 items en historial
  - CSS inline en critical path
  - Supabase CDN edge caching

## Deployment

```
git push main → Vercel auto-deploy → https://cripta-web.vercel.app
```

## Rollback

```bash
git revert HEAD && git push
```

## Próximas Fases (post-MVP)

1. **Fase 2**: Charts con Chart.js
2. **Fase 3**: Offline-first con Service Worker
3. **Fase 4**: Exportar PDF
4. **Fase 5**: Multi-device sync
