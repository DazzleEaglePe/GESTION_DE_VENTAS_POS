-- =====================================================
-- FASE 3: TRANSFERENCIAS ENTRE ALMACENES
-- Descripción: Sistema para gestionar transferencias 
--              de productos entre almacenes
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- 1. TABLA DE TRANSFERENCIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS transferencias (
    id BIGSERIAL PRIMARY KEY,
    
    -- Código único de transferencia
    codigo VARCHAR(20) NOT NULL UNIQUE,
    
    -- Almacenes origen y destino
    id_almacen_origen BIGINT NOT NULL REFERENCES almacen(id),
    id_almacen_destino BIGINT NOT NULL REFERENCES almacen(id),
    
    -- Estado de la transferencia
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_transito', 'completada', 'cancelada', 'parcial')),
    
    -- Usuario que crea y procesa
    id_usuario_creador BIGINT REFERENCES usuarios(id),
    id_usuario_receptor BIGINT REFERENCES usuarios(id),
    
    -- Información de la empresa
    id_empresa BIGINT NOT NULL REFERENCES empresa(id),
    
    -- Notas y observaciones
    notas TEXT,
    motivo_cancelacion TEXT,
    
    -- Fechas
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_envio TIMESTAMPTZ,
    fecha_recepcion TIMESTAMPTZ,
    fecha_cancelacion TIMESTAMPTZ,
    
    -- Validación
    CONSTRAINT check_almacenes_diferentes CHECK (id_almacen_origen != id_almacen_destino)
);

-- =====================================================
-- 2. TABLA DE DETALLE DE TRANSFERENCIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS detalle_transferencia (
    id BIGSERIAL PRIMARY KEY,
    
    -- Referencia a la transferencia
    id_transferencia BIGINT NOT NULL REFERENCES transferencias(id) ON DELETE CASCADE,
    
    -- Producto transferido
    id_producto BIGINT NOT NULL REFERENCES productos(id),
    
    -- Cantidades
    cantidad_enviada NUMERIC NOT NULL CHECK (cantidad_enviada > 0),
    cantidad_recibida NUMERIC DEFAULT 0,
    
    -- Estado del item
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'recibido', 'parcial', 'faltante')),
    
    -- Notas específicas del item
    notas TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para búsquedas por empresa
CREATE INDEX IF NOT EXISTS idx_transferencias_empresa ON transferencias(id_empresa, fecha_creacion DESC);

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_transferencias_estado ON transferencias(estado);

-- Índice para búsquedas por almacén origen
CREATE INDEX IF NOT EXISTS idx_transferencias_origen ON transferencias(id_almacen_origen);

-- Índice para búsquedas por almacén destino
CREATE INDEX IF NOT EXISTS idx_transferencias_destino ON transferencias(id_almacen_destino);

-- Índice para búsquedas por código
CREATE INDEX IF NOT EXISTS idx_transferencias_codigo ON transferencias(codigo);

-- Índice para detalle por transferencia
CREATE INDEX IF NOT EXISTS idx_detalle_transferencia ON detalle_transferencia(id_transferencia);

-- =====================================================
-- 4. FUNCIÓN PARA GENERAR CÓDIGO DE TRANSFERENCIA
-- =====================================================

