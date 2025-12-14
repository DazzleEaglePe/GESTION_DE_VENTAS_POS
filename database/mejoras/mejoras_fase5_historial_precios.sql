-- =====================================================
-- FASE 3: HISTORIAL DE PRECIOS
-- Descripción: Sistema para rastrear todos los cambios 
--              de precios de productos
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- 1. TABLA DE HISTORIAL DE PRECIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS historial_precios (
    id BIGSERIAL PRIMARY KEY,
    
    -- Referencia al producto
    id_producto BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    
    -- Precios anteriores
    precio_venta_anterior NUMERIC,
    precio_compra_anterior NUMERIC,
    
    -- Precios nuevos
    precio_venta_nuevo NUMERIC,
    precio_compra_nuevo NUMERIC,
    
    -- Variación calculada
    variacion_venta NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN precio_venta_anterior > 0 THEN 
                ROUND(((precio_venta_nuevo - precio_venta_anterior) / precio_venta_anterior) * 100, 2)
            ELSE 0 
        END
    ) STORED,
    variacion_compra NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN precio_compra_anterior > 0 THEN 
                ROUND(((precio_compra_nuevo - precio_compra_anterior) / precio_compra_anterior) * 100, 2)
            ELSE 0 
        END
    ) STORED,
    
    -- Información del cambio
    motivo TEXT, -- Opcional: razón del cambio de precio
    tipo_cambio VARCHAR(50) DEFAULT 'manual' CHECK (tipo_cambio IN ('manual', 'promocion', 'ajuste_costo', 'inflacion', 'oferta', 'otro')),
    
    -- Información del usuario que realizó el cambio
    id_usuario BIGINT REFERENCES usuarios(id),
    nombre_usuario VARCHAR(255),
    
    -- Información de la empresa
    id_empresa BIGINT NOT NULL REFERENCES empresa(id),
    
    -- Timestamps
    fecha_cambio TIMESTAMPTZ DEFAULT NOW(),
    
    -- Vigencia (para promociones temporales)
    fecha_inicio_vigencia TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin_vigencia TIMESTAMPTZ, -- NULL = vigente indefinidamente
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para búsquedas por producto (el más común)
CREATE INDEX IF NOT EXISTS idx_historial_precios_producto ON historial_precios(id_producto, fecha_cambio DESC);

-- Índice para búsquedas por empresa
CREATE INDEX IF NOT EXISTS idx_historial_precios_empresa ON historial_precios(id_empresa, fecha_cambio DESC);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_historial_precios_fecha ON historial_precios(fecha_cambio DESC);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_historial_precios_usuario ON historial_precios(id_usuario);

-- Índice compuesto para reportes
CREATE INDEX IF NOT EXISTS idx_historial_precios_empresa_producto ON historial_precios(id_empresa, id_producto, fecha_cambio DESC);

-- =====================================================
-- 3. TRIGGER AUTOMÁTICO PARA CAPTURAR CAMBIOS DE PRECIO
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_historial_precios()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_empresa BIGINT;
    v_precio_venta_cambio BOOLEAN;
    v_precio_compra_cambio BOOLEAN;
BEGIN
    -- Solo actuar en UPDATE
    IF TG_OP != 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- Verificar si hubo cambio en algún precio
    v_precio_venta_cambio := OLD.precio_venta IS DISTINCT FROM NEW.precio_venta;
    v_precio_compra_cambio := OLD.precio_compra IS DISTINCT FROM NEW.precio_compra;
    
    -- Si no hay cambios en precios, no hacer nada
    IF NOT v_precio_venta_cambio AND NOT v_precio_compra_cambio THEN
        RETURN NEW;
    END IF;
    
    -- Obtener id_empresa del producto
    v_id_empresa := NEW.id_empresa;
    
    -- Insertar registro en historial
    INSERT INTO historial_precios (
        id_producto,
        precio_venta_anterior,
        precio_compra_anterior,
        precio_venta_nuevo,
        precio_compra_nuevo,
        id_empresa,
        tipo_cambio
    ) VALUES (
        NEW.id,
        OLD.precio_venta,
        OLD.precio_compra,
        NEW.precio_venta,
        NEW.precio_compra,
        v_id_empresa,
        'manual'
    );
    
    RETURN NEW;
END;
$$;

