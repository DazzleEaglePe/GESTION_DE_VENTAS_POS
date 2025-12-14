-- =====================================================
-- FASE 3: SISTEMA DE AUDITORÍA
-- Descripción: Registro automático de todas las operaciones 
--              importantes del sistema para trazabilidad
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- 1. TABLA DE AUDITORÍA
-- =====================================================

CREATE TABLE IF NOT EXISTS auditoria (
    id BIGSERIAL PRIMARY KEY,
    
    -- Información del evento
    tabla VARCHAR(100) NOT NULL,
    operacion VARCHAR(20) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'VENTA', 'CIERRE_CAJA', 'APERTURA_CAJA', 'MOVIMIENTO_CAJA')),
    registro_id BIGINT,
    
    -- Datos del cambio (JSON)
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    campos_modificados TEXT[], -- Array con los nombres de los campos que cambiaron
    
    -- Información del usuario
    id_usuario BIGINT REFERENCES usuarios(id),
    nombre_usuario VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Información de la empresa
    id_empresa BIGINT REFERENCES empresa(id),
    
    -- Contexto adicional
    modulo VARCHAR(100), -- Ej: 'POS', 'Inventario', 'Configuración'
    accion_detalle TEXT, -- Descripción legible de la acción
    
    -- Metadata
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    sesion_id UUID,
    
    -- Índices para búsqueda rápida
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para búsquedas por fecha (las más comunes)
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_hora DESC);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(id_usuario);

-- Índice para búsquedas por empresa
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON auditoria(id_empresa);

-- Índice para búsquedas por tabla y operación
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_operacion ON auditoria(tabla, operacion);

-- Índice para búsquedas por registro específico
CREATE INDEX IF NOT EXISTS idx_auditoria_registro ON auditoria(tabla, registro_id);

-- Índice compuesto para reportes comunes
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_fecha ON auditoria(id_empresa, fecha_hora DESC);

