import {
  Utensils, Car, Heart, BookOpen, Gamepad2, Home, Briefcase,
  Laptop, Tag, ShoppingBag, Zap, Plane, Coffee, Music, Shirt, Dumbbell,
} from 'lucide-react'

const DEFAULTS = {
  'Comida':          { icon: Utensils,   color: '#f59e0b' },
  'Transporte':      { icon: Car,        color: '#3b82f6' },
  'Salud':           { icon: Heart,      color: '#ef4444' },
  'Educación':       { icon: BookOpen,   color: '#8b5cf6' },
  'Entretenimiento': { icon: Gamepad2,   color: '#ec4899' },
  'Hogar':           { icon: Home,       color: '#10b981' },
  'Sueldo':          { icon: Briefcase,  color: '#00e676' },
  'Freelance':       { icon: Laptop,     color: '#7c6af7' },
  'Otro':            { icon: Tag,        color: '#64748b' },
}

const FALLBACK_COLORS = [
  '#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899',
  '#10b981','#7c6af7','#ff4d6d','#00e676','#f97316','#06b6d4',
]

const ICON_MAP = {
  tag: Tag, utensils: Utensils, car: Car, heart: Heart,
  book: BookOpen, gamepad: Gamepad2, home: Home, briefcase: Briefcase,
  laptop: Laptop, shopping: ShoppingBag, zap: Zap, plane: Plane,
  coffee: Coffee, music: Music, shirt: Shirt, dumbbell: Dumbbell,
}

function getCustomMeta() {
  try { return JSON.parse(localStorage.getItem('category_meta') || '{}') } catch { return {} }
}

export function getCategoryMeta(nombre) {
  if (!nombre) return { icon: Tag, color: '#64748b' }
  if (DEFAULTS[nombre]) return DEFAULTS[nombre]
  const custom = getCustomMeta()[nombre]
  if (custom) return { icon: ICON_MAP[custom.icon] || Tag, color: custom.color }
  let hash = 0
  for (const c of nombre) hash = (hash * 31 + c.charCodeAt(0)) % FALLBACK_COLORS.length
  return { icon: Tag, color: FALLBACK_COLORS[Math.abs(hash)] }
}

export function saveCustomCategoryMeta(nombre, icon, color) {
  const meta = getCustomMeta()
  meta[nombre] = { icon, color }
  localStorage.setItem('category_meta', JSON.stringify(meta))
}

export const COLOR_OPTIONS = [
  '#f59e0b','#ef4444','#3b82f6','#8b5cf6',
  '#ec4899','#10b981','#7c6af7','#64748b',
  '#00e676','#ff4d6d','#f97316','#06b6d4',
]

export const ICON_OPTIONS = [
  { key: 'tag',        icon: Tag },
  { key: 'utensils',   icon: Utensils },
  { key: 'car',        icon: Car },
  { key: 'heart',      icon: Heart },
  { key: 'book',       icon: BookOpen },
  { key: 'gamepad',    icon: Gamepad2 },
  { key: 'home',       icon: Home },
  { key: 'briefcase',  icon: Briefcase },
  { key: 'laptop',     icon: Laptop },
  { key: 'shopping',   icon: ShoppingBag },
  { key: 'zap',        icon: Zap },
  { key: 'plane',      icon: Plane },
  { key: 'coffee',     icon: Coffee },
  { key: 'music',      icon: Music },
  { key: 'shirt',      icon: Shirt },
  { key: 'dumbbell',   icon: Dumbbell },
]
