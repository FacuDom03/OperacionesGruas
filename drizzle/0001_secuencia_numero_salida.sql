-- Numeracion de las salidas: SAL-<anio>-<secuencia>.
--
-- La genera Postgres, nunca el usuario (regla 5 del capitulo 4 del spec). Una
-- secuencia no se puede repetir ni siquiera con dos altas al mismo tiempo, que
-- es lo que pasaria calculando max(numero) + 1 desde la app.
--
-- Por ahora es una sola secuencia para todo el grupo. El punto 6 del capitulo
-- 11 todavia esta por definir: si despues se quiere una numeracion por empresa,
-- hay que agregar una secuencia por empresa y elegirla al numerar.
CREATE SEQUENCE IF NOT EXISTS salidas_numero_seq AS bigint START WITH 1;
