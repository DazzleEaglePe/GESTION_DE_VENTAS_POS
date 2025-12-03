-- ============================================
-- MEJORAS FASE 3 - SOFT DELETE
-- Sistema POS - Eliminación Lógica
-- ============================================
-- 
-- Este archivo implementa Soft Delete (eliminación lógica) para:
-- - Preservar históricos de datos
-- - Permitir recuperación de registros
-- - Mantener integridad referencial
-- - Habilitar auditoría
--
-- IMPORTANTE: Ejecutar DESPUÉS de mejoras_fase2.sql
-- ============================================

-- ============================================
-- 1. AGREGAR COLUMNAS DE SOFT DELETE
-- ============================================

-- PRODUCTOS
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

COMMENT ON COLUMN productos.activo IS 'False = eliminado lógicamente';
COMMENT ON COLUMN productos.fecha_eliminacion IS 'Fecha y hora de eliminación';
COMMENT ON COLUMN productos.eliminado_por IS 'ID del usuario que eliminó';

-- CATEGORÍAS
ALTER TABLE categorias 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

COMMENT ON COLUMN categorias.activo IS 'False = eliminado lógicamente';

-- CLIENTES/PROVEEDORES (ya tiene campo 'estado', pero agregamos para consistencia)
ALTER TABLE clientes_proveedores 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

COMMENT ON COLUMN clientes_proveedores.activo IS 'False = eliminado lógicamente';

-- USUARIOS
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

COMMENT ON COLUMN usuarios.activo IS 'False = eliminado lógicamente';

-- MÉTODOS DE PAGO
ALTER TABLE metodos_pago 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

COMMENT ON COLUMN metodos_pago.activo IS 'False = eliminado lógicamente';

-- SUCURSALES (ya tiene campo 'delete', reemplazamos por consistencia)
ALTER TABLE sucursales 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

-- Migrar datos existentes de delete a activo
UPDATE sucursales SET activo = "delete" WHERE "delete" IS NOT NULL;

COMMENT ON COLUMN sucursales.activo IS 'False = eliminado lógicamente';

-- CAJAS (ya tiene campo 'delete', reemplazamos)
ALTER TABLE caja 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

-- Migrar datos existentes
UPDATE caja SET activo = "delete" WHERE "delete" IS NOT NULL;

COMMENT ON COLUMN caja.activo IS 'False = eliminado lógicamente';

-- ALMACENES (ya tiene campo 'delete', reemplazamos)
ALTER TABLE almacen 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

-- Migrar datos existentes
UPDATE almacen SET activo = "delete" WHERE "delete" IS NOT NULL;

COMMENT ON COLUMN almacen.activo IS 'False = eliminado lógicamente';

-- IMPRESORAS
ALTER TABLE impresoras 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMP,
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

COMMENT ON COLUMN impresoras.activo IS 'False = eliminado lógicamente';

