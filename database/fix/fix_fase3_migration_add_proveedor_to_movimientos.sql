-- =====================================================
-- MIGRACIÓN: Agregar campo id_proveedor a movimientos_stock
-- Fecha: 30/11/2025
-- Descripción: Permite asociar un proveedor a los ingresos de inventario
-- =====================================================

-- 1. Agregar columna id_proveedor a la tabla movimientos_stock
-- NOTA: clientes_proveedores.id es de tipo BIGINT, no UUID
    ALTER TABLE movimientos_stock 
    ADD COLUMN IF NOT EXISTS id_proveedor BIGINT REFERENCES clientes_proveedores(id) ON DELETE SET NULL;

    -- 2. Crear índice para mejorar consultas por proveedor
    CREATE INDEX IF NOT EXISTS idx_movimientos_stock_proveedor 
    ON movimientos_stock(id_proveedor);

    -- 3. Comentario descriptivo
    COMMENT ON COLUMN movimientos_stock.id_proveedor IS 'ID del proveedor asociado al movimiento de ingreso';

-- =====================================================
-- 4. ACTUALIZAR FUNCIÓN ATÓMICA para incluir id_proveedor
-- =====================================================
CREATE OR REPLACE FUNCTION registrar_movimiento_atomico(
  p_movimiento JSONB,
  p_tipo TEXT,
  p_id_stock INTEGER,
  p_cantidad NUMERIC,
  p_precio_compra NUMERIC,
  p_precio_venta NUMERIC,
  p_id_producto INTEGER
) RETURNS VOID AS $$
DECLARE
  v_precio_compra_actual NUMERIC;
  v_precio_venta_actual NUMERIC;
  v_id_stock INTEGER;
  v_id_almacen INTEGER;
  v_id_proveedor BIGINT;
BEGIN
  -- Obtener id_almacen del movimiento
  v_id_almacen := (p_movimiento->>'id_almacen')::INTEGER;
  
  -- Obtener id_proveedor del movimiento (puede ser NULL)
  v_id_proveedor := (p_movimiento->>'id_proveedor')::BIGINT;
  
  -- PASO 1: Insertar movimiento de stock CON id_proveedor
  INSERT INTO movimientos_stock (
    id_almacen,
    id_producto,
    tipo_movimiento,
    cantidad,
    fecha,
    detalle,
    origen,
    id_proveedor
  ) VALUES (
    v_id_almacen,
    (p_movimiento->>'id_producto')::INTEGER,
    (p_movimiento->>'tipo_movimiento')::TEXT,
    (p_movimiento->>'cantidad')::NUMERIC,
    (p_movimiento->>'fecha')::TIMESTAMP,
    (p_movimiento->>'detalle')::TEXT,
    (p_movimiento->>'origen')::TEXT,
    v_id_proveedor
  );
  
  -- PASO 2: Obtener o crear stock si no existe
  IF p_id_stock IS NULL THEN
    -- Buscar si existe stock para este producto/almacén
    SELECT id INTO v_id_stock
    FROM stock
    WHERE id_almacen = v_id_almacen 
      AND id_producto = p_id_producto;
    
    -- Si no existe, crear nuevo registro
    IF v_id_stock IS NULL THEN
      INSERT INTO stock (id_almacen, id_producto, stock, stock_minimo, ubicacion)
      VALUES (v_id_almacen, p_id_producto, 0, 0, '-')
      RETURNING id INTO v_id_stock;
    END IF;
  ELSE
    v_id_stock := p_id_stock;
  END IF;
  
  -- PASO 3: Actualizar stock según tipo de movimiento
  IF p_tipo = 'ingreso' THEN
    PERFORM incrementarstock(v_id_stock, p_cantidad);
  ELSE
    PERFORM reducirstock(v_id_stock, p_cantidad);
  END IF;
  
  -- PASO 4: Actualizar precios del producto
  SELECT precio_compra, precio_venta 
  INTO v_precio_compra_actual, v_precio_venta_actual
  FROM productos 
  WHERE id = p_id_producto;
  
  -- Calcular promedio y actualizar
  UPDATE productos SET
    precio_compra = (COALESCE(v_precio_compra_actual, 0) + p_precio_compra) / 2,
    precio_venta = (COALESCE(v_precio_venta_actual, 0) + p_precio_venta) / 2
  WHERE id = p_id_producto;
  
END;
$$ LANGUAGE plpgsql;
