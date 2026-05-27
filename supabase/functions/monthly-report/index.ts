import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { format } from 'https://esm.sh/date-fns@3/format'
import { startOfMonth, endOfMonth } from 'https://esm.sh/date-fns@3'
import { es } from 'https://esm.sh/date-fns@3/locale/es'

const CURRENCIES: Record<string, { symbol: string; name: string; locale: string }> = {
  ARS: { symbol: '$',   name: 'Peso Argentino', locale: 'es-AR' },
  CLP: { symbol: '$',   name: 'Peso Chileno',   locale: 'es-CL' },
  PEN: { symbol: 'S/',  name: 'Sol Peruano',    locale: 'es-PE' },
  USD: { symbol: 'US$', name: 'Dólar',          locale: 'en-US' },
  EUR: { symbol: '€',   name: 'Euro',           locale: 'es-ES' },
  BRL: { symbol: 'R$',  name: 'Real Brasileño', locale: 'pt-BR' },
}

function fmt(amount: number, currency: string) {
  const cur = CURRENCIES[currency] ?? CURRENCIES['ARS']
  const decimals = ['CLP', 'ARS', 'BRL'].includes(currency) ? 0 : 2
  return `${cur.symbol}${amount.toLocaleString(cur.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

Deno.serve(async (req) => {
  // Solo acepta POST con la clave correcta (para el cron)
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now   = new Date()
  const inicio = startOfMonth(now).toISOString().slice(0, 10)
  const fin    = endOfMonth(now).toISOString().slice(0, 10)
  const mesLabel = format(now, 'MMMM yyyy', { locale: es })

  // Obtener todos los usuarios con email_report = true
  const { data: profiles, error: profErr } = await supabase
    .from('user_profiles')
    .select('id, email, currency')
    .eq('email_report', true)

  if (profErr || !profiles?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const smtp = new SMTPClient({
    connection: {
      hostname: Deno.env.get('SMTP_HOST')!,
      port: parseInt(Deno.env.get('SMTP_PORT') ?? '587'),
      tls: Deno.env.get('SMTP_TLS') === 'true',
      auth: {
        username: Deno.env.get('SMTP_USER')!,
        password: Deno.env.get('SMTP_PASS')!,
      },
    },
  })

  let sent = 0
  for (const profile of profiles) {
    const currency = profile.currency ?? 'ARS'

    // Cargar datos del mes para este usuario
    const [{ data: txs }, { data: deudas }, { data: servicios }, { data: metas }] = await Promise.all([
      supabase.from('transacciones').select('monto,tipo,categoria').eq('user_id', profile.id).gte('fecha', inicio).lte('fecha', fin),
      supabase.from('deudas').select('descripcion,monto,tipo').eq('user_id', profile.id).eq('pagado', false),
      supabase.from('servicios').select('nombre,monto').eq('user_id', profile.id).eq('activo', true),
      supabase.from('metas').select('nombre,monto_objetivo,monto_actual').eq('user_id', profile.id),
    ])

    const ingresos = txs?.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0) ?? 0
    const gastos   = txs?.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0) ?? 0
    const balance  = ingresos - gastos

    const porCat: Record<string, number> = {}
    txs?.filter(t => t.tipo === 'gasto').forEach(t => { porCat[t.categoria] = (porCat[t.categoria] ?? 0) + t.monto })
    const topCats = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const totalServicios = servicios?.reduce((s, sv) => s + sv.monto, 0) ?? 0

    const catRows = topCats.map(([cat, monto]) =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e">${cat}</td><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e;text-align:right;font-weight:600">${fmt(monto, currency)}</td><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e;text-align:right;color:#5a5a7a">${gastos > 0 ? ((monto / gastos) * 100).toFixed(0) + '%' : '-'}</td></tr>`
    ).join('')

    const deudasRows = deudas?.length
      ? deudas.map(d => `<tr><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e">${d.descripcion}</td><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e;text-align:center;color:${d.tipo==='debo'?'#ff4d6d':'#00e676'}">${d.tipo==='debo'?'Debo':'Me deben'}</td><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e;text-align:right;font-weight:600">${fmt(d.monto, currency)}</td></tr>`).join('')
      : '<tr><td colspan="3" style="padding:10px 12px;color:#5a5a7a;text-align:center">Sin deudas pendientes</td></tr>'

    const metasRows = metas?.length
      ? metas.map(m => {
          const pct = Math.min((m.monto_actual / m.monto_objetivo) * 100, 100).toFixed(0)
          return `<tr><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e">${m.nombre}</td><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e;text-align:right">${fmt(m.monto_actual, currency)} / ${fmt(m.monto_objetivo, currency)}</td><td style="padding:6px 12px;border-bottom:1px solid #1c1c2e;text-align:right;color:${Number(pct)>=100?'#00e676':'#7c6af7'};font-weight:600">${pct}%</td></tr>`
        }).join('')
      : '<tr><td colspan="3" style="padding:10px 12px;color:#5a5a7a;text-align:center">Sin metas configuradas</td></tr>'

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#08080f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#eaeaf0">
  <div style="max-width:580px;margin:0 auto;padding:20px">

    <div style="background:linear-gradient(135deg,#7c6af7,#6b5ce7);border-radius:20px;padding:28px 24px;margin-bottom:20px">
      <div style="font-size:28px;margin-bottom:4px">💰</div>
      <h1 style="margin:0 0 4px;font-size:22px;color:#fff">Resumen de ${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7)">${profile.email}</p>
    </div>

    <!-- Resumen -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#111118;border-radius:16px;padding:16px;text-align:center">
        <p style="margin:0 0 4px;font-size:11px;color:#5a5a7a">Ingresos</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#00e676">${fmt(ingresos, currency)}</p>
      </div>
      <div style="background:#111118;border-radius:16px;padding:16px;text-align:center">
        <p style="margin:0 0 4px;font-size:11px;color:#5a5a7a">Gastos</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#ff4d6d">${fmt(gastos, currency)}</p>
      </div>
      <div style="background:#111118;border-radius:16px;padding:16px;text-align:center">
        <p style="margin:0 0 4px;font-size:11px;color:#5a5a7a">Balance</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:${balance>=0?'#00e676':'#ff4d6d'}">${fmt(balance, currency)}</p>
      </div>
    </div>

    <!-- Top categorías -->
    ${topCats.length > 0 ? `
    <div style="background:#111118;border-radius:16px;margin-bottom:16px;overflow:hidden">
      <p style="margin:0;padding:14px 12px 10px;font-size:13px;font-weight:600;color:#eaeaf0">Top categorías de gasto</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#0d0d16">
          <th style="padding:8px 12px;text-align:left;color:#5a5a7a;font-weight:500">Categoría</th>
          <th style="padding:8px 12px;text-align:right;color:#5a5a7a;font-weight:500">Monto</th>
          <th style="padding:8px 12px;text-align:right;color:#5a5a7a;font-weight:500">%</th>
        </tr></thead>
        <tbody>${catRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Servicios -->
    ${totalServicios > 0 ? `
    <div style="background:#111118;border-radius:16px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <p style="margin:0 0 2px;font-size:13px;font-weight:600">Servicios activos</p>
        <p style="margin:0;font-size:12px;color:#5a5a7a">${servicios?.length ?? 0} suscripciones</p>
      </div>
      <p style="margin:0;font-size:18px;font-weight:700;color:#7c6af7">${fmt(totalServicios, currency)}/mes</p>
    </div>` : ''}

    <!-- Deudas -->
    <div style="background:#111118;border-radius:16px;margin-bottom:16px;overflow:hidden">
      <p style="margin:0;padding:14px 12px 10px;font-size:13px;font-weight:600">Deudas pendientes</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tbody>${deudasRows}</tbody>
      </table>
    </div>

    <!-- Metas -->
    <div style="background:#111118;border-radius:16px;margin-bottom:20px;overflow:hidden">
      <p style="margin:0;padding:14px 12px 10px;font-size:13px;font-weight:600">Metas de ahorro</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#0d0d16">
          <th style="padding:8px 12px;text-align:left;color:#5a5a7a;font-weight:500">Meta</th>
          <th style="padding:8px 12px;text-align:right;color:#5a5a7a;font-weight:500">Progreso</th>
          <th style="padding:8px 12px;text-align:right;color:#5a5a7a;font-weight:500">%</th>
        </tr></thead>
        <tbody>${metasRows}</tbody>
      </table>
    </div>

    <p style="text-align:center;font-size:11px;color:#5a5a7a;margin:0">
      Finanzas Personal · Para desactivar este resumen, abrí Configuración → Resumen mensual por email
    </p>
  </div>
</body>
</html>`

    try {
      await smtp.send({
        from: Deno.env.get('SMTP_FROM')!,
        to: profile.email,
        subject: `Tu resumen financiero de ${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)} 💰`,
        html,
      })
      sent++
    } catch (err) {
      console.error(`Error enviando email a ${profile.email}:`, err)
    }
  }

  await smtp.close()
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } })
})
