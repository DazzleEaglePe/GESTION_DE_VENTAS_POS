-- =====================================================
-- FIX: FORMATO DE PRECIOS EN FUNCIONES SQL
-- Problema: Los precios se muestran con muchos decimales
--           ejemplo: S/. 3.0000000000000000
-- Solución: Usar ROUND() para limitar a 2 decimales
-- =====================================================

-- ============================================
-- 1. ACTUALIZAR FUNCIÓN mostrarproductos
-- ============================================

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
    AND COALESCE(p.estado, 'activo') = 'activo';
$$ LANGUAGE SQL;

-- ============================================
-- 2. ACTUALIZAR FUNCIÓN buscarproductos
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
    AND COALESCE(p.estado, 'activo') = 'activo'
  ORDER BY p.nombre ASC
  LIMIT 10;
$$ LANGUAGE SQL;

-- ============================================
-- 3. ACTUALIZAR FUNCIÓN buscarproductoslectora
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
    AND COALESCE(p.estado, 'activo') = 'activo'
  LIMIT 1;
$$ LANGUAGE SQL;

-- ============================================
-- 4. ACTUALIZAR FUNCIÓN mostrar_productos_inactivos
-- ============================================

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
-- 5. OPCIONAL: Limpiar precios existentes con decimales excesivos
-- ============================================

-- Esto actualizará todos los productos que tienen decimales innecesarios
UPDATE productos
SET 
  precio_venta = ROUND(precio_venta, 2),
  precio_compra = ROUND(precio_compra, 2)
WHERE 
  precio_venta != ROUND(precio_venta, 2)
  OR precio_compra != ROUND(precio_compra, 2);

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ejecuta esto para verificar que los precios se muestran correctamente:
-- SELECT * FROM mostrarproductos(4);