CREATE OR REPLACE FUNCTION generar_codigo_transferencia(_id_empresa BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_numero INT;
    v_codigo TEXT;
BEGIN
    -- Obtener el siguiente número
    SELECT COALESCE(MAX(
        CASE 
            WHEN codigo ~ '^TRF-[0-9]+$' 
            THEN CAST(SUBSTRING(codigo FROM 5) AS INT)
            ELSE 0 
        END
    ), 0) + 1 INTO v_numero
    FROM transferencias
    WHERE id_empresa = _id_empresa;
    
    -- Generar código
    v_codigo := 'TRF-' || LPAD(v_numero::TEXT, 6, '0');
    
    RETURN v_codigo;
END;
$$;

-- =====================================================
-- 5. FUNCIÓN PARA CREAR TRANSFERENCIA
-- =====================================================

CREATE OR REPLACE FUNCTION crear_transferencia(
    _id_almacen_origen BIGINT,
    _id_almacen_destino BIGINT,
    _id_usuario BIGINT,
    _id_empresa BIGINT,
    _productos JSONB, -- Array de {id_producto, cantidad}
    _notas TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_codigo TEXT;
    v_transferencia_id BIGINT;
    v_producto JSONB;
    v_stock_actual NUMERIC;
    v_nombre_producto TEXT;
    v_productos_sin_stock JSONB := '[]'::JSONB;
BEGIN
    -- Validar que los almacenes existan y pertenezcan a la empresa
    IF NOT EXISTS (
        SELECT 1 FROM almacen a
        INNER JOIN sucursales s ON a.id_sucursal = s.id
        WHERE a.id = _id_almacen_origen AND s.id_empresa = _id_empresa
    ) THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Almacén origen no válido');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM almacen a
        INNER JOIN sucursales s ON a.id_sucursal = s.id
        WHERE a.id = _id_almacen_destino AND s.id_empresa = _id_empresa
    ) THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Almacén destino no válido');
    END IF;
    
    -- Validar que sean diferentes
    IF _id_almacen_origen = _id_almacen_destino THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'El almacén origen y destino deben ser diferentes');
    END IF;
    
    -- Validar stock disponible para cada producto
    FOR v_producto IN SELECT * FROM jsonb_array_elements(_productos)
    LOOP
        SELECT COALESCE(st.stock, 0), p.nombre 
        INTO v_stock_actual, v_nombre_producto
        FROM productos p
        LEFT JOIN stock st ON st.id_producto = p.id AND st.id_almacen = _id_almacen_origen
        WHERE p.id = (v_producto->>'id_producto')::BIGINT;
        
        IF v_stock_actual < (v_producto->>'cantidad')::NUMERIC THEN
            v_productos_sin_stock := v_productos_sin_stock || jsonb_build_object(
                'producto', v_nombre_producto,
                'stock_disponible', v_stock_actual,
                'cantidad_solicitada', (v_producto->>'cantidad')::NUMERIC
            );
        END IF;
    END LOOP;
    
    -- Si hay productos sin stock suficiente, retornar error
    IF jsonb_array_length(v_productos_sin_stock) > 0 THEN
        RETURN jsonb_build_object(
            'exito', false, 
            'mensaje', 'Stock insuficiente para algunos productos',
            'productos_sin_stock', v_productos_sin_stock
        );
    END IF;
    
    -- Generar código
    v_codigo := generar_codigo_transferencia(_id_empresa);
    
    -- Crear la transferencia
    INSERT INTO transferencias (
        codigo,
        id_almacen_origen,
        id_almacen_destino,
        id_usuario_creador,
        id_empresa,
        notas,
        estado
    ) VALUES (
        v_codigo,
        _id_almacen_origen,
        _id_almacen_destino,
        _id_usuario,
        _id_empresa,
        _notas,
        'pendiente'
    )
    RETURNING id INTO v_transferencia_id;
    
    -- Insertar detalle de productos
    FOR v_producto IN SELECT * FROM jsonb_array_elements(_productos)
    LOOP
        INSERT INTO detalle_transferencia (
            id_transferencia,
            id_producto,
            cantidad_enviada
        ) VALUES (
            v_transferencia_id,
            (v_producto->>'id_producto')::BIGINT,
            (v_producto->>'cantidad')::NUMERIC
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'exito', true,
        'mensaje', 'Transferencia creada correctamente',
        'id_transferencia', v_transferencia_id,
        'codigo', v_codigo
    );
END;
$$;

-- =====================================================
-- 6. FUNCIÓN PARA ENVIAR TRANSFERENCIA (DESCONTAR STOCK)
-- =====================================================

