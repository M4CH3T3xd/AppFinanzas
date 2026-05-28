# Setup en PC nueva

## Requisitos a instalar

| Herramienta | Descarga | Para qué |
|---|---|---|
| **Git** | https://git-scm.com/download/win | Clonar y versionar el repo |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop | Correr el frontend en contenedor |
| **VS Code** (opcional) | https://code.visualstudio.com | Editor de código |
| **Claude Code** (opcional) | `npm install -g @anthropic-ai/claude-code` | Asistente IA en terminal |

> Node.js no es necesario para desarrollo — Docker lo maneja internamente.
> Si querés correr `npm` localmente (no en Docker), instalá Node.js 18+.

---

## Pasos

### 1. Clonar el repositorio

```bash
git clone https://github.com/M4CH3T3xd/AppFinanzas.git
cd AppFinanzas
```

### 2. Crear el archivo `.env`

En la raíz del proyecto (junto a `docker-compose.yml`), crear un archivo llamado `.env`:

```env
VITE_SUPABASE_URL=https://qhfyuirsdplhvgzvjwrx.supabase.co
VITE_SUPABASE_ANON_KEY=<pedile la key a martin o buscala en Supabase Dashboard → Settings → API>
```

> Este archivo **no está en git** (está en `.gitignore`). Hay que crearlo a mano cada vez.

### 3. Levantar la app

```bash
# Primera vez (construye la imagen con todas las dependencias)
docker compose up --build

# Veces siguientes (más rápido, sin rebuild)
docker compose up
```

La app queda disponible en: **http://localhost:5173**

El frontend tiene **hot reload** — los cambios en archivos se reflejan automáticamente sin reiniciar.

### 4. Detener la app

```bash
docker compose down
```

---

## Flujo de trabajo habitual

```bash
git pull                    # Traer cambios del repo
docker compose up           # Levantar la app
# ... hacer cambios en frontend/src/ ...
git add <archivos>
git commit -m "descripción"
git push                    # Vercel redespliega automáticamente
```

---

## Si algo falla

**`docker: command not found`** → Docker Desktop no está corriendo. Abrirlo desde el menú de inicio.

**Puerto 5173 ocupado** → Cambiar en `docker-compose.yml` el mapeo de puertos: `"5174:5173"`.

**`npm ci` falla en el build** → Ejecutar localmente `npm install --package-lock-only` dentro de `frontend/` y volver a hacer `docker compose up --build`.

**Cambios no se reflejan** → Verificar que el volumen esté montado. Si no, `docker compose down -v && docker compose up --build`.

---

## Acceso a la app desplegada

URL pública (Vercel): **https://app-finanzas-fawn.vercel.app**

Los cambios pusheados a `main` se despliegan automáticamente en ~1 minuto.
