# TUKI · Expertia — Roadmap dinámico (pre-deploy)

> Documento vivo. Se actualiza después de cada cambio.
> Estado: 🔴 broken · 🟡 parcial / mejorable · ✅ verificado E2E · 🔲 pendiente de probar

---

## Stack & runtime

| Servicio | Puerto | Estado |
|---|---|---|
| Postgres + 25,102 empresas | 5433 | ✅ |
| API NestJS | 3030 | ✅ |
| Web Angular | 4200 | ✅ |

---

## Acceptance tests E2E

### 1 · Auth & navegación

| # | Caso | Esperado | Estado |
|---|---|---|---|
| 1.1 | Login con `tuki / Tuki-2026-Awesome!` | Redirige a `/today` | ✅ |
| 1.2 | Sidebar muestra Hoy / Pipeline / Universo + íconos | Visibles | ✅ |
| 1.3 | Logout (botón Salir) | Vuelve a `/login` | 🔲 |
| 1.4 | Recarga después de login mantiene sesión | OK | ✅ verificado en reloads sucesivos |
| 1.5 | Botón "Nueva acción" del topbar | Abre modal global de tarea libre (sin empresa) | ✅ |

### 2 · /today (Home)

| # | Caso | Esperado | Estado |
|---|---|---|---|
| 2.1 | Saludo dinámico + fecha Lima | Renderiza | ✅ |
| 2.2 | Mini-pipeline con counts por stage | Renderiza | ✅ |
| 2.3 | Tareas para hoy | Lista o "No hay tareas" | ✅ |
| 2.4 | Últimas interacciones | Renderiza | ✅ |
| 2.5 | Click en stage del mini-pipeline → `/pipeline?status=...` | Filtrado | 🔲 |

### 3 · /pipeline (Kanban + Lista)

| # | Caso | Esperado | Estado |
|---|---|---|---|
| 3.1 | Kanban con 6 columnas + counts | Renderiza | ✅ |
| 3.2 | Card muestra nombre, RUC, días en estado, último contacto, próxima acción | Todos los campos | ✅ |
| 3.3 | Toggle Kanban ↔ Lista | Cambia vista | ✅ |
| 3.4 | Filtro "Solo vencidas" | Filtra | ✅ "Tarea vencida" chip activo |
| 3.5 | Click en card → drawer con detalle | Abre | ✅ |
| 3.6 | Modal "+ Registrar interacción" (Email/Llamada/Reunión/LinkedIn/Otro) | Crea | ✅ |
| 3.7 | Modal "+ Agregar tarea" (Email/Llamada/Reunión/Investigar/Otro) | Crea | ✅ |
| 3.8 | Drag entre columnas (no Won/Lost) | Aplica directo | ✅ 1 ONE → Contactada |
| 3.9 | Drag a Ganada → modal confirm | Pide y aplica | ✅ |
| 3.10 | Drag a Perdida → modal con motivo obligatorio | Pide motivo | ✅ |
| 3.11 | Editar Hipótesis de valor desde drawer | Persiste | ✅ |
| 3.12 | Marcar tarea como completa desde drawer | Actualiza | ✅ refetch entry → card kanban refresca en vivo |
| 3.13 | Agregar nota | Persiste | ✅ |
| 3.14 | Agregar contacto | Persiste | ✅ form inline (nombre, rol, email, teléfono) en sección Contactos |

### 4 · /universe (Discovery 25k empresas)

| # | Caso | Esperado | Estado |
|---|---|---|---|
| 4.1 | Tabla muestra 50 empresas / página | Renderiza | ✅ |
| 4.2 | Scroll vertical funciona | Scroll OK | ✅ fix: wrapper `h-full overflow-y-auto` en dashboard.component |
| 4.3 | Paginación (◀ 1 2 … 503 ▶) | Navega | ✅ |
| 4.4 | Filtros sidebar: macrosector, sector, tamaño, depto, riesgo | Filtran | ✅ Arequipa → 985 (4%) |
| 4.5 | Búsqueda por razón social/RUC | Filtra | ✅ "tuki" → 0 resultados |
| 4.6 | Botón "+ Pipeline" por fila → crea entry + nav a `/pipeline?status=IN_SIGHT` | Funciona | ✅ |
| 4.6.1 | Auto-seed "Contacto principal" con email + teléfono de la empresa al crear pipeline entry | OK | ✅ prioridad: telefono1 → telefono2 → telefono3 → celular1 → celular2 (consistente con universe) |
| 4.7 | Si ya existe en pipeline (409) → toast y nav | Sin error | 🔲 |
| 4.8 | Exportar CSV con filtros aplicados | Descarga | 🔲 (URL se actualiza correctamente con filtros) |

### 5 · UX improvements

| # | Mejora | Estado |
|---|---|---|
| 5.1 | Fix scroll vertical en /universe | ✅ |
| 5.2 | Indicador "EN PIPELINE" + botón "Ver en pipeline" por fila del universe | ✅ |
| 5.3 | Quick-filter "ocultar las que ya están en mi pipeline" | ✅ |
| 5.4 | Card kanban refresca en vivo al completar tarea | ✅ |
| 5.5 | Botón "+ Agregar contacto" en drawer | ✅ |
| 5.6 | Búsqueda con debounce 250ms (probable: ya tiene; verificar) | 🔲 verificar (no detectado lag) |

### 6 · Calidad

| # | Caso | Estado |
|---|---|---|
| 6.1 | API tests | ✅ 104/104 |
| 6.2 | Build frontend | ✅ |
| 6.3 | No errores en consola | 🟡 solo warnings a11y (form fields sin id/for en login) |
| 6.4 | No requests 4xx/5xx inesperadas | ✅ |

### 7 · Cosméticos pendientes

| # | Item | Estado |
|---|---|---|
| 7.1 | Interacción muestra "—" cuando authorUsername es null | 🟡 cosmético |
| 7.2 | Form fields login sin `id`/`for` (a11y) | 🟡 cosmético |

---

## Bugs cerrados

- ✅ **#1**: `tk-icon` Angular sanitizer eliminaba SVG paths → fix con `bypassSecurityTrustHtml`.
- ✅ **#2**: Pipeline API devolvía entity raw, faltaban `daysInStage`, `lastInteractionAt`, `companyName`, `nextTask` → fix enriqueciendo en service con joins de Companies + Tasks.
- ✅ **Feature #3**: Botón "+ Pipeline" en universe → implementado.
- ✅ **#4**: Scroll vertical roto en `/universe` → wrapper `h-full overflow-y-auto`.
- ✅ **#5**: Card kanban refresca en vivo al completar tarea (refetch entry desde drawer + emit `entryUpdated`).
- ✅ **#6**: Drawer ahora tiene formulario "+ Agregar contacto" (nombre/rol/email/teléfono).
- ✅ **UX-A**: Indicador "EN PIPELINE" + botón "Ver en pipeline" en fila del universe.
- ✅ **UX-B**: Toggle "Ocultar las que ya tengo en pipeline" + contador de ocultas.

## Bugs abiertos

(ninguno crítico)
