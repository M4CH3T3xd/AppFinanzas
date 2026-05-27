# Finanzas App — Contexto del proyecto

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Dev**: Docker (Dockerfile.dev + docker-compose.yml)
- **Deploy**: Docker en local, puerto 5173

## Arrancar el proyecto
```bash
docker compose up --build   # primera vez o después de cambiar dependencias
docker compose restart      # para aplicar cambios de código (hot reload via volumen)
```
El frontend vive en `frontend/`. El `.env` va en la raíz del proyecto (docker-compose lo inyecta).

## Variables de entorno (.env en la raíz)
```
VITE_SUPABASE_URL=https://qhfyuirsdplhvgzvjwrx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## Estructura de carpetas
```
finanzas-app/
├── frontend/
│   └── src/
│       ├── context/          AuthContext, CurrencyContext, ThemeContext, ToastContext
│       ├── hooks/            useAuth
│       ├── lib/              supabase.js, categoryMeta.js
│       ├── pages/            Dashboard, Transacciones, Presupuestos, Deudas, Servicios, Metas, Login, Configuracion, Admin
│       └── components/       Layout, BottomSheet
├── docker-compose.yml
├── Dockerfile.dev
└── .env                      (no commitear, está en .gitignore)
```

## Base de datos Supabase — tablas

### `user_profiles`
| col | tipo | notas |
|-----|------|-------|
| id | uuid | FK → auth.users |
| email | text | |
| role | text | 'usuario' o 'admin' |
| currency | text | código ISO: ARS, CLP, USD, etc. |

### `transacciones`
| col | tipo | notas |
|-----|------|-------|
| id | uuid | |
| user_id | uuid | FK → auth.users |
| monto | numeric | positivo siempre |
| tipo | text | 'ingreso' o 'gasto' |
| categoria | text | |
| descripcion | text | opcional |
| fecha | date | yyyy-MM-dd |

### `presupuestos`
| col | tipo | notas |
|-----|------|-------|
| id | uuid | |
| user_id | uuid | |
| categoria | text | |
| limite | numeric | null = sin límite |

### `deudas`
| col | tipo | notas |
|-----|------|-------|
| id | uuid | |
| user_id | uuid | |
| descripcion | text | |
| monto | numeric | |
| tipo | text | 'debo' o 'me deben' |
| vencimiento | date | opcional |
| icono | text | emoji |
| pagado | boolean | |

### `servicios`
| col | tipo | notas |
|-----|------|-------|
| id | uuid | |
| user_id | uuid | |
| nombre | text | |
| monto | numeric | mensual |
| icono | text | emoji |
| categoria | text | |
| dia_vencimiento | int | 1-31 |
| activo | boolean | |
| ultimo_pago | date | para saber si pagó este mes |

### `metas`
| col | tipo | notas |
|-----|------|-------|
| id | uuid | |
| user_id | uuid | |
| nombre | text | |
| icono | text | emoji |
| monto_objetivo | numeric | |
| monto_actual | numeric | default 0 |
| fecha_limite | date | opcional |

## RLS — políticas activas (crítico)

### user_profiles
- `Usuarios ven su propio perfil` — SELECT where id = auth.uid()
- `Admin ve todos` — SELECT using is_admin()
- `Usuarios gestionan su perfil` — ALL where id = auth.uid()

### Función is_admin() — SECURITY DEFINER (evita recursión)
```sql
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from user_profiles where id = auth.uid() and role = 'admin')
$$;
```

### transacciones
- `user_transacciones` — ALL where user_id = auth.uid()
- `admin_ve_transacciones` — SELECT using is_admin()

> ⚠️ Policies viejas (`admin_user_profiles`, `admin_see_all_tx`, `profiles_visible`) ya fueron eliminadas.
> Si hay errores de recursión infinita, verificar con:
> `select policyname from pg_policies where tablename = 'user_profiles';`

## Sistema de colores (CSS variables)
- `--canvas #08080f` fondo
- `--panel #111118` tarjetas
- `--well #0d0d16` inputs
- `--line #1c1c2e` bordes
- `--ink #eaeaf0` texto
- `--dim #5a5a7a` texto secundario
- `--brand-500 #7c6af7` violeta acento
- `--income #00e676` verde neón (ingresos)
- `--expense #ff4d6d` coral (gastos)

## Decisiones de diseño tomadas
- **Moneda fija por cuenta**: se elige al registrarse, se guarda en `user_profiles.currency`. No hay conversión de montos. Hay un conversor de referencia en Configuración.
- **Íconos de categoría**: lucide-react con color y fondo de color, no emojis. Definidos en `src/lib/categoryMeta.js`. Categorías custom guardan color+icono en localStorage.
- **Toasts globales**: `ToastContext` con success/error/warning. Todas las acciones CRUD dan feedback.
- **Nav móvil**: 5 tabs — Inicio / Movimientos / Presupuestos / Deudas / Servicios. Metas accesible desde Dashboard.
- **Formulario de transacciones**: tipo → monto (grande, centrado) → chips de categoría → detalles colapsables.

## Próximas features pendientes
- [ ] Conversor de moneda de referencia en Configuración
- [ ] Configuración: poder cambiar la moneda base con advertencia
- [ ] Exportar datos (CSV o PDF)
- [ ] Notificaciones de vencimiento de servicios
- [ ] Estadísticas históricas (comparativa multi-mes)
