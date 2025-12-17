-- ============================================
-- MEJORAS FASE 1 - GAPS CRÍTICOS
-- Sistema POS - Inventario
-- ============================================

-- ============================================
-- 0. AGREGAR COLUMNA id_proveedor A movimientos_stock
-- ============================================

ALTER TABLE movimientos_stock 
ADD COLUMN IF NOT EXISTS id_proveedor BIGINT REFERENCES clientes_proveedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_proveedor 
ON movimientos_stock(id_proveedor);

COMMENT ON COLUMN movimientos_stock.id_proveedor IS 'ID del proveedor asociado al movimiento de ingreso';

-- ============================================
-- 1. TRANSACCIÓN ATÓMICA PARA MOVIMIENTOS DE STOCK
-- ============================================

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
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en transacción de movimiento de stock: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FUNCIÓN PARA CREAR O OBTENER STOCK
-- ============================================

CREATE OR REPLACE FUNCTION obtener_o_crear_stock(
  p_id_almacen INTEGER,
  p_id_producto INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_stock_id INTEGER;
BEGIN
  -- Intentar obtener stock existente
  SELECT id INTO v_stock_id
  FROM stock
  WHERE id_almacen = p_id_almacen 
    AND id_producto = p_id_producto;
  
  -- Si no existe, crear nuevo registro
  IF v_stock_id IS NULL THEN
    INSERT INTO stock (
      id_almacen,
      id_producto,
      stock,
      stock_minimo,
      ubicacion
    ) VALUES (
      p_id_almacen,
      p_id_producto,
      0,
      0,
      '-'
    )
    RETURNING id INTO v_stock_id;
  END IF;
  
  RETURN v_stock_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. VALIDACIÓN ANTES DE ELIMINAR CATEGORÍA
-- ============================================

CREATE OR REPLACE FUNCTION validar_eliminar_categoria(
  p_id_categoria INTEGER
) RETURNS TABLE(
  puede_eliminar BOOLEAN,
  mensaje TEXT,
  productos_asociados INTEGER
) AS $$
DECLARE
  v_count_productos INTEGER;
BEGIN
  -- Contar productos asociados
  SELECT COUNT(*) INTO v_count_productos
  FROM productos
  WHERE id_categoria = p_id_categoria;
  
  IF v_count_productos > 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Esta categoría tiene ' || v_count_productos || ' producto(s) asociado(s). Reasigne los productos antes de eliminar.',
      v_count_productos;
  ELSE
    RETURN QUERY SELECT 
      TRUE,
      'La categoría puede eliminarse de forma segura.',
      0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. VALIDACIÓN ANTES DE ELIMINAR PRODUCTO
-- ============================================

CREATE OR REPLACE FUNCTION validar_eliminar_producto(
  p_id_producto INTEGER
) RETURNS TABLE(
  puede_eliminar BOOLEAN,
  mensaje TEXT,
  ventas_asociadas INTEGER,
  tiene_stock BOOLEAN,
  stock_total NUMERIC
) AS $$
DECLARE
  v_count_ventas INTEGER;
  v_tiene_stock BOOLEAN;
  v_stock_total NUMERIC;
BEGIN
  -- Contar ventas asociadas
  SELECT COUNT(*) INTO v_count_ventas
  FROM detalle_venta
  WHERE id_producto = p_id_producto;
  
  -- Verificar si tiene stock
  SELECT 
    CASE WHEN SUM(stock) > 0 THEN TRUE ELSE FALSE END,
    COALESCE(SUM(stock), 0)
  INTO v_tiene_stock, v_stock_total
  FROM stock
  WHERE id_producto = p_id_producto;
  
  IF v_count_ventas > 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Este producto tiene ' || v_count_ventas || ' venta(s) registrada(s). Se recomienda desactivar en lugar de eliminar.',
      v_count_ventas,
      v_tiene_stock,
      v_stock_total;
  ELSIF v_tiene_stock THEN
    RETURN QUERY SELECT 
      FALSE,
      'Este producto tiene stock actual de ' || v_stock_total || ' unidades. Elimine el stock primero.',
      0,
      TRUE,
      v_stock_total;
  ELSE
    RETURN QUERY SELECT 
      TRUE,
      'El producto puede eliminarse de forma segura.',
      0,
      FALSE,
      0::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. SOFT DELETE - AGREGAR COLUMNAS DE ESTADO
-- ============================================

-- Agregar columnas de estado a productos (si no existen)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'productos' AND column_name = 'estado'
  ) THEN
    ALTER TABLE productos ADD COLUMN estado TEXT DEFAULT 'activo';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'productos' AND column_name = 'fecha_baja'
  ) THEN
    ALTER TABLE productos ADD COLUMN fecha_baja TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'productos' AND column_name = 'usuario_baja'
  ) THEN
    ALTER TABLE productos ADD COLUMN usuario_baja INTEGER REFERENCES usuarios(id);
  END IF;
