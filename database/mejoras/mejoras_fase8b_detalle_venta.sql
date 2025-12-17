-- =====================================================
-- FASE 7B: MEJORAS AL DETALLE DE VENTA
-- Descripción: Agregar campos para variantes y seriales
-- Fecha: Diciembre 2025
-- IMPORTANTE: Ejecutar mejoras_fase7_fix_columnas.sql PRIMERO
-- =====================================================

-- =====================================================
-- PARTE 1: AGREGAR COLUMNAS A DETALLE_VENTA
-- =====================================================

-- Agregar columna para variante (si el producto tiene variantes)
ALTER TABLE detalle_venta 
ADD COLUMN IF NOT EXISTS id_variante BIGINT;

-- Agregar columna para serial (si el producto maneja seriales)
ALTER TABLE detalle_venta 
ADD COLUMN IF NOT EXISTS id_serial BIGINT;

-- Agregar columna para indicar si se aplicó multiprecio
ALTER TABLE detalle_venta 
ADD COLUMN IF NOT EXISTS multiprecio_aplicado BOOLEAN DEFAULT false;

-- Agregar columna para guardar el nombre del nivel de multiprecio
ALTER TABLE detalle_venta 
ADD COLUMN IF NOT EXISTS nivel_multiprecio TEXT;

-- Agregar columna para el descuento aplicado por multiprecio
ALTER TABLE detalle_venta 
ADD COLUMN IF NOT EXISTS descuento_multiprecio NUMERIC(5,2) DEFAULT 0;

-- Comentarios explicativos
COMMENT ON COLUMN detalle_venta.id_variante IS 'ID de la variante vendida (si aplica)';
COMMENT ON COLUMN detalle_venta.id_serial IS 'ID del serial específico vendido (si aplica)';
COMMENT ON COLUMN detalle_venta.multiprecio_aplicado IS 'Indica si se aplicó precio por volumen';
COMMENT ON COLUMN detalle_venta.nivel_multiprecio IS 'Nombre del nivel de multiprecio aplicado';
COMMENT ON COLUMN detalle_venta.descuento_multiprecio IS 'Porcentaje de descuento por multiprecio';

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_detalle_venta_variante ON detalle_venta(id_variante) WHERE id_variante IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_detalle_venta_serial ON detalle_venta(id_serial) WHERE id_serial IS NOT NULL;

-- =====================================================
-- PARTE 2: ACTUALIZAR RPC DE INSERCIÓN DE DETALLE_VENTA
-- =====================================================

-- Función mejorada para insertar detalle de venta con soporte para variantes y seriales
CREATE OR REPLACE FUNCTION insertar_detalle_venta_v2(
    _id_venta BIGINT,
    _cantidad NUMERIC,
    _precio_venta NUMERIC,
    _descripcion TEXT,
    _id_producto BIGINT,
    _precio_compra NUMERIC,
    _id_sucursal BIGINT,
    _id_almacen BIGINT,
    _id_variante BIGINT DEFAULT NULL,
    _id_serial BIGINT DEFAULT NULL,
    _multiprecio_aplicado BOOLEAN DEFAULT false,
    _nivel_multiprecio TEXT DEFAULT NULL,
    _descuento_multiprecio NUMERIC DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    id_venta BIGINT,
    cantidad NUMERIC,
    precio_venta NUMERIC,
    descripcion TEXT,
    id_producto BIGINT,
    total NUMERIC
) AS $$
DECLARE
    v_detalle RECORD;
    v_producto RECORD;
