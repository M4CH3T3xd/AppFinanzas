# Setup en PC nueva

## Requisitos a instalar

| Herramienta | Descarga | Para qué |
|---|---|---|
| **Git** | https://git-scm.com/download/win | Clonar y versionar el repo |
| **Node.js 18+** | https://nodejs.org | Correr el frontend localmente |
| **VS Code** (opcional) | https://code.visualstudio.com | Editor de código |
| **Claude Code** (opcional) | `npm install -g @anthropic-ai/claude-code` | Asistente IA en terminal |

---

## Pasos

### 1. Clonar el repositorio

```bash
git clone https://github.com/M4CH3T3xd/AppFinanzas.git
cd AppFinanzas
```

### 2. Crear el archivo `.env`

Dentro de la carpeta `frontend/`, crear un archivo llamado `.env`:

```env
VITE_SUPABASE_URL=https://qhfyuirsdplhvgzvjwrx.supabase.co
VITE_SUPABASE_ANON_KEY=<pedile la key a martin o buscala en Supabase Dashboard → Settings → API>
```

> Este archivo **no está en git** (está en `.gitignore`). Hay que crearlo a mano cada vez.

### 3. Instalar dependencias y levantar la app

```bash
cd frontend
npm install        # solo la primera vez o tras cambiar dependencias
npm run dev        # http://localhost:5173 con hot reload
```

### 4. Detener la app

`Ctrl + C` en la terminal.

---

## Flujo de trabajo habitual

```bash
git pull                    # Traer cambios del repo
cd frontend && npm run dev  # Levantar la app
# ... hacer cambios en src/ ...
git add <archivos>
git commit -m "descripción"
git push                    # Vercel redespliega automáticamente en ~1 min
```

---

## Si algo falla

**`npm: command not found`** → Node.js no está instalado o no está en el PATH. Reinstalar desde nodejs.org.

**`npm install` falla** → Borrar `frontend/node_modules` y `frontend/package-lock.json` y volver a correr `npm install`.

**Puerto 5173 ocupado** → Cambiar en `frontend/vite.config.js`: agregar `server: { port: 5174 }`.

**Variables de entorno no cargadas** → Verificar que el archivo `.env` esté dentro de `frontend/` (no en la raíz del proyecto).

---

## Acceso a la app desplegada

URL pública (Vercel): **https://app-finanzas-fawn.vercel.app**

Los cambios pusheados a `main` se despliegan automáticamente en ~1 minuto.
Las variables de entorno de producción están configuradas en el dashboard de Vercel.