END $$;

-- Agregar columnas de estado a categorías (si no existen)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'estado'
  ) THEN
    ALTER TABLE categorias ADD COLUMN estado TEXT DEFAULT 'activo';
  END IF;
END $$;

-- ============================================
-- 6. FUNCIÓN PARA DESACTIVAR PRODUCTO (SOFT DELETE)
-- ============================================

CREATE OR REPLACE FUNCTION desactivar_producto(
  p_id_producto INTEGER,
  p_id_usuario INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE productos SET
    estado = 'inactivo',
    fecha_baja = NOW(),
    usuario_baja = p_id_usuario
  WHERE id = p_id_producto;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNCIÓN PARA RESTAURAR PRODUCTO
-- ============================================

CREATE OR REPLACE FUNCTION restaurar_producto(
  p_id_producto INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE productos SET
    estado = 'activo',
    fecha_baja = NULL,
    usuario_baja = NULL
  WHERE id = p_id_producto;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. ACTUALIZAR FUNCIÓN mostrarproductos PARA FILTRAR ACTIVOS
-- ============================================

-- Primero eliminar la función existente (necesario si cambia el tipo de retorno)
DROP FUNCTION IF EXISTS mostrarproductos(integer);

CREATE OR REPLACE FUNCTION mostrarproductos(_id_empresa integer) 
RETURNS TABLE(
  id integer, 
  nombre text, 
  precio_venta numeric, 
  precio_compra numeric, 
  id_categoria integer, 
  sevende_por text, 
  codigo_barras text, 
  codigo_interno text, 
  id_empresa integer, 
  maneja_inventarios boolean, 
  maneja_multiprecios boolean, 
  p_venta text, 
  p_compra text, 
  categoria text,
  estado text
) AS $$
  SELECT 
    p.id,
    p.nombre,
    ROUND(p.precio_venta, 2) AS precio_venta,
    ROUND(p.precio_compra, 2) AS precio_compra,
    p.id_categoria,
    p.sevende_por,
    p.codigo_barras,
    p.codigo_interno,
    p.id_empresa,
    p.maneja_inventarios,
    p.maneja_multiprecios,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_venta, 2)) AS p_venta,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_compra, 2)) AS p_compra,
    c.nombre AS categoria,
    COALESCE(p.estado, 'activo') AS estado
  FROM productos p
  INNER JOIN empresa e ON e.id = p.id_empresa
  INNER JOIN categorias c ON c.id = p.id_categoria
  WHERE p.id_empresa = _id_empresa
    AND COALESCE(p.estado, 'activo') = 'activo';  -- Solo productos activos
$$ LANGUAGE SQL;

-- ============================================
-- 9. FUNCIÓN PARA LISTAR PRODUCTOS INACTIVOS
-- ============================================

-- Eliminar función existente si tiene diferente firma
DROP FUNCTION IF EXISTS mostrar_productos_inactivos(integer);

CREATE OR REPLACE FUNCTION mostrar_productos_inactivos(_id_empresa integer) 
RETURNS TABLE(
  id integer, 
  nombre text,
  codigobarras text,
  precio_venta numeric, 
  precio_compra numeric,
  p_venta text,
  p_compra text,
  categoria text,
  fecha_baja timestamp,
  usuario_baja_nombre text
) AS $$
  SELECT 
    p.id,
    p.nombre,
    p.codigo_barras AS codigobarras,
    ROUND(p.precio_venta, 2) AS precio_venta,
    ROUND(p.precio_compra, 2) AS precio_compra,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_venta, 2)) AS p_venta,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_compra, 2)) AS p_compra,
    c.nombre AS categoria,
    p.fecha_baja,
    u.nombres AS usuario_baja_nombre
  FROM productos p
  INNER JOIN empresa e ON e.id = p.id_empresa
  INNER JOIN categorias c ON c.id = p.id_categoria
  LEFT JOIN usuarios u ON u.id = p.usuario_baja
  WHERE p.id_empresa = _id_empresa
    AND p.estado = 'inactivo'
  ORDER BY p.fecha_baja DESC;
$$ LANGUAGE SQL;

-- ============================================
-- 10. ACTUALIZAR FUNCIÓN buscarproductos PARA FILTRAR ACTIVOS
-- ============================================

DROP FUNCTION IF EXISTS buscarproductos(integer, text);

