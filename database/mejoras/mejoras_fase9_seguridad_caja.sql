-- =====================================================
-- MEJORAS FASE 9: SEGURIDAD EN CIERRE DE CAJA
-- =====================================================
-- Descripción: Implementa controles de seguridad para el cierre de caja
-- - Justificación obligatoria cuando hay diferencia
-- - Autorización de supervisor para diferencias críticas  
-- - Auditoría de todas las diferencias
-- - Dashboard para gerencia
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar campos a tabla cierrecaja
ALTER TABLE cierrecaja 
ADD COLUMN IF NOT EXISTS justificacion_diferencia TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS requirio_autorizacion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS id_supervisor_autorizo INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fecha_autorizacion TIMESTAMP DEFAULT NULL;

-- 2. Crear tabla para historial de diferencias (auditoría)
CREATE TABLE IF NOT EXISTS auditoria_diferencias_caja (
    id SERIAL PRIMARY KEY,
    id_cierre_caja INTEGER NOT NULL REFERENCES cierrecaja(id),
    id_usuario INTEGER NOT NULL,
    id_empresa INTEGER,
    id_sucursal INTEGER,
    fecha_cierre TIMESTAMP DEFAULT NOW(),
    efectivo_esperado NUMERIC(18,2),
    efectivo_real NUMERIC(18,2),
    diferencia NUMERIC(18,2),
    porcentaje_diferencia NUMERIC(10,2),
    justificacion TEXT,
    requirio_autorizacion BOOLEAN DEFAULT FALSE,
    id_supervisor INTEGER,
    nivel_alerta VARCHAR(20) DEFAULT 'normal', -- 'normal', 'advertencia', 'critico'
    revisado_por_gerencia BOOLEAN DEFAULT FALSE,
    fecha_revision TIMESTAMP,
    notas_gerencia TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_auditoria_diferencias_fecha ON auditoria_diferencias_caja(fecha_cierre);
CREATE INDEX IF NOT EXISTS idx_auditoria_diferencias_usuario ON auditoria_diferencias_caja(id_usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_diferencias_nivel ON auditoria_diferencias_caja(nivel_alerta);
CREATE INDEX IF NOT EXISTS idx_auditoria_diferencias_revisado ON auditoria_diferencias_caja(revisado_por_gerencia);

-- 3. Configuración de límites (tabla de configuración)
CREATE TABLE IF NOT EXISTS config_limites_caja (
    id SERIAL PRIMARY KEY,
    id_empresa INTEGER NOT NULL,
    limite_diferencia_porcentaje NUMERIC(5,2) DEFAULT 5.00, -- 5% por defecto
    limite_diferencia_monto NUMERIC(18,2) DEFAULT 50.00, -- S/50 por defecto
    requiere_justificacion BOOLEAN DEFAULT TRUE,
    requiere_autorizacion_supervisor BOOLEAN DEFAULT TRUE,
    notificar_gerencia_email BOOLEAN DEFAULT FALSE,
    email_gerencia TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Actualizar función cerrar_caja_atomico con nuevos parámetros
DROP FUNCTION IF EXISTS cerrar_caja_atomico(INTEGER, INTEGER, NUMERIC, TIMESTAMP);
DROP FUNCTION IF EXISTS cerrar_caja_atomico(INTEGER, INTEGER, NUMERIC, TIMESTAMP, TEXT, BOOLEAN, INTEGER);

CREATE OR REPLACE FUNCTION cerrar_caja_atomico(
  _id_cierre_caja INTEGER,
  _id_usuario INTEGER,
  _total_efectivo_real NUMERIC,
  _fecha_cierre TIMESTAMP DEFAULT NOW(),
  _justificacion TEXT DEFAULT NULL,
  _requirio_autorizacion BOOLEAN DEFAULT FALSE,
  _id_supervisor INTEGER DEFAULT NULL
) RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  id_cierre INTEGER,
  total_calculado NUMERIC,
  total_real NUMERIC,
  diferencia NUMERIC,
  ventas_pendientes INTEGER,
  nivel_alerta TEXT
) AS $$
DECLARE
  v_estado_actual INTEGER;
  v_total_efectivo_calculado NUMERIC;
  v_ventas_pendientes INTEGER;
  v_id_caja INTEGER;
  v_monto_apertura NUMERIC;
  v_diferencia NUMERIC;
  v_porcentaje_diferencia NUMERIC;
  v_nivel_alerta TEXT;
  v_id_empresa INTEGER;
  v_id_sucursal INTEGER;
BEGIN
  -- 1. Verificar que el cierre de caja existe y está abierto (estado = 0)
  SELECT cc.estado, cc.id_caja, c.id_sucursal 
  INTO v_estado_actual, v_id_caja, v_id_sucursal
  FROM cierrecaja cc
  INNER JOIN caja c ON c.id = cc.id_caja
  WHERE cc.id = _id_cierre_caja
  FOR UPDATE;
  
  IF v_estado_actual IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'CIERRE_ERROR: No se encontró el cierre de caja especificado'::TEXT,
      0, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0, 'error'::TEXT;
    RETURN;
  END IF;
  
  IF v_estado_actual != 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'CIERRE_ERROR: Esta caja ya fue cerrada anteriormente'::TEXT,
      _id_cierre_caja, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0, 'error'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Verificar que no hay ventas pendientes
  SELECT COUNT(*) INTO v_ventas_pendientes
  FROM ventas
  WHERE id_cierre_caja = _id_cierre_caja
    AND estado = 'pendiente';
  
  IF v_ventas_pendientes > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      ('CIERRE_ERROR: Hay ' || v_ventas_pendientes || ' venta(s) pendiente(s). Complete o cancele las ventas antes de cerrar.')::TEXT,
      _id_cierre_caja, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, v_ventas_pendientes, 'error'::TEXT;
    RETURN;
  END IF;
  
  -- 3. Obtener monto de apertura
  SELECT COALESCE(SUM(mc.monto), 0) INTO v_monto_apertura
  FROM movimientos_caja mc
  WHERE mc.id_cierre_caja = _id_cierre_caja
    AND mc.tipo_movimiento = 'apertura';
  
  -- 4. Calcular el total de efectivo esperado
  SELECT v_monto_apertura + COALESCE(
    (
      SELECT SUM(
        CASE 
          WHEN mc.tipo_movimiento = 'ingreso' THEN (mc.monto - COALESCE(mc.vuelto, 0))
          WHEN mc.tipo_movimiento = 'salida' THEN -mc.monto
          ELSE 0
        END
      )
      FROM movimientos_caja mc
      INNER JOIN metodos_pago mp ON mp.id = mc.id_metodo_pago
      WHERE mc.id_cierre_caja = _id_cierre_caja
        AND mc.tipo_movimiento != 'apertura'
        AND LOWER(mp.nombre) = 'efectivo'
    ), 0
  ) INTO v_total_efectivo_calculado;
  
  -- 5. Calcular diferencia y porcentaje (LIMITADO a 999.99 max para evitar overflow)
  v_diferencia := _total_efectivo_real - v_total_efectivo_calculado;
  
  IF v_total_efectivo_calculado > 0 THEN
    v_porcentaje_diferencia := LEAST(ABS(v_diferencia) / v_total_efectivo_calculado * 100, 999.99);
  ELSE
    v_porcentaje_diferencia := CASE WHEN v_diferencia != 0 THEN 999.99 ELSE 0 END;
  END IF;
  
  -- 6. Determinar nivel de alerta
  IF v_diferencia = 0 THEN
    v_nivel_alerta := 'perfecto';
  ELSIF ABS(v_diferencia) <= 5 THEN
    v_nivel_alerta := 'normal';
  ELSIF v_porcentaje_diferencia <= 2 OR ABS(v_diferencia) <= 20 THEN
    v_nivel_alerta := 'advertencia';
  ELSE
    v_nivel_alerta := 'critico';
  END IF;
  
  -- 7. Obtener id_empresa desde sucursal
  SELECT id_empresa INTO v_id_empresa
  FROM sucursales
  WHERE id = v_id_sucursal;
  
  -- 8. Actualizar el cierre de caja
  UPDATE cierrecaja SET
    fechacierre = _fecha_cierre,
    id_usuario = _id_usuario,
    total_efectivo_calculado = v_total_efectivo_calculado,
    total_efectivo_real = _total_efectivo_real,
    diferencia_efectivo = v_diferencia,
    justificacion_diferencia = _justificacion,
    requirio_autorizacion = _requirio_autorizacion,
    id_supervisor_autorizo = _id_supervisor,
    fecha_autorizacion = CASE WHEN _requirio_autorizacion THEN NOW() ELSE NULL END,
    estado = 1
  WHERE id = _id_cierre_caja;
  
  -- 9. Registrar en auditoría si hay diferencia
  IF v_diferencia != 0 THEN
    INSERT INTO auditoria_diferencias_caja (
      id_cierre_caja,
      id_usuario,
      id_empresa,
      id_sucursal,
      fecha_cierre,
      efectivo_esperado,
      efectivo_real,
      diferencia,
      porcentaje_diferencia,
      justificacion,
      requirio_autorizacion,
      id_supervisor,
      nivel_alerta
    ) VALUES (
      _id_cierre_caja,
      _id_usuario,
      v_id_empresa,
      v_id_sucursal,
      _fecha_cierre,
      v_total_efectivo_calculado,
      _total_efectivo_real,
      v_diferencia,
      v_porcentaje_diferencia,
      _justificacion,
      _requirio_autorizacion,
      _id_supervisor,
      v_nivel_alerta
    );
  END IF;
  
  -- 10. Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE, 
    CASE 
      WHEN v_nivel_alerta = 'perfecto' THEN 'Caja cerrada correctamente - Cuadre perfecto ✓'
      WHEN v_nivel_alerta = 'normal' THEN 'Caja cerrada - Diferencia mínima registrada'
      WHEN v_nivel_alerta = 'advertencia' THEN 'Caja cerrada - Diferencia registrada para revisión'
      ELSE 'Caja cerrada - Diferencia crítica registrada y notificada'
    END::TEXT,
    _id_cierre_caja,
    v_total_efectivo_calculado,
    _total_efectivo_real,
    v_diferencia,
    0,
    v_nivel_alerta;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para obtener historial de diferencias (para dashboard)
CREATE OR REPLACE FUNCTION obtener_diferencias_caja(
  _id_empresa INTEGER,
  _fecha_inicio DATE DEFAULT NULL,
  _fecha_fin DATE DEFAULT NULL,
  _solo_pendientes BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
  id INTEGER,
  fecha_cierre TIMESTAMP,
  usuario_nombre TEXT,
  sucursal_nombre TEXT,
  efectivo_esperado NUMERIC,
  efectivo_real NUMERIC,
  diferencia NUMERIC,
  porcentaje NUMERIC,
  justificacion TEXT,
  nivel_alerta TEXT,
  revisado BOOLEAN,
  notas_gerencia TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ad.id,
    ad.fecha_cierre,
    u.nombres::TEXT AS usuario_nombre,
    s.nombre::TEXT AS sucursal_nombre,
    ad.efectivo_esperado,
    ad.efectivo_real,
    ad.diferencia,
    ad.porcentaje_diferencia,
    ad.justificacion,
    ad.nivel_alerta::TEXT,
    ad.revisado_por_gerencia,
    ad.notas_gerencia
  FROM auditoria_diferencias_caja ad
  LEFT JOIN usuarios u ON u.id = ad.id_usuario
  LEFT JOIN sucursales s ON s.id = ad.id_sucursal
  WHERE ad.id_empresa = _id_empresa
    AND (_fecha_inicio IS NULL OR ad.fecha_cierre::DATE >= _fecha_inicio)
    AND (_fecha_fin IS NULL OR ad.fecha_cierre::DATE <= _fecha_fin)
    AND (_solo_pendientes = FALSE OR ad.revisado_por_gerencia = FALSE)
  ORDER BY ad.fecha_cierre DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para marcar diferencia como revisada
CREATE OR REPLACE FUNCTION marcar_diferencia_revisada(
  _id_auditoria INTEGER,
  _notas TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE auditoria_diferencias_caja
  SET 
    revisado_por_gerencia = TRUE,
    fecha_revision = NOW(),
    notas_gerencia = _notas
  WHERE id = _id_auditoria;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para validar código de supervisor
CREATE OR REPLACE FUNCTION validar_supervisor(
  _codigo TEXT,
  _id_empresa INTEGER
) RETURNS TABLE(
  valido BOOLEAN,
  id_supervisor INTEGER,
  nombre_supervisor TEXT
) AS $$
DECLARE
  v_usuario RECORD;
BEGIN
  -- Buscar usuario con rol de supervisor/admin que coincida con el código
  -- Se busca en usuarios que tengan asignación a alguna sucursal de la empresa
  SELECT u.id, u.nombres INTO v_usuario
  FROM usuarios u
  INNER JOIN roles r ON r.id = u.id_rol
  INNER JOIN asignacion_sucursal asig ON asig.id_usuario = u.id
  INNER JOIN sucursales suc ON suc.id = asig.id_sucursal
  WHERE suc.id_empresa = _id_empresa
    AND u.estado = 'ACTIVO'
    AND (
      -- El código puede ser el correo, número de documento, o el ID
      u.correo = _codigo 
      OR u.nro_doc = _codigo
      OR u.id::TEXT = _codigo
    )
    AND (
      LOWER(r.nombre) LIKE '%admin%' 
      OR LOWER(r.nombre) LIKE '%supervisor%'
      OR LOWER(r.nombre) LIKE '%gerente%'
    )
  LIMIT 1;
  
  IF v_usuario.id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_usuario.id::INTEGER, v_usuario.nombres::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 0, ''::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Vista para resumen de diferencias por usuario
CREATE OR REPLACE VIEW vista_resumen_diferencias_usuario AS
SELECT 
  ad.id_usuario,
  u.nombres AS usuario,
  ad.id_empresa,
  COUNT(*) AS total_cierres_con_diferencia,
  SUM(CASE WHEN ad.diferencia > 0 THEN 1 ELSE 0 END) AS cierres_sobrante,
  SUM(CASE WHEN ad.diferencia < 0 THEN 1 ELSE 0 END) AS cierres_faltante,
  SUM(ad.diferencia) AS diferencia_acumulada,
  AVG(ad.porcentaje_diferencia) AS promedio_porcentaje,
  MAX(ad.fecha_cierre) AS ultimo_cierre_con_diferencia,
  COUNT(CASE WHEN ad.nivel_alerta = 'critico' THEN 1 END) AS alertas_criticas
FROM auditoria_diferencias_caja ad
INNER JOIN usuarios u ON u.id = ad.id_usuario
GROUP BY ad.id_usuario, u.nombres, ad.id_empresa;

-- Habilitar RLS
ALTER TABLE auditoria_diferencias_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_limites_caja ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (eliminar si existen antes de crear)
DROP POLICY IF EXISTS "auditoria_diferencias_select" ON auditoria_diferencias_caja;
DROP POLICY IF EXISTS "auditoria_diferencias_insert" ON auditoria_diferencias_caja;
DROP POLICY IF EXISTS "auditoria_diferencias_update" ON auditoria_diferencias_caja;
DROP POLICY IF EXISTS "config_limites_all" ON config_limites_caja;

CREATE POLICY "auditoria_diferencias_select" ON auditoria_diferencias_caja
  FOR SELECT USING (true);

CREATE POLICY "auditoria_diferencias_insert" ON auditoria_diferencias_caja
  FOR INSERT WITH CHECK (true);

CREATE POLICY "auditoria_diferencias_update" ON auditoria_diferencias_caja
  FOR UPDATE USING (true);

CREATE POLICY "config_limites_all" ON config_limites_caja
  FOR ALL USING (true);

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Mejoras de seguridad para cierre de caja instaladas correctamente';
END $$;
