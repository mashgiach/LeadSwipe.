-- Verify RLS is enabled on all tables
SELECT
  n.nspname AS schema,
  c.relname AS table,
  CASE WHEN c.relrowsecurity THEN 'RLS enabled' ELSE 'RLS disabled' END AS rls_status
FROM
  pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE
  c.relkind = 'r' -- Only tables
  AND n.nspname = 'public' -- Only public schema
ORDER BY
  n.nspname, c.relname;