-- =====================================================
-- 3. FUNCIÓN PARA REGISTRAR AUDITORÍA
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_auditoria(
    p_tabla VARCHAR(100),
    p_operacion VARCHAR(20),
    p_registro_id BIGINT,
    p_datos_anteriores JSONB DEFAULT NULL,
    p_datos_nuevos JSONB DEFAULT NULL,
    p_id_usuario BIGINT DEFAULT NULL,
    p_id_empresa BIGINT DEFAULT NULL,
    p_modulo VARCHAR(100) DEFAULT NULL,
    p_accion_detalle TEXT DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_sesion_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nombre_usuario VARCHAR(255);
    v_campos_modificados TEXT[];
    v_audit_id BIGINT;
    v_key TEXT;
BEGIN
    -- Obtener nombre del usuario
    IF p_id_usuario IS NOT NULL THEN
        SELECT nombres INTO v_nombre_usuario 
        FROM usuarios 
        WHERE id = p_id_usuario;
    END IF;
    
    -- Calcular campos modificados (solo para UPDATE)
    IF p_operacion = 'UPDATE' AND p_datos_anteriores IS NOT NULL AND p_datos_nuevos IS NOT NULL THEN
        v_campos_modificados := ARRAY[]::TEXT[];
        FOR v_key IN SELECT jsonb_object_keys(p_datos_nuevos)
        LOOP
            IF p_datos_anteriores->v_key IS DISTINCT FROM p_datos_nuevos->v_key THEN
                v_campos_modificados := array_append(v_campos_modificados, v_key);
            END IF;
        END LOOP;
    END IF;
    
    -- Insertar registro de auditoría
    INSERT INTO auditoria (
        tabla,
        operacion,
        registro_id,
        datos_anteriores,
        datos_nuevos,
        campos_modificados,
        id_usuario,
        nombre_usuario,
        ip_address,
        user_agent,
        id_empresa,
        modulo,
        accion_detalle,
        sesion_id
    ) VALUES (
        p_tabla,
        p_operacion,
        p_registro_id,
        p_datos_anteriores,
        p_datos_nuevos,
        v_campos_modificados,
        p_id_usuario,
        v_nombre_usuario,
        p_ip_address,
        p_user_agent,
        p_id_empresa,
        p_modulo,
        p_accion_detalle,
        p_sesion_id
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- =====================================================
-- 4. TRIGGERS AUTOMÁTICOS PARA TABLAS PRINCIPALES
-- =====================================================

-- Función genérica para trigger de auditoría
CREATE OR REPLACE FUNCTION trigger_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_operacion VARCHAR(20);
    v_datos_anteriores JSONB;
    v_datos_nuevos JSONB;
    v_registro_id BIGINT;
    v_id_usuario BIGINT;
    v_id_empresa BIGINT;
    v_accion_detalle TEXT;
BEGIN
    -- Determinar la operación
    IF TG_OP = 'INSERT' THEN
        v_operacion := 'INSERT';
        v_datos_nuevos := to_jsonb(NEW);
        v_registro_id := NEW.id;
        v_accion_detalle := 'Nuevo registro creado en ' || TG_TABLE_NAME;
        
        -- Intentar obtener id_empresa del nuevo registro
        IF to_jsonb(NEW) ? 'id_empresa' THEN
            v_id_empresa := (to_jsonb(NEW)->>'id_empresa')::BIGINT;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Verificar si es soft delete
        IF OLD.activo = true AND NEW.activo = false THEN
            v_operacion := 'SOFT_DELETE';
            v_accion_detalle := 'Registro eliminado (soft delete) en ' || TG_TABLE_NAME;
        ELSIF OLD.activo = false AND NEW.activo = true THEN
            v_operacion := 'RESTORE';
            v_accion_detalle := 'Registro restaurado en ' || TG_TABLE_NAME;
        ELSE
            v_operacion := 'UPDATE';
            v_accion_detalle := 'Registro actualizado en ' || TG_TABLE_NAME;
        END IF;
        
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := to_jsonb(NEW);
        v_registro_id := NEW.id;
        
        -- Intentar obtener id_empresa
        IF to_jsonb(NEW) ? 'id_empresa' THEN
            v_id_empresa := (to_jsonb(NEW)->>'id_empresa')::BIGINT;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_operacion := 'DELETE';
        v_datos_anteriores := to_jsonb(OLD);
        v_registro_id := OLD.id;
        v_accion_detalle := 'Registro eliminado permanentemente de ' || TG_TABLE_NAME;
        
        -- Intentar obtener id_empresa
        IF to_jsonb(OLD) ? 'id_empresa' THEN
            v_id_empresa := (to_jsonb(OLD)->>'id_empresa')::BIGINT;
        END IF;
    END IF;
    
    -- Intentar obtener id_usuario del registro (si existe el campo)
    IF TG_OP IN ('INSERT', 'UPDATE') AND to_jsonb(NEW) ? 'eliminado_por' AND NEW.eliminado_por IS NOT NULL THEN
        v_id_usuario := NEW.eliminado_por;
    END IF;
    
    -- Insertar registro de auditoría
    INSERT INTO auditoria (
        tabla,
        operacion,
        registro_id,
        datos_anteriores,
        datos_nuevos,
        id_usuario,
        id_empresa,
        accion_detalle
    ) VALUES (
        TG_TABLE_NAME,
        v_operacion,
        v_registro_id,
        v_datos_anteriores,
        v_datos_nuevos,
        v_id_usuario,
        v_id_empresa,
        v_accion_detalle
    );
    
    -- Retornar el registro apropiado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- =====================================================
-- 5. CREAR TRIGGERS EN TABLAS PRINCIPALES
-- =====================================================

-- Productos
DROP TRIGGER IF EXISTS audit_productos ON productos;
CREATE TRIGGER audit_productos
    AFTER INSERT OR UPDATE OR DELETE ON productos
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Categorías
DROP TRIGGER IF EXISTS audit_categorias ON categorias;
CREATE TRIGGER audit_categorias
    AFTER INSERT OR UPDATE OR DELETE ON categorias
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Clientes/Proveedores
DROP TRIGGER IF EXISTS audit_clientes_proveedores ON clientes_proveedores;
CREATE TRIGGER audit_clientes_proveedores
    AFTER INSERT OR UPDATE OR DELETE ON clientes_proveedores
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Usuarios
DROP TRIGGER IF EXISTS audit_usuarios ON usuarios;
CREATE TRIGGER audit_usuarios
    AFTER INSERT OR UPDATE OR DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Ventas
DROP TRIGGER IF EXISTS audit_ventas ON ventas;
CREATE TRIGGER audit_ventas
    AFTER INSERT OR UPDATE OR DELETE ON ventas
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Detalle de Ventas
DROP TRIGGER IF EXISTS audit_detalle_venta ON detalle_venta;
CREATE TRIGGER audit_detalle_venta
    AFTER INSERT OR UPDATE OR DELETE ON detalle_venta
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Sucursales
DROP TRIGGER IF EXISTS audit_sucursales ON sucursales;
CREATE TRIGGER audit_sucursales
    AFTER INSERT OR UPDATE OR DELETE ON sucursales
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Cajas
DROP TRIGGER IF EXISTS audit_caja ON caja;
CREATE TRIGGER audit_caja
    AFTER INSERT OR UPDATE OR DELETE ON caja
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Almacenes
DROP TRIGGER IF EXISTS audit_almacen ON almacen;
CREATE TRIGGER audit_almacen
    AFTER INSERT OR UPDATE OR DELETE ON almacen
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Métodos de Pago
DROP TRIGGER IF EXISTS audit_metodos_pago ON metodos_pago;
CREATE TRIGGER audit_metodos_pago
    AFTER INSERT OR UPDATE OR DELETE ON metodos_pago
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Stock
DROP TRIGGER IF EXISTS audit_stock ON stock;
CREATE TRIGGER audit_stock
    AFTER INSERT OR UPDATE OR DELETE ON stock
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Cierre de Caja (tabla real: cierrecaja)
DROP TRIGGER IF EXISTS audit_cierrecaja ON cierrecaja;
CREATE TRIGGER audit_cierrecaja
    AFTER INSERT OR UPDATE OR DELETE ON cierrecaja
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Movimientos de Caja
DROP TRIGGER IF EXISTS audit_movimientos_caja ON movimientos_caja;
CREATE TRIGGER audit_movimientos_caja
    AFTER INSERT OR UPDATE OR DELETE ON movimientos_caja
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- Movimientos de Stock
DROP TRIGGER IF EXISTS audit_movimientos_stock ON movimientos_stock;
CREATE TRIGGER audit_movimientos_stock
    AFTER INSERT OR UPDATE OR DELETE ON movimientos_stock
    FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- =====================================================
-- 6. FUNCIÓN RPC PARA CONSULTAR AUDITORÍA
-- =====================================================

CREATE OR REPLACE FUNCTION consultar_auditoria(
    _id_empresa BIGINT,
    _fecha_inicio TIMESTAMPTZ DEFAULT NULL,
    _fecha_fin TIMESTAMPTZ DEFAULT NULL,
    _tabla VARCHAR(100) DEFAULT NULL,
    _operacion VARCHAR(20) DEFAULT NULL,
    _id_usuario BIGINT DEFAULT NULL,
    _limite INT DEFAULT 100,
    _offset INT DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    tabla VARCHAR(100),
    operacion VARCHAR(20),
    registro_id BIGINT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    campos_modificados TEXT[],
    id_usuario BIGINT,
    nombre_usuario VARCHAR(255),
    modulo VARCHAR(100),
    accion_detalle TEXT,
    fecha_hora TIMESTAMPTZ,
    icono TEXT,
    color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.tabla,
        a.operacion,
        a.registro_id,
        a.datos_anteriores,
        a.datos_nuevos,
        a.campos_modificados,
        a.id_usuario,
        a.nombre_usuario,
        a.modulo,
        a.accion_detalle,
        a.fecha_hora,
        -- Icono según operación
        CASE a.operacion
            WHEN 'INSERT' THEN 'lucide:plus-circle'
            WHEN 'UPDATE' THEN 'lucide:edit'
            WHEN 'DELETE' THEN 'lucide:trash-2'
            WHEN 'SOFT_DELETE' THEN 'lucide:archive'
            WHEN 'RESTORE' THEN 'lucide:rotate-ccw'
            WHEN 'LOGIN' THEN 'lucide:log-in'
            WHEN 'LOGOUT' THEN 'lucide:log-out'
            WHEN 'VENTA' THEN 'lucide:shopping-cart'
            WHEN 'CIERRE_CAJA' THEN 'lucide:lock'
            WHEN 'APERTURA_CAJA' THEN 'lucide:unlock'
            WHEN 'MOVIMIENTO_CAJA' THEN 'lucide:arrow-left-right'
            ELSE 'lucide:activity'
        END AS icono,
        -- Color según operación
        CASE a.operacion
            WHEN 'INSERT' THEN '#10b981'
            WHEN 'UPDATE' THEN '#3b82f6'
            WHEN 'DELETE' THEN '#ef4444'
            WHEN 'SOFT_DELETE' THEN '#f59e0b'
            WHEN 'RESTORE' THEN '#8b5cf6'
            WHEN 'LOGIN' THEN '#06b6d4'
            WHEN 'LOGOUT' THEN '#64748b'
            WHEN 'VENTA' THEN '#22c55e'
            WHEN 'CIERRE_CAJA' THEN '#dc2626'
            WHEN 'APERTURA_CAJA' THEN '#16a34a'
            WHEN 'MOVIMIENTO_CAJA' THEN '#0ea5e9'
            ELSE '#94a3b8'
        END AS color
    FROM auditoria a
    WHERE a.id_empresa = _id_empresa
        AND (_fecha_inicio IS NULL OR a.fecha_hora >= _fecha_inicio)
        AND (_fecha_fin IS NULL OR a.fecha_hora <= _fecha_fin)
        AND (_tabla IS NULL OR a.tabla = _tabla)
        AND (_operacion IS NULL OR a.operacion = _operacion)
        AND (_id_usuario IS NULL OR a.id_usuario = _id_usuario)
    ORDER BY a.fecha_hora DESC
    LIMIT _limite
    OFFSET _offset;
END;
$$;

-- =====================================================
-- 7. FUNCIÓN PARA OBTENER RESUMEN DE AUDITORÍA
-- =====================================================

CREATE OR REPLACE FUNCTION resumen_auditoria(
    _id_empresa BIGINT,
    _fecha_inicio TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '7 days'),
    _fecha_fin TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_operaciones BIGINT,
    inserciones BIGINT,
    actualizaciones BIGINT,
    eliminaciones BIGINT,
    restauraciones BIGINT,
    ventas BIGINT,
    usuarios_activos BIGINT,
    tabla_mas_activa VARCHAR(100),
    operaciones_por_dia JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tabla_mas_activa VARCHAR(100);
    v_operaciones_por_dia JSONB;
BEGIN
    -- Tabla más activa
    SELECT a.tabla INTO v_tabla_mas_activa
    FROM auditoria a
    WHERE a.id_empresa = _id_empresa
        AND a.fecha_hora BETWEEN _fecha_inicio AND _fecha_fin
    GROUP BY a.tabla
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Operaciones por día
    SELECT jsonb_agg(
        jsonb_build_object(
            'fecha', dia,
            'total', total
        )
    ) INTO v_operaciones_por_dia
    FROM (
        SELECT 
            DATE(a.fecha_hora) as dia,
            COUNT(*) as total
        FROM auditoria a
        WHERE a.id_empresa = _id_empresa
            AND a.fecha_hora BETWEEN _fecha_inicio AND _fecha_fin
        GROUP BY DATE(a.fecha_hora)
        ORDER BY dia
    ) sub;

    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_operaciones,
        COUNT(*) FILTER (WHERE a.operacion = 'INSERT')::BIGINT as inserciones,
        COUNT(*) FILTER (WHERE a.operacion = 'UPDATE')::BIGINT as actualizaciones,
        COUNT(*) FILTER (WHERE a.operacion IN ('DELETE', 'SOFT_DELETE'))::BIGINT as eliminaciones,
        COUNT(*) FILTER (WHERE a.operacion = 'RESTORE')::BIGINT as restauraciones,
        COUNT(*) FILTER (WHERE a.operacion = 'VENTA' OR a.tabla = 'ventas')::BIGINT as ventas,
        COUNT(DISTINCT a.id_usuario)::BIGINT as usuarios_activos,
        v_tabla_mas_activa,
        COALESCE(v_operaciones_por_dia, '[]'::JSONB)
    FROM auditoria a
    WHERE a.id_empresa = _id_empresa
        AND a.fecha_hora BETWEEN _fecha_inicio AND _fecha_fin;
END;
$$;

-- =====================================================
-- 8. FUNCIÓN PARA AUDITORÍA MANUAL (DESDE FRONTEND)
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_accion_usuario(
    _tabla VARCHAR(100),
    _operacion VARCHAR(20),
    _registro_id BIGINT,
    _id_usuario BIGINT,
    _id_empresa BIGINT,
    _modulo VARCHAR(100) DEFAULT NULL,
    _accion_detalle TEXT DEFAULT NULL,
    _datos_adicionales JSONB DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id BIGINT;
    v_nombre_usuario VARCHAR(255);
BEGIN
    -- Obtener nombre del usuario
    SELECT nombres INTO v_nombre_usuario 
    FROM usuarios 
    WHERE id = _id_usuario;
    
    -- Insertar registro
    INSERT INTO auditoria (
        tabla,
        operacion,
        registro_id,
        datos_nuevos,
        id_usuario,
        nombre_usuario,
        id_empresa,
        modulo,
        accion_detalle
    ) VALUES (
        _tabla,
        _operacion,
        _registro_id,
        _datos_adicionales,
        _id_usuario,
        v_nombre_usuario,
        _id_empresa,
        _modulo,
        _accion_detalle
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- =====================================================
-- 9. POLÍTICA DE RETENCIÓN (LIMPIEZA AUTOMÁTICA)
-- =====================================================

-- Función para limpiar registros antiguos (más de 1 año)
CREATE OR REPLACE FUNCTION limpiar_auditoria_antigua()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_eliminados INTEGER;
BEGIN
    DELETE FROM auditoria
    WHERE fecha_hora < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS v_eliminados = ROW_COUNT;
    
    RETURN v_eliminados;
END;
$$;

-- =====================================================
-- 10. VISTA PARA CONSULTA RÁPIDA
-- =====================================================

CREATE OR REPLACE VIEW vista_auditoria_reciente AS
SELECT 
    a.id,
    a.tabla,
    a.operacion,
    a.registro_id,
    a.nombre_usuario,
    a.accion_detalle,
    a.fecha_hora,
    a.id_empresa,
    CASE a.operacion
        WHEN 'INSERT' THEN 'lucide:plus-circle'
        WHEN 'UPDATE' THEN 'lucide:edit'
        WHEN 'DELETE' THEN 'lucide:trash-2'
        WHEN 'SOFT_DELETE' THEN 'lucide:archive'
        WHEN 'RESTORE' THEN 'lucide:rotate-ccw'
        WHEN 'LOGIN' THEN 'lucide:log-in'
        WHEN 'LOGOUT' THEN 'lucide:log-out'
        WHEN 'VENTA' THEN 'lucide:shopping-cart'
        ELSE 'lucide:activity'
    END AS icono,
    CASE a.operacion
        WHEN 'INSERT' THEN '#10b981'
        WHEN 'UPDATE' THEN '#3b82f6'
        WHEN 'DELETE' THEN '#ef4444'
        WHEN 'SOFT_DELETE' THEN '#f59e0b'
        WHEN 'RESTORE' THEN '#8b5cf6'
        ELSE '#94a3b8'
    END AS color
FROM auditoria a
ORDER BY a.fecha_hora DESC;

-- =====================================================
-- 11. HABILITAR RLS EN TABLA DE AUDITORÍA
-- =====================================================

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver auditoría de su empresa
-- NOTA: La relación es empresa.id_usuario -> usuarios.id (empresa tiene id_usuario)
CREATE POLICY "Usuarios ven auditoria de su empresa" ON auditoria
    FOR SELECT
    USING (
        id_empresa IN (
            SELECT e.id FROM empresa e
            INNER JOIN usuarios u ON e.id_usuario = u.id
            WHERE u.id_auth = auth.uid()::text
        )
    );

-- Política: Solo el sistema puede insertar
CREATE POLICY "Sistema puede insertar auditoria" ON auditoria
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
COMMENT ON TABLE auditoria IS 'Tabla de auditoría para registro de todas las operaciones del sistema';
COMMENT ON FUNCTION registrar_auditoria IS 'Función para registrar manualmente eventos de auditoría';
COMMENT ON FUNCTION consultar_auditoria IS 'Función RPC para consultar registros de auditoría con filtros';
COMMENT ON FUNCTION resumen_auditoria IS 'Función para obtener estadísticas resumidas de auditoría';