-- ============================================
-- 2. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_clientes_proveedores_activo ON clientes_proveedores(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_metodos_pago_activo ON metodos_pago(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_sucursales_activo ON sucursales(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_caja_activo ON caja(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_almacen_activo ON almacen(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_impresoras_activo ON impresoras(activo) WHERE activo = true;

-- ============================================
-- 3. FUNCIONES DE SOFT DELETE
-- ============================================

-- Función genérica para soft delete
CREATE OR REPLACE FUNCTION soft_delete(
  p_tabla TEXT,
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_query TEXT;
  v_result INTEGER;
BEGIN
  v_query := format(
    'UPDATE %I SET activo = false, fecha_eliminacion = NOW(), eliminado_por = $1 WHERE id = $2 AND activo = true',
    p_tabla
  );
  
  EXECUTE v_query USING p_usuario_id, p_id;
  GET DIAGNOSTICS v_result = ROW_COUNT;
  
  IF v_result = 0 THEN
    RAISE EXCEPTION 'SOFT_DELETE_ERROR: No se encontró el registro o ya está eliminado';
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en soft_delete: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Función para restaurar registros eliminados
CREATE OR REPLACE FUNCTION restaurar_registro(
  p_tabla TEXT,
  p_id BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_query TEXT;
  v_result INTEGER;
BEGIN
  v_query := format(
    'UPDATE %I SET activo = true, fecha_eliminacion = NULL, eliminado_por = NULL WHERE id = $1 AND activo = false',
    p_tabla
  );
  
  EXECUTE v_query USING p_id;
  GET DIAGNOSTICS v_result = ROW_COUNT;
  
  IF v_result = 0 THEN
    RAISE EXCEPTION 'RESTAURAR_ERROR: No se encontró el registro eliminado';
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al restaurar: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. SOFT DELETE ESPECÍFICOS (con validaciones)
-- ============================================

-- Soft Delete para PRODUCTOS (verifica que no esté en ventas recientes)
CREATE OR REPLACE FUNCTION soft_delete_producto(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_ventas_recientes INTEGER;
  v_nombre_producto TEXT;
BEGIN
  -- Obtener nombre del producto
  SELECT nombre INTO v_nombre_producto FROM productos WHERE id = p_id;
  
  IF v_nombre_producto IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Producto no encontrado');
  END IF;
  
  -- Verificar ventas en los últimos 30 días
  SELECT COUNT(*) INTO v_ventas_recientes
  FROM detalle_venta dv
  JOIN ventas v ON v.id = dv.id_venta
  WHERE dv.id_producto = p_id
    AND v.fecha >= NOW() - INTERVAL '30 days'
    AND v.estado = 'completada';
  
  IF v_ventas_recientes > 0 THEN
    -- Permitir eliminar pero advertir
    UPDATE productos 
    SET activo = false, 
        fecha_eliminacion = NOW(), 
        eliminado_por = p_usuario_id
    WHERE id = p_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'warning', format('Producto "%s" eliminado. Tenía %s ventas en los últimos 30 días.', v_nombre_producto, v_ventas_recientes)
    );
  END IF;
  
  -- Eliminar normalmente
  UPDATE productos 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('Producto "%s" eliminado correctamente', v_nombre_producto));
END;
$$ LANGUAGE plpgsql;

-- Soft Delete para CATEGORÍAS (verifica productos asociados)
CREATE OR REPLACE FUNCTION soft_delete_categoria(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_productos_activos INTEGER;
  v_nombre_categoria TEXT;
BEGIN
  -- Obtener nombre de la categoría
  SELECT nombre INTO v_nombre_categoria FROM categorias WHERE id = p_id;
  
  IF v_nombre_categoria IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Categoría no encontrada');
  END IF;
  
  -- Contar productos activos en esta categoría
  SELECT COUNT(*) INTO v_productos_activos
  FROM productos 
  WHERE id_categoria = p_id AND activo = true;
  
  IF v_productos_activos > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Tiene %s productos activos asociados.', v_nombre_categoria, v_productos_activos)
    );
  END IF;
  
  -- Eliminar
  UPDATE categorias 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('Categoría "%s" eliminada correctamente', v_nombre_categoria));
END;
$$ LANGUAGE plpgsql;

-- Soft Delete para CLIENTES/PROVEEDORES (verifica ventas pendientes)
CREATE OR REPLACE FUNCTION soft_delete_cliente_proveedor(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_ventas_pendientes INTEGER;
  v_nombre TEXT;
BEGIN
  -- Obtener nombre
  SELECT nombres INTO v_nombre FROM clientes_proveedores WHERE id = p_id;
  
  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente/Proveedor no encontrado');
  END IF;
  
  -- Verificar ventas pendientes
  SELECT COUNT(*) INTO v_ventas_pendientes
  FROM ventas 
  WHERE id_cliente = p_id AND estado = 'pendiente';
  
  IF v_ventas_pendientes > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Tiene %s ventas pendientes.', v_nombre, v_ventas_pendientes)
    );
  END IF;
  
  -- Eliminar
  UPDATE clientes_proveedores 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('"%s" eliminado correctamente', v_nombre));
END;
$$ LANGUAGE plpgsql;

-- Soft Delete para USUARIOS (verifica permisos y asignaciones)
CREATE OR REPLACE FUNCTION soft_delete_usuario(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_nombre TEXT;
  v_es_admin BOOLEAN;
  v_tiene_caja_abierta BOOLEAN;
BEGIN
  -- Obtener nombre
  SELECT nombres INTO v_nombre FROM usuarios WHERE id = p_id;
  
  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;
  
  -- No permitir auto-eliminación
  IF p_id = p_usuario_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes eliminarte a ti mismo');
  END IF;
  
  -- Verificar si tiene caja abierta
  SELECT EXISTS(
    SELECT 1 FROM cierrecaja 
    WHERE id_usuario = p_id AND estado = 0
  ) INTO v_tiene_caja_abierta;
  
  IF v_tiene_caja_abierta THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Tiene una caja abierta.', v_nombre)
    );
  END IF;
  
  -- Eliminar permisos asociados
  DELETE FROM permisos WHERE id_usuario = p_id;
  
  -- Soft delete usuario
  UPDATE usuarios 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('Usuario "%s" eliminado correctamente', v_nombre));
END;
$$ LANGUAGE plpgsql;

-- Soft Delete para SUCURSALES (verifica dependencias)
CREATE OR REPLACE FUNCTION soft_delete_sucursal(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_nombre TEXT;
  v_cajas_activas INTEGER;
  v_almacenes_activos INTEGER;
BEGIN
  -- Obtener nombre
  SELECT nombre INTO v_nombre FROM sucursales WHERE id = p_id;
  
  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sucursal no encontrada');
  END IF;
  
  -- Verificar cajas activas
  SELECT COUNT(*) INTO v_cajas_activas
  FROM caja WHERE id_sucursal = p_id AND activo = true;
  
  IF v_cajas_activas > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Tiene %s cajas activas.', v_nombre, v_cajas_activas)
    );
  END IF;
  
  -- Verificar almacenes activos
  SELECT COUNT(*) INTO v_almacenes_activos
  FROM almacen WHERE id_sucursal = p_id AND activo = true;
  
  IF v_almacenes_activos > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Tiene %s almacenes activos.', v_nombre, v_almacenes_activos)
    );
  END IF;
  
  -- Eliminar
  UPDATE sucursales 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('Sucursal "%s" eliminada correctamente', v_nombre));
END;
$$ LANGUAGE plpgsql;

-- Soft Delete para CAJAS
CREATE OR REPLACE FUNCTION soft_delete_caja(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_descripcion TEXT;
  v_caja_abierta BOOLEAN;
BEGIN
  -- Obtener descripción
  SELECT descripcion INTO v_descripcion FROM caja WHERE id = p_id;
  
  IF v_descripcion IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caja no encontrada');
  END IF;
  
  -- Verificar si hay turno abierto
  SELECT EXISTS(
    SELECT 1 FROM cierrecaja 
    WHERE id_caja = p_id AND estado = 0
  ) INTO v_caja_abierta;
  
  IF v_caja_abierta THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Tiene un turno abierto.', v_descripcion)
    );
  END IF;
  
  -- Eliminar
  UPDATE caja 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('Caja "%s" eliminada correctamente', v_descripcion));