-- Crear el trigger en la tabla productos
DROP TRIGGER IF EXISTS trg_historial_precios ON productos;
CREATE TRIGGER trg_historial_precios
    AFTER UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_historial_precios();

-- =====================================================
-- 4. FUNCIÓN PARA REGISTRAR CAMBIO DE PRECIO MANUAL
--    (con más detalles como motivo, usuario, etc.)
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_cambio_precio(
    _id_producto BIGINT,
    _precio_venta_nuevo NUMERIC,
    _precio_compra_nuevo NUMERIC,
    _id_usuario BIGINT,
    _id_empresa BIGINT,
    _motivo TEXT DEFAULT NULL,
    _tipo_cambio VARCHAR(50) DEFAULT 'manual',
    _fecha_fin_vigencia TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_precio_venta_anterior NUMERIC;
    v_precio_compra_anterior NUMERIC;
    v_nombre_usuario VARCHAR(255);
    v_nombre_producto TEXT;
    v_historial_id BIGINT;
BEGIN
    -- Obtener precios actuales del producto
    SELECT precio_venta, precio_compra, nombre 
    INTO v_precio_venta_anterior, v_precio_compra_anterior, v_nombre_producto
    FROM productos 
    WHERE id = _id_producto;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Producto no encontrado');
    END IF;
    
    -- Obtener nombre del usuario
    SELECT nombres INTO v_nombre_usuario 
    FROM usuarios 
    WHERE id = _id_usuario;
    
    -- Verificar si hay cambio real
    IF v_precio_venta_anterior = _precio_venta_nuevo AND v_precio_compra_anterior = _precio_compra_nuevo THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'No hay cambios en los precios');
    END IF;
    
    -- Insertar en historial (el trigger también lo hará, pero este tiene más info)
    -- Primero deshabilitamos temporalmente el trigger para evitar duplicados
    ALTER TABLE productos DISABLE TRIGGER trg_historial_precios;
    
    -- Actualizar el producto
    UPDATE productos 
    SET 
        precio_venta = _precio_venta_nuevo,
        precio_compra = _precio_compra_nuevo
    WHERE id = _id_producto;
    
    -- Insertar manualmente con toda la información
    INSERT INTO historial_precios (
        id_producto,
        precio_venta_anterior,
        precio_compra_anterior,
        precio_venta_nuevo,
        precio_compra_nuevo,
        motivo,
        tipo_cambio,
        id_usuario,
        nombre_usuario,
        id_empresa,
        fecha_fin_vigencia
    ) VALUES (
        _id_producto,
        v_precio_venta_anterior,
        v_precio_compra_anterior,
        _precio_venta_nuevo,
        _precio_compra_nuevo,
        _motivo,
        _tipo_cambio,
        _id_usuario,
        v_nombre_usuario,
        _id_empresa,
        _fecha_fin_vigencia
    )
    RETURNING id INTO v_historial_id;
    
    -- Rehabilitar el trigger
    ALTER TABLE productos ENABLE TRIGGER trg_historial_precios;
    
    RETURN jsonb_build_object(
        'exito', true,
        'mensaje', 'Precio actualizado correctamente',
        'historial_id', v_historial_id,
        'producto', v_nombre_producto,
        'precio_venta_anterior', v_precio_venta_anterior,
        'precio_venta_nuevo', _precio_venta_nuevo,
        'precio_compra_anterior', v_precio_compra_anterior,
        'precio_compra_nuevo', _precio_compra_nuevo
    );
END;
$$;

-- =====================================================
-- 5. FUNCIÓN RPC PARA CONSULTAR HISTORIAL DE UN PRODUCTO
-- =====================================================

