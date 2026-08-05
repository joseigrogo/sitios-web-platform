-- ============================================================
-- ALTA DE CLIENTE + FASE 0 DE SITIO
-- ============================================================
-- Extraído de la intake real de Capital Window Cleaning (2026-08-05) —
-- no especificado en el aire, corrido una vez de verdad primero.
--
-- Todavía NO es un comando de CLI. Es el patrón ya usado, versionado para
-- que no dependa de que alguien lo recuerde o lo reescriba en un chat.
-- Se envuelve en un comando real cuando se haya vuelto a usar un par de
-- veces más — ver BASES_DEL_SISTEMA.md, Base 8.
--
-- Cómo se usa hoy: un agente completa los :'placeholders' con las
-- respuestas del checklist de abajo y corre el bloque entero. Es una sola
-- transacción implícita (CTE encadenado): si algo falla, no queda ni el
-- cliente ni el sitio a medias.
--
-- Cómo se usaría con psql directo, cuando exista esa vía:
--   psql "$DATABASE_URL" -f alta_cliente_y_sitio.sql \
--     -v cliente_nombre="'Nombre del negocio'" \
--     -v cliente_slug="'nombre-del-negocio'" \
--     -v cliente_vertical="'vertical_en_snake_case'" \
--     -v cliente_modelo="'unico'" \
--     -v cliente_regla_marca_oculta="'false'" \
--     -v cliente_respaldo_legal_tipo="'Ninguno — confirmado sin X vigente'" \
--     -v sitio_nombre_marca="'Nombre del negocio'" \
--     -v sitio_arquetipo="'landing_directa'" \
--     -v sitio_segmento="'Descripción del segmento, con evidencia real'" \
--     -v sitio_dominio="''"
--
-- ── Paso 0 — ¿el cliente ya existe? ──
-- Antes de correr este script: select * from clientes where slug = '...'
-- o nombre ilike '...'. Si ya existe, este script no aplica — se salta
-- directo al INSERT de `sitios` con el cliente_id encontrado (variante
-- todavía no extraída: no se ha corrido ese camino de verdad todavía).
--
-- ── Checklist de cliente (una vez por negocio nuevo) ──
--   1. Nombre del negocio
--   2. Slug único y estable — el CLI lo propondría; hoy se confirma a mano.
--      Preferir el identificador que ya existe fuera de este sistema
--      (ej. nombre real del proyecto en Vercel) sobre el nombre de una
--      carpeta local, que no es un identificador de nada externo.
--   3. Vertical — texto libre, catálogo extensible, sin CHECK constraint
--      a propósito (mismo criterio que arquetipo).
--   4. Modelo: 'red' o 'unico' — intención estratégica declarada, no
--      cuenta actual de sitios. No cambia ninguna lógica de código: el
--      índice de keyword pilar funciona igual con N=1.
--   5. ¿La marca del cliente se muestra abierta en el sitio, o se oculta?
--      Nunca se hereda del cliente anterior — es política de cada cliente,
--      no de la plataforma.
--   6. Si modelo='red': ¿alguna excepción a "sin cross-linking"? (default
--      true; si modelo='unico' no aplica, no se pregunta).
--   7. Respaldo legal del vertical — puede ser explícitamente "ninguno,
--      confirmado" (mejor que dejarlo en null sin haber preguntado: un
--      null no distingue "no se preguntó" de "se preguntó y no hay").
--
-- ── Checklist de sitio (siempre, por cada sitio) ──
--   8. Segmento que ataca, con su oferta/mensaje — con evidencia real
--      (spec, contenido existente), nunca inventado. Si el sitio sirve
--      más de un segmento en la misma página, documentar cuál es
--      primario y por qué (ver Base 2 — no forzar "un sitio, un
--      segmento" contra la evidencia real).
--   9. Arquetipo — catálogo extensible, mismo criterio que vertical.
--  10. Dominio tentativo — puede quedar null. Ya NO bloquea el gate de
--      salida de Fase 0: es requisito de Fase 4 (donde hace falta para
--      DNS), no de Fase 0.
--  11. Nombre de marca del sitio.
--
-- El INSERT deja `fase_actual` en su default ('encuadre') a propósito.
-- El flip a 'investigacion' es un paso aparte y visible — no se agrupa
-- acá — porque pasar el gate es una decisión que se verifica, no un
-- efecto colateral de crear la fila. Ver check_gate_fase0.sql (todavía
-- no existe como archivo separado; hoy es la query de abajo).
-- ============================================================

with nuevo_cliente as (
  insert into clientes (
    nombre, slug, vertical, modelo, regla_marca_oculta, respaldo_legal_tipo
  )
  values (
    :'cliente_nombre',
    :'cliente_slug',
    :'cliente_vertical',
    :'cliente_modelo',
    (:'cliente_regla_marca_oculta')::boolean,
    :'cliente_respaldo_legal_tipo'
  )
  returning id
)
insert into sitios (cliente_id, nombre_marca, arquetipo, segmento, dominio)
select
  id,
  :'sitio_nombre_marca',
  :'sitio_arquetipo',
  :'sitio_segmento',
  nullif(:'sitio_dominio', '')
from nuevo_cliente
returning id, dominio, fase_actual, segmento;

-- ── Chequeo del gate de salida de Fase 0 (correr aparte, a mano, antes
--    de decidir si hacer el flip) ──
-- select nombre_marca, arquetipo, segmento, fase_actual
-- from sitios where id = '<id devuelto arriba>';
-- Si nombre_marca / arquetipo / segmento no están vacíos: el gate pasa.
-- El flip es un UPDATE aparte, explícito:
-- update sitios set fase_actual = 'investigacion' where id = '<id>';