BEGIN
    -- Validar que la venta existe
    IF NOT EXISTS (SELECT 1 FROM ventas WHERE ventas.id = _id_venta) THEN
        RAISE EXCEPTION 'La venta con ID % no existe', _id_venta
            USING ERRCODE = 'VENTA_NO_EXISTE';
    END IF;

    -- Obtener información del producto
    SELECT * INTO v_producto FROM productos WHERE productos.id = _id_producto;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto con ID % no existe', _id_producto;
    END IF;

    -- Validar variante si el producto la requiere (usa tiene_variantes)
    IF v_producto.tiene_variantes = true AND _id_variante IS NULL THEN
        RAISE EXCEPTION 'El producto % requiere seleccionar una variante', v_producto.nombre;
    END IF;

    -- Validar serial si el producto lo requiere
    IF v_producto.maneja_seriales = true AND _id_serial IS NULL THEN
        RAISE EXCEPTION 'El producto % requiere seleccionar un número de serie', v_producto.nombre;
    END IF;

    -- Validar que el serial esté disponible
    IF _id_serial IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM producto_seriales ps 
            WHERE ps.id = _id_serial 
              AND ps.estado = 'disponible'
              AND ps.id_almacen = _id_almacen
        ) THEN
            RAISE EXCEPTION 'El serial seleccionado no está disponible';
        END IF;
    END IF;

    -- Insertar el detalle
    INSERT INTO detalle_venta (
        id_venta,
        cantidad,
        precio_venta,
        descripcion,
        id_producto,
        precio_compra,
        id_variante,
        id_serial,
        multiprecio_aplicado,
        nivel_multiprecio,
        descuento_multiprecio,
        total
    ) VALUES (
        _id_venta,
        _cantidad,
        _precio_venta,
        _descripcion,
        _id_producto,
        _precio_compra,
        _id_variante,
        _id_serial,
        _multiprecio_aplicado,
        _nivel_multiprecio,
        _descuento_multiprecio,
        _cantidad * _precio_venta
    )
    RETURNING * INTO v_detalle;

    -- Marcar serial como vendido si aplica
    IF _id_serial IS NOT NULL THEN
        UPDATE producto_seriales
        SET estado = 'vendido',
            id_venta = _id_venta,
            fecha_venta = NOW()
        WHERE producto_seriales.id = _id_serial;
    END IF;

    -- Descontar stock
    UPDATE stock
    SET cantidad = cantidad - _cantidad
    WHERE stock.id_producto = _id_producto
      AND stock.id_almacen = _id_almacen;

    -- Si el producto es compuesto (kit), también descontar stock de componentes
    IF v_producto.es_compuesto = true THEN
        UPDATE stock s
        SET cantidad = s.cantidad - (pc.cantidad * _cantidad)
        FROM productos_compuestos pc
        WHERE pc.id_producto_padre = _id_producto
          AND s.id_producto = pc.id_producto_componente
          AND s.id_almacen = _id_almacen;
    END IF;

    RETURN QUERY SELECT 
        v_detalle.id,
        v_detalle.id_venta,
        v_detalle.cantidad,
        v_detalle.precio_venta,
        v_detalle.descripcion,
        v_detalle.id_producto,
        v_detalle.total;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 3: VISTA PARA DETALLE DE VENTA ENRIQUECIDO
-- =====================================================

CREATE OR REPLACE VIEW vista_detalle_venta_completo AS
SELECT 
    dv.id,
    dv.id_venta,
    dv.cantidad,
    dv.precio_venta,
    dv.descripcion,
    dv.id_producto,
    dv.total,
    dv.id_variante,
    dv.id_serial,
    dv.multiprecio_aplicado,
    dv.nivel_multiprecio,
    dv.descuento_multiprecio,
    -- Producto info
    p.nombre as producto_nombre,
    p.codigo_barras,
    p.tiene_variantes,
    p.maneja_seriales,
    p.maneja_multiprecios,
    p.es_compuesto,
    -- Variante info (producto_variantes solo tiene id_atributo e id_valor, no sku/precio)
    av.valor as variante_valor,
    a.nombre as variante_atributo,
    -- Serial info
    ps.numero_serie,
    -- Venta info
    v.fecha as fecha_venta,
    v.estado as estado_venta
FROM detalle_venta dv
LEFT JOIN productos p ON p.id = dv.id_producto
LEFT JOIN producto_variantes pv ON pv.id = dv.id_variante
LEFT JOIN atributo_valores av ON av.id = pv.id_valor
LEFT JOIN atributos a ON a.id = pv.id_atributo
LEFT JOIN producto_seriales ps ON ps.id = dv.id_serial
LEFT JOIN ventas v ON v.id = dv.id_venta;

COMMENT ON VIEW vista_detalle_venta_completo IS 'Vista enriquecida del detalle de venta con información de variantes, seriales y multiprecios';

-- =====================================================
-- PARTE 4: FUNCIÓN PARA REPORTES DE VENTAS POR VARIANTE
-- =====================================================