END;
$$ LANGUAGE plpgsql;

-- Soft Delete para ALMACENES
CREATE OR REPLACE FUNCTION soft_delete_almacen(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_nombre TEXT;
  v_tiene_stock BOOLEAN;
BEGIN
  -- Obtener nombre
  SELECT nombre INTO v_nombre FROM almacen WHERE id = p_id;
  
  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Almacén no encontrado');
  END IF;
  
  -- Verificar si tiene stock
  SELECT EXISTS(
    SELECT 1 FROM stock 
    WHERE id_almacen = p_id AND stock > 0
  ) INTO v_tiene_stock;
  
  IF v_tiene_stock THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Tiene productos con stock.', v_nombre)
    );
  END IF;
  
  -- Eliminar
  UPDATE almacen 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('Almacén "%s" eliminado correctamente', v_nombre));
END;
$$ LANGUAGE plpgsql;

-- Soft Delete para MÉTODOS DE PAGO
CREATE OR REPLACE FUNCTION soft_delete_metodo_pago(
  p_id BIGINT,
  p_usuario_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_nombre TEXT;
  v_es_predeterminado BOOLEAN;
BEGIN
  -- Obtener nombre y si es predeterminado
  SELECT nombre, delete_update INTO v_nombre, v_es_predeterminado 
  FROM metodos_pago WHERE id = p_id;
  
  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Método de pago no encontrado');
  END IF;
  
  -- No permitir eliminar predeterminados
  IF v_es_predeterminado = false THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('No se puede eliminar "%s". Es un método de pago del sistema.', v_nombre)
    );
  END IF;
  
  -- Eliminar
  UPDATE metodos_pago 
  SET activo = false, 
      fecha_eliminacion = NOW(), 
      eliminado_por = p_usuario_id
  WHERE id = p_id;
  
  RETURN jsonb_build_object('success', true, 'message', format('Método de pago "%s" eliminado correctamente', v_nombre));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. VISTAS PARA DATOS ACTIVOS