CREATE OR REPLACE FUNCTION buscarproductos(_id_empresa integer, buscador text) 
RETURNS TABLE(
  id integer, 
  nombre text, 
  precio_venta numeric, 
  precio_compra numeric, 
  id_categoria integer, 
  sevende_por text, 
  codigo_barras text, 
  codigo_interno text, 
  id_empresa integer, 
  maneja_inventarios boolean, 
  maneja_multiprecios boolean, 
  p_venta text, 
  p_compra text, 
  categoria text
) AS $$
  SELECT 
    p.id,
    p.nombre,
    ROUND(p.precio_venta, 2) AS precio_venta,
    ROUND(p.precio_compra, 2) AS precio_compra,
    p.id_categoria,
    p.sevende_por,
    p.codigo_barras,
    p.codigo_interno,
    p.id_empresa,
    p.maneja_inventarios,
    p.maneja_multiprecios,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_venta, 2)) AS p_venta,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_compra, 2)) AS p_compra,
    c.nombre AS categoria
  FROM productos p 
  INNER JOIN empresa e ON e.id = p.id_empresa
  INNER JOIN categorias c ON c.id = p.id_categoria
  WHERE (LOWER(p.nombre) LIKE '%' || LOWER(buscador) || '%' 
    OR LOWER(p.codigo_barras) LIKE '%' || LOWER(buscador) || '%'
    OR LOWER(p.codigo_interno) LIKE '%' || LOWER(buscador) || '%')
    AND p.id_empresa = _id_empresa
    AND COALESCE(p.estado, 'activo') = 'activo'  -- Solo productos activos
  ORDER BY p.nombre ASC
  LIMIT 10;
$$ LANGUAGE SQL;

-- ============================================
-- 11. ACTUALIZAR FUNCIÓN buscarproductoslectora PARA FILTRAR ACTIVOS
-- ============================================

DROP FUNCTION IF EXISTS buscarproductoslectora(integer, text);

CREATE OR REPLACE FUNCTION buscarproductoslectora(_id_empresa integer, buscador text) 
RETURNS TABLE(
  id integer, 
  nombre text, 
  precio_venta numeric, 
  precio_compra numeric, 
  id_categoria integer, 
  sevende_por text, 
  codigo_barras text, 
  codigo_interno text, 
  id_empresa integer, 
  maneja_inventarios boolean, 
  maneja_multiprecios boolean, 
  p_venta text, 
  p_compra text, 
  categoria text
) AS $$
  SELECT 
    p.id,
    p.nombre,
    ROUND(p.precio_venta, 2) AS precio_venta,
    ROUND(p.precio_compra, 2) AS precio_compra,
    p.id_categoria,
    p.sevende_por,
    p.codigo_barras,
    p.codigo_interno,
    p.id_empresa,
    p.maneja_inventarios,
    p.maneja_multiprecios,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_venta, 2)) AS p_venta,
    CONCAT(e.simbolo_moneda, ' ', ROUND(p.precio_compra, 2)) AS p_compra,
    c.nombre AS categoria
  FROM productos p 
  INNER JOIN empresa e ON e.id = p.id_empresa
  INNER JOIN categorias c ON c.id = p.id_categoria
  WHERE (LOWER(p.codigo_barras) = LOWER(buscador)
    OR LOWER(p.codigo_interno) = LOWER(buscador))
    AND p.id_empresa = _id_empresa
    AND COALESCE(p.estado, 'activo') = 'activo'  -- Solo productos activos
  LIMIT 1;
$$ LANGUAGE SQL;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN - FASE 1
-- ============================================

COMMENT ON FUNCTION registrar_movimiento_atomico IS 
'Registra un movimiento de stock de forma atómica: inserta movimiento, actualiza stock y precios en una sola transacción';

COMMENT ON FUNCTION obtener_o_crear_stock IS 
'Obtiene el ID de stock existente o crea uno nuevo si no existe';

COMMENT ON FUNCTION validar_eliminar_categoria IS 
'Valida si una categoría puede eliminarse verificando productos asociados';

COMMENT ON FUNCTION validar_eliminar_producto IS 
'Valida si un producto puede eliminarse verificando ventas y stock';

COMMENT ON FUNCTION desactivar_producto IS 
'Desactiva un producto (soft delete) en lugar de eliminarlo físicamente';

COMMENT ON FUNCTION restaurar_producto IS 
'Restaura un producto previamente desactivado';

COMMENT ON FUNCTION buscarproductos IS 
'Busca productos activos por nombre, código de barras o código interno';

COMMENT ON FUNCTION buscarproductoslectora IS 
'Busca productos activos por código exacto (para lectora de código de barras)';

-- ============================================
-- FIN DEL SCRIPT - FASE 1
-- ============================================