CREATE OR REPLACE FUNCTION reporte_ventas_por_variante(
    _id_empresa BIGINT,
    _fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    _fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id_producto BIGINT,
    producto_nombre TEXT,
    id_variante BIGINT,
    variante_descripcion TEXT,
    cantidad_vendida NUMERIC,
    total_ventas NUMERIC,
    cantidad_transacciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dv.id_producto,
        p.nombre as producto_nombre,
        dv.id_variante,
        COALESCE(a.nombre || ': ' || av.valor, 'Sin variante') as variante_descripcion,
        SUM(dv.cantidad) as cantidad_vendida,
        SUM(dv.total) as total_ventas,
        COUNT(DISTINCT dv.id_venta) as cantidad_transacciones
    FROM detalle_venta dv
    INNER JOIN productos p ON p.id = dv.id_producto
    LEFT JOIN producto_variantes pv ON pv.id = dv.id_variante
    LEFT JOIN atributo_valores av ON av.id = pv.id_valor
    LEFT JOIN atributos a ON a.id = pv.id_atributo
    INNER JOIN ventas v ON v.id = dv.id_venta
    WHERE p.id_empresa = _id_empresa
      AND v.fecha::DATE BETWEEN _fecha_inicio AND _fecha_fin
      AND v.estado = 'completado'
    GROUP BY dv.id_producto, p.nombre, dv.id_variante, a.nombre, av.valor
    ORDER BY total_ventas DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 5: FUNCIÓN PARA REPORTES DE SERIALES VENDIDOS
-- =====================================================

CREATE OR REPLACE FUNCTION reporte_seriales_vendidos(
    _id_empresa BIGINT,
    _fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    _fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    numero_serie TEXT,
    producto_nombre TEXT,
    fecha_venta TIMESTAMPTZ,
    precio_venta NUMERIC,
    id_venta BIGINT,
    sucursal_nombre TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.numero_serie,
        p.nombre as producto_nombre,
        ps.fecha_venta,
        dv.precio_venta,
        ps.id_venta,
        s.nombre as sucursal_nombre
    FROM producto_seriales ps
    INNER JOIN productos p ON p.id = ps.id_producto
    INNER JOIN ventas v ON v.id = ps.id_venta
    INNER JOIN detalle_venta dv ON dv.id_serial = ps.id
    INNER JOIN sucursales s ON s.id = v.id_sucursal
    WHERE p.id_empresa = _id_empresa
      AND ps.estado = 'vendido'
      AND ps.fecha_venta::DATE BETWEEN _fecha_inicio AND _fecha_fin
    ORDER BY ps.fecha_venta DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 6: TRIGGER PARA VALIDAR STOCK ANTES DE VENTA
-- =====================================================

CREATE OR REPLACE FUNCTION validar_stock_antes_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual NUMERIC;
    v_producto RECORD;
    v_componente RECORD;
BEGIN
    -- Obtener información del producto
    SELECT * INTO v_producto FROM productos WHERE id = NEW.id_producto;
    
    -- Obtener stock actual
    SELECT cantidad INTO v_stock_actual
    FROM stock
    WHERE id_producto = NEW.id_producto
      AND id_almacen = (
          SELECT dv.id_almacen FROM detalle_venta dv WHERE dv.id = NEW.id LIMIT 1
      );
    
    -- Validar stock suficiente
    IF COALESCE(v_stock_actual, 0) < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %. Disponible: %, Solicitado: %',
            v_producto.nombre, COALESCE(v_stock_actual, 0), NEW.cantidad;
    END IF;
    
    -- Si es producto compuesto, validar componentes
    IF v_producto.es_compuesto = true THEN
        FOR v_componente IN 
            SELECT pc.*, p.nombre as nombre_componente, s.cantidad as stock_actual
            FROM productos_compuestos pc
            INNER JOIN productos p ON p.id = pc.id_producto_componente
            LEFT JOIN stock s ON s.id_producto = pc.id_producto_componente
            WHERE pc.id_producto_padre = NEW.id_producto
        LOOP
            IF COALESCE(v_componente.stock_actual, 0) < (v_componente.cantidad * NEW.cantidad) THEN
                RAISE EXCEPTION 'Stock insuficiente del componente %. Disponible: %, Necesario: %',
                    v_componente.nombre_componente,
                    COALESCE(v_componente.stock_actual, 0),
                    v_componente.cantidad * NEW.cantidad;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger (opcional, descomentar si se desea validación automática)
-- DROP TRIGGER IF EXISTS trigger_validar_stock_venta ON detalle_venta;
-- CREATE TRIGGER trigger_validar_stock_venta
--     BEFORE INSERT ON detalle_venta
--     FOR EACH ROW
--     EXECUTE FUNCTION validar_stock_antes_venta();

-- =====================================================
-- PARTE 7: CORREGIR TRIGGER validarstock
-- Problema: Al insertar venta registra 'ingreso' cuando debería ser 'egreso'
-- =====================================================

CREATE OR REPLACE FUNCTION validarstock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    stock_actual numeric;
BEGIN
    -- Verificar si el producto maneja inventarios
    IF (SELECT p.maneja_inventarios FROM productos p WHERE p.id = NEW.id_producto) THEN
        -- Obtener el stock actual
        SELECT s.stock 
        INTO stock_actual
        FROM stock s 
        WHERE s.id_producto = NEW.id_producto 
          AND s.id_almacen = NEW.id_almacen;

        -- Incremento en cantidad (UPDATE: usuario aumenta cantidad en carrito)
        IF TG_OP = 'UPDATE' AND NEW.cantidad > OLD.cantidad THEN
            -- Verificar si hay suficiente stock disponible para incrementar
            IF stock_actual < (NEW.cantidad - OLD.cantidad) THEN
                RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.descripcion;
            ELSE
                -- Descontar solo el incremento de cantidad
                UPDATE stock 
                SET stock = stock - (NEW.cantidad - OLD.cantidad)
                WHERE id_producto = NEW.id_producto 
                  AND id_almacen = NEW.id_almacen;
                  
                -- Registrar movimiento como EGRESO (salida por venta)
                INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
                VALUES (NEW.id_almacen, NEW.id_producto, 'egreso', (NEW.cantidad - OLD.cantidad), NOW(), 'Ajuste de cantidad en venta', 'ventas');
            END IF;
        END IF;

        -- Decremento en cantidad (UPDATE: usuario reduce cantidad en carrito)
        IF TG_OP = 'UPDATE' AND NEW.cantidad < OLD.cantidad THEN
            -- Aumentar el stock con la cantidad reducida (devolver stock)
            UPDATE stock 
            SET stock = stock + (OLD.cantidad - NEW.cantidad)
            WHERE id_producto = NEW.id_producto 
              AND id_almacen = NEW.id_almacen;
              
            -- Registrar movimiento como INGRESO (devolución por ajuste)
            INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
            VALUES (NEW.id_almacen, NEW.id_producto, 'ingreso', (OLD.cantidad - NEW.cantidad), NOW(), 'Devolución por ajuste en venta', 'ventas');
        END IF;

        -- Inserción de nueva cantidad (INSERT: agregar producto al carrito)
        IF TG_OP = 'INSERT' THEN
            -- Verificar si hay suficiente stock para la cantidad solicitada
            IF COALESCE(stock_actual, 0) < NEW.cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.descripcion;
            ELSE
                -- Descontar el stock directamente
                UPDATE stock 
                SET stock = stock - NEW.cantidad
                WHERE id_producto = NEW.id_producto 
                  AND id_almacen = NEW.id_almacen;
                  
                -- Registrar movimiento como EGRESO (salida por venta)
                INSERT INTO movimientos_stock (id_almacen, id_producto, tipo_movimiento, cantidad, fecha, detalle, origen)
                VALUES (NEW.id_almacen, NEW.id_producto, 'egreso', NEW.cantidad, NOW(), 'Venta de producto', 'ventas');
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validarstock IS 'Trigger que valida y actualiza stock al insertar/modificar detalle de venta. Registra movimientos de tipo egreso para ventas e ingreso para devoluciones.';

-- =====================================================
-- MENSAJE DE FINALIZACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FASE 7B COMPLETADA EXITOSAMENTE';
    RAISE NOTICE 'Cambios aplicados a detalle_venta:';
    RAISE NOTICE '- Columna id_variante agregada';
    RAISE NOTICE '- Columna id_serial agregada';
    RAISE NOTICE '- Columnas de multiprecio agregadas';
    RAISE NOTICE '- Función insertar_detalle_venta_v2 creada';
    RAISE NOTICE '- Vista vista_detalle_venta_completo creada';
    RAISE NOTICE '- Funciones de reportes creadas';
    RAISE NOTICE '- Trigger validarstock CORREGIDO (egreso en ventas)';
    RAISE NOTICE '========================================';
END $$;