-- ============================================

-- Vista de productos activos
CREATE OR REPLACE VIEW v_productos_activos AS
SELECT p.*, c.nombre as categoria_nombre
FROM productos p
LEFT JOIN categorias c ON p.id_categoria = c.id
WHERE p.activo = true;

-- Vista de categorías activas
CREATE OR REPLACE VIEW v_categorias_activas AS
SELECT * FROM categorias WHERE activo = true;

-- Vista de clientes activos
CREATE OR REPLACE VIEW v_clientes_activos AS
SELECT * FROM clientes_proveedores 
WHERE activo = true AND tipo = 'cliente';

-- Vista de proveedores activos
CREATE OR REPLACE VIEW v_proveedores_activos AS
SELECT * FROM clientes_proveedores 
WHERE activo = true AND tipo = 'proveedor';

-- Vista de usuarios activos
CREATE OR REPLACE VIEW v_usuarios_activos AS
SELECT * FROM usuarios WHERE activo = true;

-- Vista de elementos eliminados (para administración)
CREATE OR REPLACE VIEW v_elementos_eliminados AS
SELECT 'productos' as tabla, id, nombre as descripcion, fecha_eliminacion, eliminado_por
FROM productos WHERE activo = false
UNION ALL
SELECT 'categorias', id, nombre, fecha_eliminacion, eliminado_por
FROM categorias WHERE activo = false
UNION ALL
SELECT 'clientes_proveedores', id, nombres, fecha_eliminacion, eliminado_por
FROM clientes_proveedores WHERE activo = false
UNION ALL
SELECT 'usuarios', id, nombres, fecha_eliminacion, eliminado_por
FROM usuarios WHERE activo = false
UNION ALL
SELECT 'sucursales', id, nombre, fecha_eliminacion, eliminado_por
FROM sucursales WHERE activo = false
UNION ALL
SELECT 'caja', id, descripcion, fecha_eliminacion, eliminado_por
FROM caja WHERE activo = false
UNION ALL
SELECT 'almacen', id, nombre, fecha_eliminacion, eliminado_por
FROM almacen WHERE activo = false
UNION ALL
SELECT 'metodos_pago', id, nombre, fecha_eliminacion, eliminado_por
FROM metodos_pago WHERE activo = false;

-- ============================================
-- 7. FUNCIÓN RPC PARA MOSTRAR ELEMENTOS ELIMINADOS
-- ============================================

