-- ============================================
-- MEJORAS FASE 2 - OPERACIONES ATÓMICAS
-- Sistema POS - Ventas, Caja y Comprobantes
-- ============================================
-- 
-- Este archivo contiene:
-- 1. Validación de Stock en Ventas
-- 2. Cierre de Caja Atómico
-- 3. Serialización de Comprobantes Segura
-- 4. Mejora de confirmar_venta con descuento de stock
--
-- IMPORTANTE: Ejecutar DESPUÉS de mejoras_fase1.sql
-- ============================================

-- ============================================
-- 1. VALIDACIÓN DE STOCK EN VENTAS
-- ============================================

-- Función mejorada que valida stock antes de insertar detalle de venta
-- Eliminar TODAS las versiones posibles de la función
DROP FUNCTION IF EXISTS insertardetalleventa_con_validacion(INTEGER, NUMERIC, NUMERIC, INTEGER, NUMERIC, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS insertardetalleventa_con_validacion(p_id_venta INTEGER, p_cantidad NUMERIC, p_precio_unitario NUMERIC, p_id_producto INTEGER, p_precio_total NUMERIC, p_descripcion TEXT, p_id_empresa INTEGER, p_id_metodo_pago INTEGER);

CREATE OR REPLACE FUNCTION insertardetalleventa_con_validacion(
  _id_venta INTEGER, 
  _cantidad NUMERIC, 
  _precio_venta NUMERIC, 
  _id_producto INTEGER, 
  _precio_compra NUMERIC, 
  _descripcion TEXT, 
  _id_sucursal INTEGER, 
  _id_almacen INTEGER
) RETURNS VOID AS $$
DECLARE
  v_stock_actual NUMERIC;
  v_stock_id INTEGER;
  v_cantidad_en_carrito NUMERIC;
  v_stock_disponible NUMERIC;
  v_nombre_producto TEXT;
  v_venta_existe BOOLEAN;
BEGIN
  -- 1. VALIDAR QUE LA VENTA EXISTE
  SELECT EXISTS(SELECT 1 FROM ventas WHERE id = _id_venta) INTO v_venta_existe;
  
  IF NOT v_venta_existe THEN
    RAISE EXCEPTION 'VENTA_ERROR: La venta con ID % no existe. Por favor inicie una nueva venta.', _id_venta;
  END IF;

  -- Obtener nombre del producto para mensajes de error
  SELECT nombre INTO v_nombre_producto
  FROM productos 
  WHERE id = _id_producto;
  
  IF v_nombre_producto IS NULL THEN
    RAISE EXCEPTION 'PRODUCTO_ERROR: El producto con ID % no existe.', _id_producto;
  END IF;

  -- Obtener stock actual del almacén específico
  SELECT id, stock INTO v_stock_id, v_stock_actual
  FROM stock
  WHERE id_almacen = _id_almacen 
    AND id_producto = _id_producto;
  
  -- Si no existe registro de stock, error
  IF v_stock_id IS NULL THEN
    RAISE EXCEPTION 'STOCK_ERROR: El producto "%" no tiene stock registrado en este almacén', v_nombre_producto;
  END IF;
  
  -- Verificar cantidad ya en el carrito para este producto/almacén
  SELECT COALESCE(SUM(cantidad), 0) INTO v_cantidad_en_carrito
  FROM detalle_venta
  WHERE id_venta = _id_venta
    AND id_producto = _id_producto
    AND id_almacen = _id_almacen;
  
  -- Calcular stock disponible (stock actual - lo que ya está en carrito)
  v_stock_disponible := v_stock_actual - v_cantidad_en_carrito;
  
  -- Validar si hay suficiente stock
  IF v_stock_disponible < _cantidad THEN
    RAISE EXCEPTION 'STOCK_ERROR: Stock insuficiente para "%". Disponible: %, Solicitado: %', 
      v_nombre_producto, v_stock_disponible, _cantidad;
  END IF;
  
  -- Si pasa la validación, proceder con la lógica original
  IF EXISTS (
    SELECT 1
    FROM detalle_venta
    WHERE id_venta = _id_venta
      AND id_producto = _id_producto
      AND id_almacen = _id_almacen
  ) THEN
    -- Si existe, actualizar la cantidad y el total
    UPDATE detalle_venta
    SET cantidad = cantidad + _cantidad,
        total = (cantidad + _cantidad) * _precio_venta
    WHERE id_venta = _id_venta
      AND id_producto = _id_producto
      AND id_almacen = _id_almacen;
  ELSE
    -- Si no existe, insertar un nuevo registro
    INSERT INTO detalle_venta (
      id_venta, id_producto, cantidad, precio_venta, 
      precio_compra, descripcion, total, id_sucursal, id_almacen
    ) VALUES (
      _id_venta, _id_producto, _cantidad, _precio_venta, 
      _precio_compra, _descripcion, _cantidad * _precio_venta, _id_sucursal, _id_almacen
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar para verificar stock disponible (útil para el frontend)
CREATE OR REPLACE FUNCTION verificar_stock_disponible(
  _id_producto INTEGER,
  _id_almacen INTEGER,
  _id_venta INTEGER DEFAULT NULL
) RETURNS TABLE(
  stock_actual NUMERIC,
  cantidad_en_carrito NUMERIC,
  stock_disponible NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.stock, 0) AS stock_actual,
    COALESCE((
      SELECT SUM(dv.cantidad) 
      FROM detalle_venta dv 
      WHERE dv.id_producto = _id_producto 
        AND dv.id_almacen = _id_almacen
        AND (_id_venta IS NULL OR dv.id_venta = _id_venta)
    ), 0) AS cantidad_en_carrito,
    COALESCE(s.stock, 0) - COALESCE((
      SELECT SUM(dv.cantidad) 
      FROM detalle_venta dv 
      WHERE dv.id_producto = _id_producto 
        AND dv.id_almacen = _id_almacen
        AND (_id_venta IS NULL OR dv.id_venta = _id_venta)
    ), 0) AS stock_disponible
  FROM stock s
  WHERE s.id_producto = _id_producto 
    AND s.id_almacen = _id_almacen;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. CIERRE DE CAJA ATÓMICO
-- ============================================

-- Función para cerrar caja de forma atómica con todas las validaciones
-- Eliminar TODAS las versiones posibles de la función
DROP FUNCTION IF EXISTS cerrar_caja_atomico(INTEGER, INTEGER, NUMERIC, TIMESTAMP);
DROP FUNCTION IF EXISTS cerrar_caja_atomico(p_id_cierre INTEGER, p_id_usuario INTEGER, p_total_efectivo_real NUMERIC, p_fecha_cierre TIMESTAMP);

CREATE OR REPLACE FUNCTION cerrar_caja_atomico(
  _id_cierre_caja INTEGER,
  _id_usuario INTEGER,
  _total_efectivo_real NUMERIC,
  _fecha_cierre TIMESTAMP DEFAULT NOW()
) RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  id_cierre INTEGER,
  total_calculado NUMERIC,
  total_real NUMERIC,
  diferencia NUMERIC,
  ventas_pendientes INTEGER
) AS $$
DECLARE
  v_estado_actual INTEGER;
  v_total_efectivo_calculado NUMERIC;
  v_ventas_pendientes INTEGER;
  v_id_caja INTEGER;
  v_monto_apertura NUMERIC;
BEGIN
  -- 1. Verificar que el cierre de caja existe y está abierto (estado = 0)
  SELECT estado, id_caja INTO v_estado_actual, v_id_caja
  FROM cierrecaja
  WHERE id = _id_cierre_caja
  FOR UPDATE; -- Bloquear registro para evitar cierres concurrentes
  
  IF v_estado_actual IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'CIERRE_ERROR: No se encontró el cierre de caja especificado'::TEXT,
      0, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0;
    RETURN;
  END IF;
  
  IF v_estado_actual != 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'CIERRE_ERROR: Esta caja ya fue cerrada anteriormente'::TEXT,
      _id_cierre_caja, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0;
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
      _id_cierre_caja, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, v_ventas_pendientes;
    RETURN;
  END IF;
  
  -- 3. Obtener monto de apertura desde movimientos_caja (tipo_movimiento = 'apertura')
  SELECT COALESCE(SUM(mc.monto), 0) INTO v_monto_apertura
  FROM movimientos_caja mc
  WHERE mc.id_cierre_caja = _id_cierre_caja
    AND mc.tipo_movimiento = 'apertura';
  
  -- 4. Calcular el total de efectivo esperado
  -- Suma de: monto_apertura + ingresos efectivo - egresos efectivo (excluyendo apertura)
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
  
  -- 5. Actualizar el cierre de caja de forma atómica
  UPDATE cierrecaja SET
    fechacierre = _fecha_cierre,
    id_usuario = _id_usuario,
    total_efectivo_calculado = v_total_efectivo_calculado,
    total_efectivo_real = _total_efectivo_real,
    diferencia_efectivo = _total_efectivo_real - v_total_efectivo_calculado,
    estado = 1
  WHERE id = _id_cierre_caja;
  
  -- 6. Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE, 
    'Caja cerrada correctamente'::TEXT,
    _id_cierre_caja,
    v_total_efectivo_calculado,
    _total_efectivo_real,
    _total_efectivo_real - v_total_efectivo_calculado,
    0;
END;
$$ LANGUAGE plpgsql;

-- Función para validar estado de caja antes de cerrar (útil para el frontend)
DROP FUNCTION IF EXISTS validar_estado_cierre_caja(INTEGER);

CREATE OR REPLACE FUNCTION validar_estado_cierre_caja(
  _id_cierre_caja INTEGER
) RETURNS TABLE(
  puede_cerrar BOOLEAN,
  mensaje TEXT,
  ventas_pendientes INTEGER,
  total_ventas NUMERIC,
  total_efectivo_esperado NUMERIC
) AS $$
DECLARE
  v_estado INTEGER;
  v_ventas_pendientes INTEGER;
  v_total_ventas NUMERIC;
  v_total_efectivo NUMERIC;
  v_monto_apertura NUMERIC;
BEGIN
  -- Verificar estado actual
  SELECT estado INTO v_estado
  FROM cierrecaja
  WHERE id = _id_cierre_caja;
  
  IF v_estado IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 'No se encontró el cierre de caja'::TEXT, 0, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  IF v_estado = 1 THEN
    RETURN QUERY SELECT 
      FALSE, 'Esta caja ya está cerrada'::TEXT, 0, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Contar ventas pendientes
  SELECT COUNT(*) INTO v_ventas_pendientes
  FROM ventas
  WHERE id_cierre_caja = _id_cierre_caja
    AND estado = 'pendiente';
  
  -- Calcular totales
  SELECT COALESCE(SUM(monto_total), 0) INTO v_total_ventas
  FROM ventas
  WHERE id_cierre_caja = _id_cierre_caja
    AND estado = 'completada';
  
  -- Obtener monto de apertura desde movimientos_caja
  SELECT COALESCE(SUM(mc.monto), 0) INTO v_monto_apertura
  FROM movimientos_caja mc
  WHERE mc.id_cierre_caja = _id_cierre_caja
    AND mc.tipo_movimiento = 'apertura';
  
  -- Calcular efectivo esperado
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
  ) INTO v_total_efectivo;
  
  IF v_ventas_pendientes > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      ('Hay ' || v_ventas_pendientes || ' venta(s) pendiente(s)')::TEXT,
      v_ventas_pendientes,
      v_total_ventas,
      v_total_efectivo;
  ELSE
    RETURN QUERY SELECT 
      TRUE, 
      'La caja puede cerrarse'::TEXT,
      0,
      v_total_ventas,
      v_total_efectivo;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. SERIALIZACIÓN DE COMPROBANTES SEGURA