CREATE OR REPLACE FUNCTION enviar_transferencia(
    _id_transferencia BIGINT,
    _id_usuario BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transferencia RECORD;
    v_detalle RECORD;
BEGIN
    -- Obtener la transferencia
    SELECT * INTO v_transferencia
    FROM transferencias
    WHERE id = _id_transferencia;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Transferencia no encontrada');
    END IF;
    
    -- Validar estado
    IF v_transferencia.estado != 'pendiente' THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Solo se pueden enviar transferencias pendientes');
    END IF;
    
    -- Descontar stock del almacén origen
    FOR v_detalle IN 
        SELECT dt.*, p.nombre as nombre_producto
        FROM detalle_transferencia dt
        INNER JOIN productos p ON dt.id_producto = p.id
        WHERE dt.id_transferencia = _id_transferencia
    LOOP
        -- Actualizar stock en origen
        UPDATE stock 
        SET stock = stock - v_detalle.cantidad_enviada
        WHERE id_almacen = v_transferencia.id_almacen_origen 
        AND id_producto = v_detalle.id_producto;
        
        -- Registrar movimiento de salida
        INSERT INTO movimientos_stock (
            id_almacen,
            id_producto,
            tipo_movimiento,
            cantidad,
            detalle,
            origen
        ) VALUES (
            v_transferencia.id_almacen_origen,
            v_detalle.id_producto,
            'salida',
            v_detalle.cantidad_enviada,
            'Transferencia ' || v_transferencia.codigo || ' - Enviado a otro almacén',
            'transferencia'
        );
    END LOOP;
    
    -- Actualizar estado de la transferencia
    UPDATE transferencias
    SET 
        estado = 'en_transito',
        fecha_envio = NOW()
    WHERE id = _id_transferencia;
    
    RETURN jsonb_build_object(
        'exito', true,
        'mensaje', 'Transferencia enviada correctamente',
        'codigo', v_transferencia.codigo
    );
END;
$$;

-- =====================================================
-- 7. FUNCIÓN PARA RECIBIR TRANSFERENCIA (AGREGAR STOCK)
-- =====================================================

CREATE OR REPLACE FUNCTION recibir_transferencia(
    _id_transferencia BIGINT,
    _id_usuario BIGINT,
    _productos_recibidos JSONB DEFAULT NULL -- Array de {id_producto, cantidad_recibida}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transferencia RECORD;
    v_detalle RECORD;
    v_cantidad_recibida NUMERIC;
    v_hay_faltantes BOOLEAN := false;
    v_producto_recibido JSONB;
BEGIN
    -- Obtener la transferencia
    SELECT * INTO v_transferencia
    FROM transferencias
    WHERE id = _id_transferencia;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Transferencia no encontrada');
    END IF;
    
    -- Validar estado
    IF v_transferencia.estado != 'en_transito' THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Solo se pueden recibir transferencias en tránsito');
    END IF;
    
    -- Procesar cada producto
    FOR v_detalle IN 
        SELECT dt.*, p.nombre as nombre_producto
        FROM detalle_transferencia dt
        INNER JOIN productos p ON dt.id_producto = p.id
        WHERE dt.id_transferencia = _id_transferencia
    LOOP
        -- Determinar cantidad recibida
        IF _productos_recibidos IS NOT NULL THEN
            -- Buscar cantidad específica recibida
            SELECT pr->>'cantidad_recibida' INTO v_cantidad_recibida
            FROM jsonb_array_elements(_productos_recibidos) pr
            WHERE (pr->>'id_producto')::BIGINT = v_detalle.id_producto;
            
            IF v_cantidad_recibida IS NULL THEN
                v_cantidad_recibida := v_detalle.cantidad_enviada;
            END IF;
        ELSE
            -- Asumir recepción completa
            v_cantidad_recibida := v_detalle.cantidad_enviada;
        END IF;
        
        -- Verificar si hay faltante
        IF v_cantidad_recibida < v_detalle.cantidad_enviada THEN
            v_hay_faltantes := true;
        END IF;
        
        -- Actualizar o crear stock en destino
        INSERT INTO stock (id_almacen, id_producto, stock)
        VALUES (v_transferencia.id_almacen_destino, v_detalle.id_producto, v_cantidad_recibida)
        ON CONFLICT (id_almacen, id_producto) 
        DO UPDATE SET stock = stock.stock + v_cantidad_recibida;
        
        -- Registrar movimiento de entrada
        INSERT INTO movimientos_stock (
            id_almacen,
            id_producto,
            tipo_movimiento,
            cantidad,
            detalle,
            origen
        ) VALUES (
            v_transferencia.id_almacen_destino,
            v_detalle.id_producto,
            'entrada',
            v_cantidad_recibida,
            'Transferencia ' || v_transferencia.codigo || ' - Recibido de otro almacén',
            'transferencia'
        );
        
        -- Actualizar detalle
        UPDATE detalle_transferencia
        SET 
            cantidad_recibida = v_cantidad_recibida,
            estado = CASE 
                WHEN v_cantidad_recibida = cantidad_enviada THEN 'recibido'
                WHEN v_cantidad_recibida > 0 THEN 'parcial'
                ELSE 'faltante'
            END
        WHERE id = v_detalle.id;
    END LOOP;
    
    -- Actualizar estado de la transferencia
    UPDATE transferencias
    SET 
        estado = CASE WHEN v_hay_faltantes THEN 'parcial' ELSE 'completada' END,
        fecha_recepcion = NOW(),
        id_usuario_receptor = _id_usuario
    WHERE id = _id_transferencia;
    
    RETURN jsonb_build_object(
        'exito', true,
        'mensaje', CASE WHEN v_hay_faltantes 
            THEN 'Transferencia recibida con faltantes' 
            ELSE 'Transferencia completada correctamente' 
        END,
        'codigo', v_transferencia.codigo,
        'hay_faltantes', v_hay_faltantes
    );
END;
$$;

-- =====================================================
-- 8. FUNCIÓN PARA CANCELAR TRANSFERENCIA
-- =====================================================

CREATE OR REPLACE FUNCTION cancelar_transferencia(
    _id_transferencia BIGINT,
    _id_usuario BIGINT,
    _motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transferencia RECORD;
    v_detalle RECORD;
BEGIN
    -- Obtener la transferencia
    SELECT * INTO v_transferencia
    FROM transferencias
    WHERE id = _id_transferencia;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Transferencia no encontrada');
    END IF;
    
    -- Solo se pueden cancelar transferencias pendientes o en tránsito
    IF v_transferencia.estado NOT IN ('pendiente', 'en_transito') THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'No se puede cancelar esta transferencia');
    END IF;
    
    -- Si está en tránsito, devolver el stock al origen
    IF v_transferencia.estado = 'en_transito' THEN
        FOR v_detalle IN 
            SELECT * FROM detalle_transferencia
            WHERE id_transferencia = _id_transferencia
        LOOP
            -- Devolver stock al origen
            UPDATE stock 
            SET stock = stock + v_detalle.cantidad_enviada
            WHERE id_almacen = v_transferencia.id_almacen_origen 
            AND id_producto = v_detalle.id_producto;
            
            -- Registrar movimiento de devolución
            INSERT INTO movimientos_stock (
                id_almacen,
                id_producto,
                tipo_movimiento,
                cantidad,
                detalle,
                origen
            ) VALUES (
                v_transferencia.id_almacen_origen,
                v_detalle.id_producto,
                'entrada',
                v_detalle.cantidad_enviada,
                'Transferencia ' || v_transferencia.codigo || ' - Cancelada, stock devuelto',
                'transferencia_cancelada'
            );
        END LOOP;
    END IF;
    
    -- Actualizar estado
    UPDATE transferencias
    SET 
        estado = 'cancelada',
        fecha_cancelacion = NOW(),
        motivo_cancelacion = _motivo
    WHERE id = _id_transferencia;
    
    RETURN jsonb_build_object(
        'exito', true,
        'mensaje', 'Transferencia cancelada correctamente',
        'codigo', v_transferencia.codigo
    );
END;
$$;

-- =====================================================
-- 9. FUNCIÓN RPC PARA CONSULTAR TRANSFERENCIAS
-- =====================================================

CREATE OR REPLACE FUNCTION consultar_transferencias(
    _id_empresa BIGINT,
    _estado VARCHAR(20) DEFAULT NULL,
    _id_almacen BIGINT DEFAULT NULL,
    _fecha_inicio TIMESTAMPTZ DEFAULT NULL,
    _fecha_fin TIMESTAMPTZ DEFAULT NULL,
    _limite INT DEFAULT 50,
    _offset INT DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    codigo VARCHAR(20),
    id_almacen_origen BIGINT,
    nombre_almacen_origen TEXT,
    nombre_sucursal_origen TEXT,
    id_almacen_destino BIGINT,
    nombre_almacen_destino TEXT,
    nombre_sucursal_destino TEXT,
    estado VARCHAR(20),
    total_productos BIGINT,
    total_items NUMERIC,
    usuario_creador TEXT,
    usuario_receptor TEXT,
    notas TEXT,
    fecha_creacion TIMESTAMPTZ,
    fecha_envio TIMESTAMPTZ,
    fecha_recepcion TIMESTAMPTZ,
    color_estado TEXT,
    icono_estado TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.codigo,
        t.id_almacen_origen,
        ao.nombre AS nombre_almacen_origen,
        so.nombre AS nombre_sucursal_origen,
        t.id_almacen_destino,
        ad.nombre AS nombre_almacen_destino,
        sd.nombre AS nombre_sucursal_destino,
        t.estado,
        COUNT(DISTINCT dt.id_producto) AS total_productos,
        COALESCE(SUM(dt.cantidad_enviada), 0) AS total_items,
        uc.nombres AS usuario_creador,
        ur.nombres AS usuario_receptor,
        t.notas,
        t.fecha_creacion,
        t.fecha_envio,
        t.fecha_recepcion,
        CASE t.estado
            WHEN 'pendiente' THEN '#f59e0b'
            WHEN 'en_transito' THEN '#3b82f6'
            WHEN 'completada' THEN '#22c55e'
            WHEN 'cancelada' THEN '#ef4444'
            WHEN 'parcial' THEN '#8b5cf6'
            ELSE '#94a3b8'
        END AS color_estado,
        CASE t.estado
            WHEN 'pendiente' THEN 'lucide:clock'
            WHEN 'en_transito' THEN 'lucide:truck'
            WHEN 'completada' THEN 'lucide:check-circle'
            WHEN 'cancelada' THEN 'lucide:x-circle'
            WHEN 'parcial' THEN 'lucide:alert-circle'
            ELSE 'lucide:help-circle'
        END AS icono_estado
    FROM transferencias t
    INNER JOIN almacen ao ON t.id_almacen_origen = ao.id
    INNER JOIN sucursales so ON ao.id_sucursal = so.id
    INNER JOIN almacen ad ON t.id_almacen_destino = ad.id
    INNER JOIN sucursales sd ON ad.id_sucursal = sd.id
    LEFT JOIN usuarios uc ON t.id_usuario_creador = uc.id
    LEFT JOIN usuarios ur ON t.id_usuario_receptor = ur.id
    LEFT JOIN detalle_transferencia dt ON t.id = dt.id_transferencia
    WHERE t.id_empresa = _id_empresa
        AND (_estado IS NULL OR t.estado = _estado)
        AND (_id_almacen IS NULL OR t.id_almacen_origen = _id_almacen OR t.id_almacen_destino = _id_almacen)
        AND (_fecha_inicio IS NULL OR t.fecha_creacion >= _fecha_inicio)
        AND (_fecha_fin IS NULL OR t.fecha_creacion <= _fecha_fin)
    GROUP BY t.id, ao.nombre, so.nombre, ad.nombre, sd.nombre, uc.nombres, ur.nombres
    ORDER BY t.fecha_creacion DESC
    LIMIT _limite
    OFFSET _offset;
END;
$$;

-- =====================================================
-- 10. FUNCIÓN RPC PARA OBTENER DETALLE DE TRANSFERENCIA
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_detalle_transferencia(_id_transferencia BIGINT)
RETURNS TABLE (
    id BIGINT,
    id_producto BIGINT,
    nombre_producto TEXT,
    codigo_barras TEXT,
    cantidad_enviada NUMERIC,
    cantidad_recibida NUMERIC,
    estado VARCHAR(20),
    diferencia NUMERIC,
    notas TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.id,
        dt.id_producto,
        p.nombre AS nombre_producto,
        p.codigo_barras,
        dt.cantidad_enviada,
        dt.cantidad_recibida,
        dt.estado,
        dt.cantidad_enviada - dt.cantidad_recibida AS diferencia,
        dt.notas
    FROM detalle_transferencia dt
    INNER JOIN productos p ON dt.id_producto = p.id
    WHERE dt.id_transferencia = _id_transferencia
    ORDER BY p.nombre;
END;
$$;

-- =====================================================
-- 11. FUNCIÓN PARA ESTADÍSTICAS DE TRANSFERENCIAS
-- =====================================================

CREATE OR REPLACE FUNCTION estadisticas_transferencias(
    _id_empresa BIGINT,
    _fecha_inicio TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    _fecha_fin TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_transferencias BIGINT,
    pendientes BIGINT,
    en_transito BIGINT,
    completadas BIGINT,
    canceladas BIGINT,
    parciales BIGINT,
    total_productos_transferidos NUMERIC,
    almacen_mas_envios JSONB,
    almacen_mas_recepciones JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_almacen_mas_envios JSONB;
    v_almacen_mas_recepciones JSONB;
BEGIN
    -- Almacén con más envíos
    SELECT jsonb_build_object(
        'id', a.id,
        'nombre', a.nombre,
        'total', COUNT(*)
    ) INTO v_almacen_mas_envios
    FROM transferencias t
    INNER JOIN almacen a ON t.id_almacen_origen = a.id
    WHERE t.id_empresa = _id_empresa
        AND t.fecha_creacion BETWEEN _fecha_inicio AND _fecha_fin
    GROUP BY a.id, a.nombre
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Almacén con más recepciones
    SELECT jsonb_build_object(
        'id', a.id,
        'nombre', a.nombre,
        'total', COUNT(*)
    ) INTO v_almacen_mas_recepciones
    FROM transferencias t
    INNER JOIN almacen a ON t.id_almacen_destino = a.id
    WHERE t.id_empresa = _id_empresa
        AND t.fecha_creacion BETWEEN _fecha_inicio AND _fecha_fin
        AND t.estado IN ('completada', 'parcial')
    GROUP BY a.id, a.nombre
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_transferencias,
        COUNT(*) FILTER (WHERE t.estado = 'pendiente')::BIGINT AS pendientes,
        COUNT(*) FILTER (WHERE t.estado = 'en_transito')::BIGINT AS en_transito,
        COUNT(*) FILTER (WHERE t.estado = 'completada')::BIGINT AS completadas,
        COUNT(*) FILTER (WHERE t.estado = 'cancelada')::BIGINT AS canceladas,
        COUNT(*) FILTER (WHERE t.estado = 'parcial')::BIGINT AS parciales,
        COALESCE(SUM(
            (SELECT SUM(dt.cantidad_enviada) FROM detalle_transferencia dt WHERE dt.id_transferencia = t.id)
        ), 0) AS total_productos_transferidos,
        COALESCE(v_almacen_mas_envios, '{}'::JSONB),
        COALESCE(v_almacen_mas_recepciones, '{}'::JSONB)
    FROM transferencias t
    WHERE t.id_empresa = _id_empresa
        AND t.fecha_creacion BETWEEN _fecha_inicio AND _fecha_fin;
END;
$$;

-- =====================================================
-- 12. VISTA PARA TRANSFERENCIAS RECIENTES
-- =====================================================

CREATE OR REPLACE VIEW vista_transferencias_recientes AS
SELECT 
    t.id,
    t.codigo,
    ao.nombre AS almacen_origen,
    so.nombre AS sucursal_origen,
    ad.nombre AS almacen_destino,
    sd.nombre AS sucursal_destino,
    t.estado,
    t.fecha_creacion,
    t.fecha_envio,
    t.fecha_recepcion,
    t.id_empresa,
    COUNT(DISTINCT dt.id_producto) AS total_productos,
    CASE t.estado
        WHEN 'pendiente' THEN '#f59e0b'
        WHEN 'en_transito' THEN '#3b82f6'
        WHEN 'completada' THEN '#22c55e'
        WHEN 'cancelada' THEN '#ef4444'
        WHEN 'parcial' THEN '#8b5cf6'
        ELSE '#94a3b8'
    END AS color_estado
FROM transferencias t
INNER JOIN almacen ao ON t.id_almacen_origen = ao.id
INNER JOIN sucursales so ON ao.id_sucursal = so.id
INNER JOIN almacen ad ON t.id_almacen_destino = ad.id
INNER JOIN sucursales sd ON ad.id_sucursal = sd.id
LEFT JOIN detalle_transferencia dt ON t.id = dt.id_transferencia
GROUP BY t.id, ao.nombre, so.nombre, ad.nombre, sd.nombre
ORDER BY t.fecha_creacion DESC;

-- =====================================================
-- 13. HABILITAR RLS
-- =====================================================

ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_transferencia ENABLE ROW LEVEL SECURITY;

-- Políticas para transferencias
CREATE POLICY "Usuarios ven transferencias de su empresa" ON transferencias
    FOR SELECT
    USING (
        id_empresa IN (
            SELECT e.id FROM empresa e
            INNER JOIN usuarios u ON e.id_usuario = u.id
            WHERE u.id_auth = auth.uid()::text
        )
    );

CREATE POLICY "Sistema puede insertar transferencias" ON transferencias
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Sistema puede actualizar transferencias" ON transferencias
    FOR UPDATE
    USING (true);

-- Políticas para detalle
CREATE POLICY "Usuarios ven detalle de transferencias de su empresa" ON detalle_transferencia
    FOR SELECT
    USING (
        id_transferencia IN (
            SELECT t.id FROM transferencias t
            WHERE t.id_empresa IN (
                SELECT e.id FROM empresa e
                INNER JOIN usuarios u ON e.id_usuario = u.id
                WHERE u.id_auth = auth.uid()::text
            )
        )
    );

CREATE POLICY "Sistema puede insertar detalle" ON detalle_transferencia
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Sistema puede actualizar detalle" ON detalle_transferencia
    FOR UPDATE
    USING (true);

-- =====================================================
-- 14. PERMISOS
-- =====================================================

GRANT SELECT ON transferencias TO authenticated;
GRANT SELECT ON detalle_transferencia TO authenticated;
GRANT SELECT ON vista_transferencias_recientes TO authenticated;

-- =====================================================
-- 15. CONSTRAINT ÚNICO PARA STOCK (si no existe)
-- =====================================================

-- Primero verificar si existe el constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stock_almacen_producto_unique'
    ) THEN
        ALTER TABLE stock ADD CONSTRAINT stock_almacen_producto_unique 
        UNIQUE (id_almacen, id_producto);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END;
$$;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE transferencias IS 'Registro de transferencias de productos entre almacenes';
COMMENT ON TABLE detalle_transferencia IS 'Detalle de productos en cada transferencia';
COMMENT ON FUNCTION crear_transferencia IS 'Crea una nueva transferencia entre almacenes';
COMMENT ON FUNCTION enviar_transferencia IS 'Envía una transferencia pendiente y descuenta stock del origen';
COMMENT ON FUNCTION recibir_transferencia IS 'Recibe una transferencia y agrega stock al destino';
COMMENT ON FUNCTION cancelar_transferencia IS 'Cancela una transferencia y devuelve el stock si es necesario';
COMMENT ON FUNCTION consultar_transferencias IS 'Consulta transferencias con filtros';
