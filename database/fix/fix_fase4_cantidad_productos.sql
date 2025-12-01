-- =============================================
-- FIX: Actualizar cantidad_productos al confirmar venta
-- Fecha: 30/11/2025
-- Descripción: Modifica la función confirmar_venta para que 
-- calcule automáticamente la cantidad de productos vendidos
-- desde la tabla detalle_venta
-- =============================================

-- Reemplazar la función existente
CREATE OR REPLACE FUNCTION public.confirmar_venta(
    _id_venta integer, 
    _id_usuario integer, 
    _vuelto numeric, 
    _id_tipo_comprobante integer, 
    _serie character varying, 
    _id_sucursal integer, 
    _id_cliente integer, 
    _fecha timestamp without time zone, 
    _monto_total numeric
) RETURNS SETOF public.ventas
    LANGUAGE plpgsql
    AS $$
DECLARE
    nuevo_comprobante TEXT;
    total_productos INTEGER;
BEGIN
    -- Generar número de comprobante automáticamente
    SELECT generar_nro_comprobante(_id_tipo_comprobante, _serie, _id_sucursal)
    INTO nuevo_comprobante;
    
    -- Calcular la cantidad total de productos vendidos
    SELECT COALESCE(SUM(cantidad), 0)::INTEGER
    INTO total_productos
    FROM detalle_venta
    WHERE id_venta = _id_venta;
    
    -- Actualizar la venta con todos los datos incluyendo cantidad_productos
    UPDATE ventas
    SET 
        estado = 'confirmada',
        nro_comprobante = nuevo_comprobante,
        id_usuario = _id_usuario,
        vuelto = _vuelto,
        id_cliente = _id_cliente,
        fecha = _fecha,
        monto_total = _monto_total,
        cantidad_productos = total_productos  -- 🔥 NUEVO: Se calcula automáticamente
    WHERE id = _id_venta;
    
    RETURN QUERY SELECT * FROM ventas WHERE id = _id_venta;
END; 
$$;

-- Comentario explicativo
COMMENT ON FUNCTION public.confirmar_venta IS 
'Confirma una venta actualizando su estado, generando el comprobante y calculando automáticamente la cantidad de productos desde detalle_venta';

-- =============================================
-- OPCIONAL: Corregir ventas existentes que tienen cantidad_productos = 0
-- =============================================
UPDATE ventas v
SET cantidad_productos = (
    SELECT COALESCE(SUM(dv.cantidad), 0)::INTEGER
    FROM detalle_venta dv
    WHERE dv.id_venta = v.id
)
WHERE v.cantidad_productos = 0 OR v.cantidad_productos IS NULL;
