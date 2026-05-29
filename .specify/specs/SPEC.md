# CRIPTA — Especificación del Producto

## Visión

CRIPTA es una consola financiera web para repartidores de moto en Lima, Perú. Resuelve el problema de no saber cuánto se gana al día, cuánto se debe, y cuánto falta para salir del hueco financiero.

## Problema

Un repartidor promedio en Lima:
- Gana entre S/ 80-150 diarios (variable)
- Gasta S/ 20-40 en gasolina
- Tiene deudas que no puede visualizar
- No sabe si está ganando o perdiendo a final de mes
- Usa papel o Excel para trackear (cuando mucho)

## Solución

App web que en tiempo real muestra:
- Ganancia neta del día (ingresos - gastos - gasolina)
- Dashboard con métricas del mes
- Registro rápido de movimientos (< 5 segundos)
- Control de deudas con fechas límite
- Herramientas de proyección y simulación

## Usuarios

**Primario**: Repartidor de moto en Lima, 18-45 años, smartphone Android, conexión 3G/4G intermitente.

**Secundario**: Cualquier trabajador independiente con ingresos variables.

## Features (MVP)

### F1: Dashboard
- Ganancia neta del día (ingresos - gastos - gasolina)
- Ingresos y gastos del mes
- km/L promedio
- Deudas restantes
- Últimos 15 movimientos

### F2: Registro de Movimientos
- Tipos: Ingreso, Gasto, Gasolina
- Campos: monto, descripción, categoría
- Gasolina adicional: litros, km recorridos
- Submit en < 5 segundos

### F3: Control de Deudas
- Crear deuda (nombre, monto, interés, fecha límite)
- Registrar pagos
- Marcar como pagada
- Próximos pagos ordenados por fecha

### F4: Herramientas
- **Meta Diaria**: Cuánto ganar al día para pagar deudas
- **Proyectar**: Simulación a X días basada en promedio
- **Simular**: Qué pasa si gano/gasto X más
- **Plan Salida**: Deudas ordenadas por prioridad (interés)
- **Exportar CSV**: Descargar todos los datos
- **Presupuesto**: Límites semanales por categoría

### F5: Persistencia
- Datos en Supabase (PostgreSQL)
- RLS por device ID (sin login)
- Sync automático

## No-Features (NO hacer)

- ❌ Login/registro (datos por device ID)
- ❌ Multi-usuario
- ❌ Chat/social
- ❌ Gamificación
- ❌ Notificaciones push
- ❌ Charts/gráficos complejos
- ❌ Modo offline (futuro)

## Métricas de Éxito

- Tiempo para registrar un movimiento: < 5 segundos
- Tiempo para ver ganancia neta: < 2 segundos (1 tap)
- Tasa de error en forms: < 1%
- Uso en 3G: carga completa < 3 segundos

## Criterios de Aceptación

- [ ] Dashboard carga en < 2s en 3G
- [ ] Formulario registra en < 5s
- [ ] Datos persisten entre sesiones
- [ ] Toast de éxito/error en toda operación
- [ ] Responsive en pantallas 320px - 1024px
- [ ] Sin errores en consola
- [ ] CSP headers activos

## Fuente de Verdad

- GitHub: https://github.com/jecartechnologys-web/cripta-web
- Producción: https://cripta-web.vercel.app
- DB: Supabase (myaazbpmhapnqoauqlri)