CREATE OR REPLACE FUNCTION mostrar_elementos_eliminados(_id_empresa BIGINT)
RETURNS TABLE (
  tabla TEXT,
  id BIGINT,
  descripcion TEXT,
  fecha_eliminacion TIMESTAMP,
  eliminado_por BIGINT,
  usuario_elimino TEXT,
  icono TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Productos
  SELECT 
    'productos'::TEXT as tabla,
    p.id,
    p.nombre as descripcion,
    p.fecha_eliminacion,
    p.eliminado_por,
    COALESCE(u.nombres, 'Sistema')::TEXT as usuario_elimino,
    'lucide:package'::TEXT as icono
  FROM productos p
  LEFT JOIN usuarios u ON u.id = p.eliminado_por
  WHERE p.activo = false AND p.id_empresa = _id_empresa
  
  UNION ALL
  
  -- Categorías
  SELECT 
    'categorias'::TEXT,
    c.id,
    c.nombre,
    c.fecha_eliminacion,
    c.eliminado_por,
    COALESCE(u.nombres, 'Sistema')::TEXT,
    'lucide:tags'::TEXT
  FROM categorias c
  LEFT JOIN usuarios u ON u.id = c.eliminado_por
  WHERE c.activo = false AND c.id_empresa = _id_empresa
  
  UNION ALL
  
  -- Clientes/Proveedores
  SELECT 
    'clientes_proveedores'::TEXT,
    cp.id,
    cp.nombres,
    cp.fecha_eliminacion,
    cp.eliminado_por,
    COALESCE(u.nombres, 'Sistema')::TEXT,
    CASE WHEN cp.tipo = 'cliente' THEN 'lucide:users' ELSE 'lucide:truck' END::TEXT
  FROM clientes_proveedores cp
  LEFT JOIN usuarios u ON u.id = cp.eliminado_por
  WHERE cp.activo = false AND cp.id_empresa = _id_empresa
  
  UNION ALL
  
  -- Métodos de pago
  SELECT 
    'metodos_pago'::TEXT,
    mp.id,
    mp.nombre,
    mp.fecha_eliminacion,
    mp.eliminado_por,
    COALESCE(u.nombres, 'Sistema')::TEXT,
    'lucide:credit-card'::TEXT
  FROM metodos_pago mp
  LEFT JOIN usuarios u ON u.id = mp.eliminado_por
  WHERE mp.activo = false AND mp.id_empresa = _id_empresa
  
  UNION ALL
  
  -- Sucursales
  SELECT 
    'sucursales'::TEXT,
    s.id,
    s.nombre,
    s.fecha_eliminacion,
    s.eliminado_por,
    COALESCE(u.nombres, 'Sistema')::TEXT,
    'lucide:store'::TEXT
  FROM sucursales s
  LEFT JOIN usuarios u ON u.id = s.eliminado_por
  WHERE s.activo = false AND s.id_empresa = _id_empresa
  
  UNION ALL
  
  -- Cajas (a través de sucursales)
  SELECT 
    'caja'::TEXT,
    ca.id,
    ca.descripcion,
    ca.fecha_eliminacion,
    ca.eliminado_por,
    COALESCE(u.nombres, 'Sistema')::TEXT,
    'lucide:calculator'::TEXT
  FROM caja ca
  JOIN sucursales s ON s.id = ca.id_sucursal
  LEFT JOIN usuarios u ON u.id = ca.eliminado_por
  WHERE ca.activo = false AND s.id_empresa = _id_empresa
  
  UNION ALL
  
  -- Almacenes (a través de sucursales)
  SELECT 
    'almacen'::TEXT,
    a.id,
    a.nombre,
    a.fecha_eliminacion,
    a.eliminado_por,
    COALESCE(u.nombres, 'Sistema')::TEXT,
    'lucide:warehouse'::TEXT
  FROM almacen a
  JOIN sucursales s ON s.id = a.id_sucursal
  LEFT JOIN usuarios u ON u.id = a.eliminado_por
  WHERE a.activo = false AND s.id_empresa = _id_empresa
  
  ORDER BY fecha_eliminacion DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. ACTUALIZAR DATOS EXISTENTES
-- ============================================

-- Asegurar que todos los registros existentes están marcados como activos
UPDATE productos SET activo = true WHERE activo IS NULL;
UPDATE categorias SET activo = true WHERE activo IS NULL;
UPDATE clientes_proveedores SET activo = true WHERE activo IS NULL;
UPDATE usuarios SET activo = true WHERE activo IS NULL;
UPDATE metodos_pago SET activo = true WHERE activo IS NULL;
UPDATE sucursales SET activo = true WHERE activo IS NULL;
UPDATE caja SET activo = true WHERE activo IS NULL;
UPDATE almacen SET activo = true WHERE activo IS NULL;
UPDATE impresoras SET activo = true WHERE activo IS NULL;

-- ============================================
-- FIN DE MEJORAS FASE 3 - SOFT DELETE
-- ============================================
