# CRIPTA Web — Guía para el Agente

<!-- SPECKIT START -->
## Constitution
Lee `.specify/memory/constitution.md` — principios, stack y restricciones del proyecto.

## Spec
Lee `.specify/specs/SPEC.md` — features, métricas y criterios de aceptación.

## Plan
Lee `.specify/specs/PLAN.md` — arquitectura, DB, seguridad y deployment.
<!-- SPECKIT END -->

## Estructura del Proyecto

```
cripta-web/
├── public/              # Frontend estático (HTML/CSS/JS)
│   ├── index.html       # UI principal (ES modules)
│   ├── app.js           # Entry point — orquesta módulos (995 líneas)
│   ├── db.js            # Todas las queries a Supabase + helpers
│   ├── ui.js            # Modales, toast, confirm dialog, sanitización
│   ├── parser.js        # Modo Rápido NLP + categorías centralizadas
│   ├── styles.css       # Estilos dark (glassmorphism)
│   └── manifest.json    # PWA manifest
├── supabase.sql         # Schema SQL (8 tablas + RLS)
├── vercel.json          # Config deploy (headers CSP + rewrites)
├── .specify/            # Spec-kit (constitution, spec, plan)
└── .gitignore
```

## Comandos Útiles

```bash
# Ver estado de git
git status

# Deploy a Vercel (push automático)
git push origin master
```