CREATE OR REPLACE FUNCTION consultar_historial_precios(
    _id_producto BIGINT,
    _limite INT DEFAULT 50,
    _offset INT DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    precio_venta_anterior NUMERIC,
    precio_compra_anterior NUMERIC,
    precio_venta_nuevo NUMERIC,
    precio_compra_nuevo NUMERIC,
    variacion_venta NUMERIC,
    variacion_compra NUMERIC,
    motivo TEXT,
    tipo_cambio VARCHAR(50),
    id_usuario BIGINT,
    nombre_usuario VARCHAR(255),
    fecha_cambio TIMESTAMPTZ,
    fecha_fin_vigencia TIMESTAMPTZ,
    icono_tendencia TEXT,
    color_tendencia TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hp.id,
        hp.precio_venta_anterior,
        hp.precio_compra_anterior,
        hp.precio_venta_nuevo,
        hp.precio_compra_nuevo,
        hp.variacion_venta,
        hp.variacion_compra,
        hp.motivo,
        hp.tipo_cambio,
        hp.id_usuario,
        hp.nombre_usuario,
        hp.fecha_cambio,
        hp.fecha_fin_vigencia,
        -- Icono según tendencia
        CASE 
            WHEN hp.precio_venta_nuevo > hp.precio_venta_anterior THEN 'lucide:trending-up'
            WHEN hp.precio_venta_nuevo < hp.precio_venta_anterior THEN 'lucide:trending-down'
            ELSE 'lucide:minus'
        END AS icono_tendencia,
        -- Color según tendencia
        CASE 
            WHEN hp.precio_venta_nuevo > hp.precio_venta_anterior THEN '#ef4444'
            WHEN hp.precio_venta_nuevo < hp.precio_venta_anterior THEN '#22c55e'
            ELSE '#94a3b8'
        END AS color_tendencia
    FROM historial_precios hp
    WHERE hp.id_producto = _id_producto
    ORDER BY hp.fecha_cambio DESC
    LIMIT _limite
    OFFSET _offset;
END;
$$;

-- =====================================================
-- 6. FUNCIÓN RPC PARA CONSULTAR HISTORIAL POR EMPRESA
-- =====================================================

CREATE OR REPLACE FUNCTION consultar_historial_precios_empresa(
    _id_empresa BIGINT,
    _fecha_inicio TIMESTAMPTZ DEFAULT NULL,
    _fecha_fin TIMESTAMPTZ DEFAULT NULL,
    _id_categoria BIGINT DEFAULT NULL,
    _tipo_cambio VARCHAR(50) DEFAULT NULL,
    _limite INT DEFAULT 100,
    _offset INT DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    id_producto BIGINT,
    nombre_producto TEXT,
    codigo_barras TEXT,
    nombre_categoria TEXT,
    precio_venta_anterior NUMERIC,
    precio_compra_anterior NUMERIC,
    precio_venta_nuevo NUMERIC,
    precio_compra_nuevo NUMERIC,
    variacion_venta NUMERIC,
    variacion_compra NUMERIC,
    motivo TEXT,
    tipo_cambio VARCHAR(50),
    nombre_usuario VARCHAR(255),
    fecha_cambio TIMESTAMPTZ,
    icono_tendencia TEXT,
    color_tendencia TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hp.id,
        hp.id_producto,
        p.nombre AS nombre_producto,
        p.codigo_barras,
        c.nombre AS nombre_categoria,
        hp.precio_venta_anterior,
        hp.precio_compra_anterior,
        hp.precio_venta_nuevo,
        hp.precio_compra_nuevo,
        hp.variacion_venta,
        hp.variacion_compra,
        hp.motivo,
        hp.tipo_cambio,
        hp.nombre_usuario,
        hp.fecha_cambio,
        CASE 
            WHEN hp.precio_venta_nuevo > hp.precio_venta_anterior THEN 'lucide:trending-up'
            WHEN hp.precio_venta_nuevo < hp.precio_venta_anterior THEN 'lucide:trending-down'
            ELSE 'lucide:minus'
        END AS icono_tendencia,
        CASE 
            WHEN hp.precio_venta_nuevo > hp.precio_venta_anterior THEN '#ef4444'
            WHEN hp.precio_venta_nuevo < hp.precio_venta_anterior THEN '#22c55e'
            ELSE '#94a3b8'
        END AS color_tendencia
    FROM historial_precios hp
    INNER JOIN productos p ON hp.id_producto = p.id
    LEFT JOIN categorias c ON p.id_categoria = c.id
    WHERE hp.id_empresa = _id_empresa
        AND (_fecha_inicio IS NULL OR hp.fecha_cambio >= _fecha_inicio)
        AND (_fecha_fin IS NULL OR hp.fecha_cambio <= _fecha_fin)
        AND (_id_categoria IS NULL OR p.id_categoria = _id_categoria)
        AND (_tipo_cambio IS NULL OR hp.tipo_cambio = _tipo_cambio)
    ORDER BY hp.fecha_cambio DESC
    LIMIT _limite
    OFFSET _offset;
END;
$$;

-- =====================================================
-- 7. FUNCIÓN PARA ESTADÍSTICAS DE CAMBIOS DE PRECIO
-- =====================================================

CREATE OR REPLACE FUNCTION estadisticas_historial_precios(
    _id_empresa BIGINT,
    _fecha_inicio TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    _fecha_fin TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_cambios BIGINT,
    cambios_incremento BIGINT,
    cambios_decremento BIGINT,
    sin_cambio BIGINT,
    promedio_variacion_venta NUMERIC,
    promedio_variacion_compra NUMERIC,
    producto_mayor_incremento JSONB,
    producto_mayor_decremento JSONB,
    cambios_por_tipo JSONB,
    cambios_por_dia JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_producto_mayor_incremento JSONB;
    v_producto_mayor_decremento JSONB;
    v_cambios_por_tipo JSONB;
    v_cambios_por_dia JSONB;
BEGIN
    -- Producto con mayor incremento
    SELECT jsonb_build_object(
        'id', hp.id_producto,
        'nombre', p.nombre,
        'variacion', hp.variacion_venta,
        'precio_anterior', hp.precio_venta_anterior,
        'precio_nuevo', hp.precio_venta_nuevo
    ) INTO v_producto_mayor_incremento
    FROM historial_precios hp
    INNER JOIN productos p ON hp.id_producto = p.id
    WHERE hp.id_empresa = _id_empresa
        AND hp.fecha_cambio BETWEEN _fecha_inicio AND _fecha_fin
        AND hp.variacion_venta > 0
    ORDER BY hp.variacion_venta DESC
    LIMIT 1;
    
    -- Producto con mayor decremento
    SELECT jsonb_build_object(
        'id', hp.id_producto,
        'nombre', p.nombre,
        'variacion', hp.variacion_venta,
        'precio_anterior', hp.precio_venta_anterior,
        'precio_nuevo', hp.precio_venta_nuevo
    ) INTO v_producto_mayor_decremento
    FROM historial_precios hp
    INNER JOIN productos p ON hp.id_producto = p.id
    WHERE hp.id_empresa = _id_empresa
        AND hp.fecha_cambio BETWEEN _fecha_inicio AND _fecha_fin
        AND hp.variacion_venta < 0
    ORDER BY hp.variacion_venta ASC
    LIMIT 1;
    
    -- Cambios por tipo
    SELECT jsonb_agg(
        jsonb_build_object(
            'tipo', tipo_cambio,
            'cantidad', cantidad
        )
    ) INTO v_cambios_por_tipo
    FROM (
        SELECT hp.tipo_cambio, COUNT(*) as cantidad
        FROM historial_precios hp
        WHERE hp.id_empresa = _id_empresa
            AND hp.fecha_cambio BETWEEN _fecha_inicio AND _fecha_fin
        GROUP BY hp.tipo_cambio
    ) sub;
    
    -- Cambios por día
    SELECT jsonb_agg(
        jsonb_build_object(
            'fecha', dia,
            'total', total
        )
    ) INTO v_cambios_por_dia
    FROM (
        SELECT 
            DATE(hp.fecha_cambio) as dia,
            COUNT(*) as total
        FROM historial_precios hp
        WHERE hp.id_empresa = _id_empresa
            AND hp.fecha_cambio BETWEEN _fecha_inicio AND _fecha_fin
        GROUP BY DATE(hp.fecha_cambio)
        ORDER BY dia
    ) sub;

    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_cambios,
        COUNT(*) FILTER (WHERE hp.variacion_venta > 0)::BIGINT as cambios_incremento,
        COUNT(*) FILTER (WHERE hp.variacion_venta < 0)::BIGINT as cambios_decremento,
        COUNT(*) FILTER (WHERE hp.variacion_venta = 0)::BIGINT as sin_cambio,
        ROUND(AVG(hp.variacion_venta), 2) as promedio_variacion_venta,
        ROUND(AVG(hp.variacion_compra), 2) as promedio_variacion_compra,
        COALESCE(v_producto_mayor_incremento, '{}'::JSONB),
        COALESCE(v_producto_mayor_decremento, '{}'::JSONB),
        COALESCE(v_cambios_por_tipo, '[]'::JSONB),
        COALESCE(v_cambios_por_dia, '[]'::JSONB)
    FROM historial_precios hp
    WHERE hp.id_empresa = _id_empresa
        AND hp.fecha_cambio BETWEEN _fecha_inicio AND _fecha_fin;
END;
$$;

-- =====================================================
-- 8. FUNCIÓN PARA OBTENER PRECIO EN UNA FECHA ESPECÍFICA
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_precio_en_fecha(
    _id_producto BIGINT,
    _fecha TIMESTAMPTZ
)
RETURNS TABLE (
    precio_venta NUMERIC,
    precio_compra NUMERIC,
    fecha_vigencia TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Buscar el registro de historial más reciente antes de la fecha dada
    RETURN QUERY
    SELECT 
        hp.precio_venta_nuevo,
        hp.precio_compra_nuevo,
        hp.fecha_cambio
    FROM historial_precios hp
    WHERE hp.id_producto = _id_producto
        AND hp.fecha_cambio <= _fecha
    ORDER BY hp.fecha_cambio DESC
    LIMIT 1;
    
    -- Si no hay historial, retornar precio actual
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p.precio_venta,
            p.precio_compra,
            NOW() as fecha_vigencia
        FROM productos p
        WHERE p.id = _id_producto;
    END IF;
END;
$$;

-- =====================================================
-- 9. VISTA PARA ÚLTIMOS CAMBIOS DE PRECIO
-- =====================================================

CREATE OR REPLACE VIEW vista_ultimos_cambios_precio AS
SELECT 
    hp.id,
    hp.id_producto,
    p.nombre AS nombre_producto,
    p.codigo_barras,
    c.nombre AS nombre_categoria,
    hp.precio_venta_anterior,
    hp.precio_venta_nuevo,
    hp.variacion_venta,
    hp.tipo_cambio,
    hp.nombre_usuario,
    hp.fecha_cambio,
    hp.id_empresa,
    CASE 
        WHEN hp.variacion_venta > 0 THEN 'incremento'
        WHEN hp.variacion_venta < 0 THEN 'decremento'
        ELSE 'sin_cambio'
    END AS tendencia,
    CASE 
        WHEN hp.variacion_venta > 0 THEN 'lucide:trending-up'
        WHEN hp.variacion_venta < 0 THEN 'lucide:trending-down'
        ELSE 'lucide:minus'
    END AS icono,
    CASE 
        WHEN hp.variacion_venta > 0 THEN '#ef4444'
        WHEN hp.variacion_venta < 0 THEN '#22c55e'
        ELSE '#94a3b8'
    END AS color
FROM historial_precios hp
INNER JOIN productos p ON hp.id_producto = p.id
LEFT JOIN categorias c ON p.id_categoria = c.id
ORDER BY hp.fecha_cambio DESC;

-- =====================================================
-- 10. HABILITAR RLS EN TABLA DE HISTORIAL
-- =====================================================

ALTER TABLE historial_precios ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver historial de su empresa
CREATE POLICY "Usuarios ven historial de su empresa" ON historial_precios
    FOR SELECT
    USING (
        id_empresa IN (
            SELECT e.id FROM empresa e
            INNER JOIN usuarios u ON e.id_usuario = u.id
            WHERE u.id_auth = auth.uid()::text
        )
    );

-- Política: Solo el sistema puede insertar (a través de triggers/funciones)
CREATE POLICY "Sistema puede insertar historial" ON historial_precios
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- 11. PERMISOS
-- =====================================================

-- Otorgar permisos necesarios
GRANT SELECT ON historial_precios TO authenticated;
GRANT SELECT ON vista_ultimos_cambios_precio TO authenticated;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE historial_precios IS 'Historial de cambios de precios de productos';
COMMENT ON FUNCTION trigger_historial_precios IS 'Trigger que captura automáticamente cambios de precio en productos';
COMMENT ON FUNCTION registrar_cambio_precio IS 'Función para registrar cambio de precio con información detallada';
COMMENT ON FUNCTION consultar_historial_precios IS 'Consulta historial de precios de un producto específico';
COMMENT ON FUNCTION consultar_historial_precios_empresa IS 'Consulta historial de precios de toda la empresa con filtros';
COMMENT ON FUNCTION estadisticas_historial_precios IS 'Obtiene estadísticas de cambios de precio en un período';
COMMENT ON FUNCTION obtener_precio_en_fecha IS 'Obtiene el precio que tenía un producto en una fecha específica';