-- ============================================

-- Función atómica para obtener el siguiente número de comprobante
-- Usa bloqueo a nivel de fila para evitar duplicados en concurrencia
CREATE OR REPLACE FUNCTION obtener_siguiente_correlativo(
  _id_serializacion INTEGER
) RETURNS TABLE(
  serie TEXT,
  correlativo INTEGER,
  numero_formateado TEXT
) AS $$
DECLARE
  v_serie TEXT;
  v_correlativo_actual INTEGER;
  v_correlativo_nuevo INTEGER;
  v_longitud INTEGER;
BEGIN
  -- Bloquear el registro de serialización para evitar condiciones de carrera
  SELECT s.serie, s.correlativo, s.longitud_correlativo
  INTO v_serie, v_correlativo_actual, v_longitud
  FROM serializacion_comprobantes s
  WHERE s.id = _id_serializacion
  FOR UPDATE;
  
  IF v_serie IS NULL THEN
    RAISE EXCEPTION 'SERIAL_ERROR: No se encontró la serialización especificada';
  END IF;
  
  -- Calcular nuevo correlativo
  v_correlativo_nuevo := v_correlativo_actual + 1;
  
  -- Actualizar el correlativo en la tabla
  UPDATE serializacion_comprobantes
  SET correlativo = v_correlativo_nuevo
  WHERE id = _id_serializacion;
  
  -- Retornar los datos con formato
  RETURN QUERY SELECT 
    v_serie,
    v_correlativo_nuevo,
    v_serie || '-' || LPAD(v_correlativo_nuevo::TEXT, COALESCE(v_longitud, 8), '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. MEJORA DE confirmar_venta CON DESCUENTO DE STOCK
-- ============================================
-- Esta función mejora la existente agregando descuento de stock
-- Mantiene la misma firma para compatibilidad con el frontend

CREATE OR REPLACE FUNCTION confirmar_venta(
  _id_venta INTEGER, 
  _id_usuario INTEGER, 
  _vuelto NUMERIC, 
  _id_tipo_comprobante INTEGER, 
  _serie VARCHAR, 
  _id_sucursal INTEGER, 
  _id_cliente INTEGER, 
  _fecha TIMESTAMP, 
  _monto_total NUMERIC
) RETURNS SETOF ventas AS $$
DECLARE
  nuevo_comprobante TEXT;
  v_estado_actual TEXT;
BEGIN
  -- 1. Verificar estado de la venta con bloqueo
  SELECT estado INTO v_estado_actual
  FROM ventas
  WHERE id = _id_venta
  FOR UPDATE;
  
  IF v_estado_actual IS NULL THEN
    RAISE EXCEPTION 'VENTA_ERROR: La venta especificada no existe';
  END IF;
  
  -- Permitir solo ventas pendientes o nuevas
  IF v_estado_actual NOT IN ('pendiente', 'nueva') THEN
    RAISE EXCEPTION 'VENTA_ERROR: Esta venta ya fue procesada (estado: %)', v_estado_actual;
  END IF;
  
  -- 2. Generar número de comprobante (usa FOR UPDATE internamente)
  SELECT generar_nro_comprobante(_id_tipo_comprobante, _serie, _id_sucursal)
  INTO nuevo_comprobante;
  
  -- 3. Actualizar la venta
  UPDATE ventas
  SET 
    estado = 'confirmada',
    nro_comprobante = nuevo_comprobante,
    id_usuario = _id_usuario,
    vuelto = _vuelto,
    id_cliente = _id_cliente,
    fecha = _fecha,
    monto_total = _monto_total
  WHERE id = _id_venta;
  
  -- 4. NUEVO: Descontar stock de los productos vendidos
  UPDATE stock s SET
    stock = s.stock - dv.cantidad
  FROM detalle_venta dv
  WHERE dv.id_venta = _id_venta
    AND s.id_almacen = dv.id_almacen
    AND s.id_producto = dv.id_producto;
  
  -- 5. Retornar la venta actualizada
  RETURN QUERY SELECT * FROM ventas WHERE id = _id_venta;
END; 
$$ LANGUAGE plpgsql;

-- Función alternativa con serialización por ID (opcional, para uso futuro)
CREATE OR REPLACE FUNCTION confirmar_venta_con_serializacion(
  _id_venta INTEGER,
  _id_usuario INTEGER,
  _vuelto NUMERIC,
  _id_tipo_comprobante INTEGER,
  _id_serializacion INTEGER,
  _id_sucursal INTEGER,
  _id_cliente INTEGER,
  _fecha TIMESTAMP,
  _monto_total NUMERIC
) RETURNS TABLE(
  id_venta INTEGER,
  serie TEXT,
  correlativo INTEGER,
  numero_comprobante TEXT,
  fecha TIMESTAMP,
  monto_total NUMERIC
) AS $$
DECLARE
  v_serie TEXT;
  v_correlativo INTEGER;
  v_numero_formateado TEXT;
  v_estado_venta TEXT;
BEGIN
  -- 1. Verificar que la venta existe y está pendiente
  SELECT estado INTO v_estado_venta
  FROM ventas
  WHERE id = _id_venta
  FOR UPDATE;
  
  IF v_estado_venta IS NULL THEN
    RAISE EXCEPTION 'VENTA_ERROR: La venta especificada no existe';
  END IF;
  
  IF v_estado_venta NOT IN ('pendiente', 'nueva') THEN
    RAISE EXCEPTION 'VENTA_ERROR: Esta venta ya fue procesada (estado: %)', v_estado_venta;
  END IF;
  
  -- 2. Obtener siguiente correlativo de forma atómica
  SELECT os.serie, os.correlativo, os.numero_formateado
  INTO v_serie, v_correlativo, v_numero_formateado
  FROM obtener_siguiente_correlativo(_id_serializacion) os;
  
  -- 3. Actualizar la venta con todos los datos
  UPDATE ventas SET
    estado = 'confirmada',
    nro_comprobante = v_numero_formateado,
    id_usuario = _id_usuario,
    vuelto = _vuelto,
    id_tipo_comprobante = _id_tipo_comprobante,
    id_sucursal = _id_sucursal,
    id_cliente = _id_cliente,
    fecha = _fecha,
    monto_total = _monto_total
  WHERE id = _id_venta;
  
  -- 4. Descontar stock de los productos vendidos
  UPDATE stock s SET
    stock = s.stock - dv.cantidad
  FROM detalle_venta dv
  WHERE dv.id_venta = _id_venta
    AND s.id_almacen = dv.id_almacen
    AND s.id_producto = dv.id_producto;
  
  -- 5. Retornar datos de la venta confirmada
  RETURN QUERY SELECT 
    _id_venta,
    v_serie,
    v_correlativo,
    v_numero_formateado,
    _fecha,
    _monto_total;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un número de comprobante ya existe (validación adicional)
CREATE OR REPLACE FUNCTION verificar_comprobante_unico(
  _serie TEXT,
  _correlativo INTEGER,
  _id_sucursal INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM ventas
    WHERE serie = _serie
      AND correlativo = _correlativo
      AND id_sucursal = _id_sucursal
      AND estado = 'confirmada'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON FUNCTION insertardetalleventa_con_validacion IS 
'Inserta detalle de venta validando que haya stock suficiente. Lanza error STOCK_ERROR si no hay disponibilidad';

COMMENT ON FUNCTION verificar_stock_disponible IS 
'Verifica el stock disponible de un producto considerando lo que ya está en el carrito';

COMMENT ON FUNCTION cerrar_caja_atomico IS 
'Cierra una caja de forma atómica con todas las validaciones: verifica estado, ventas pendientes y calcula diferencias';

COMMENT ON FUNCTION validar_estado_cierre_caja IS 
'Valida si una caja puede cerrarse y retorna información útil para el frontend';

COMMENT ON FUNCTION obtener_siguiente_correlativo IS 
'Obtiene el siguiente número de correlativo de forma atómica usando bloqueo a nivel de fila';

COMMENT ON FUNCTION confirmar_venta IS 
'Confirma una venta: genera comprobante, actualiza venta y descuenta stock en una transacción atómica';

COMMENT ON FUNCTION confirmar_venta_con_serializacion IS 
'Alternativa que usa ID de serialización directamente';

COMMENT ON FUNCTION verificar_comprobante_unico IS 
'Verifica que un número de comprobante no esté duplicado';

-- ============================================
-- FIN DEL SCRIPT - FASE 2
-- ============================================
