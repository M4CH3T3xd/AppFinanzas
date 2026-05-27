-- 1. Agregar columna email_report a user_profiles
alter table public.user_profiles
  add column if not exists email_report boolean not null default false;

-- 2. Habilitar extensión pg_cron (solo si no está habilitada)
-- Ir a Supabase Dashboard → Database → Extensions → buscar pg_cron → Enable

-- 3. Crear el cron job que dispara el Edge Function el último día de cada mes a las 20:00 UTC
-- Reemplazá <PROJECT_REF> con tu project ref (ej: qhfyuirsdplhvgzvjwrx)
-- Reemplazá <SERVICE_ROLE_KEY> con tu service role key (la encontrás en Project Settings → API)
select cron.schedule(
  'monthly-report-email',            -- nombre del job
  '0 20 28-31 * *',                  -- 20:00 UTC los días 28-31 (pg_cron no soporta "último día" nativo)
  $$
  select
    case when date_part('day', (now() + interval '1 day')::date) = 1
    then net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/monthly-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body := '{}'::jsonb
    )
    end;
  $$
);
