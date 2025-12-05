-- =====================================================
-- FASE 7: MEJORAS DE DIFERENCIACIÓN
-- Descripción: Subcategorías, Variantes, Multiprecios,
--              Productos Compuestos y Seriales
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- PARTE 1: SUBCATEGORÍAS
-- =====================================================

-- Agregar columna de categoría padre para jerarquía
ALTER TABLE categorias 
ADD COLUMN IF NOT EXISTS id_categoria_padre BIGINT REFERENCES categorias(id),
ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

COMMENT ON COLUMN categorias.id_categoria_padre IS 'ID de la categoría padre para subcategorías';
COMMENT ON COLUMN categorias.nivel IS 'Nivel de profundidad: 1=Categoría, 2=Subcategoría, etc.';
COMMENT ON COLUMN categorias.orden IS 'Orden de visualización dentro del mismo nivel';

-- Índice para búsquedas jerárquicas
CREATE INDEX IF NOT EXISTS idx_categorias_padre ON categorias(id_categoria_padre);
CREATE INDEX IF NOT EXISTS idx_categorias_nivel ON categorias(nivel);

-- Función para obtener categorías con jerarquía
CREATE OR REPLACE FUNCTION obtener_categorias_jerarquicas(_id_empresa BIGINT)
RETURNS TABLE (
    id BIGINT,
    nombre TEXT,
    color TEXT,
    icono TEXT,
    id_empresa BIGINT,
    id_categoria_padre BIGINT,
    nivel INTEGER,
    orden INTEGER,
    nombre_padre TEXT,
    ruta_completa TEXT,
    cantidad_subcategorias BIGINT,
    cantidad_productos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE categoria_tree AS (
        -- Categorías raíz
        SELECT 
            c.id,
            c.nombre,
            c.color,
            c.icono,
            c.id_empresa,
            c.id_categoria_padre,
            COALESCE(c.nivel, 1) as nivel,
            COALESCE(c.orden, 0) as orden,
            NULL::TEXT as nombre_padre,
            c.nombre::TEXT as ruta_completa
        FROM categorias c
        WHERE c.id_empresa = _id_empresa 
          AND c.id_categoria_padre IS NULL
          AND COALESCE(c.activo, true) = true
        
        UNION ALL
        
        -- Subcategorías recursivas
        SELECT 
            c.id,
            c.nombre,
            c.color,
            c.icono,
            c.id_empresa,
            c.id_categoria_padre,
            COALESCE(c.nivel, ct.nivel + 1),
            COALESCE(c.orden, 0),
            ct.nombre as nombre_padre,
            ct.ruta_completa || ' > ' || c.nombre
        FROM categorias c
        INNER JOIN categoria_tree ct ON c.id_categoria_padre = ct.id
        WHERE COALESCE(c.activo, true) = true
    )
    SELECT 
        ct.id,
        ct.nombre,
        ct.color,
        ct.icono,
        ct.id_empresa,
        ct.id_categoria_padre,
        ct.nivel,
        ct.orden,
        ct.nombre_padre,
        ct.ruta_completa,
        (SELECT COUNT(*) FROM categorias sub WHERE sub.id_categoria_padre = ct.id AND COALESCE(sub.activo, true) = true) as cantidad_subcategorias,
        (SELECT COUNT(*) FROM productos p WHERE p.id_categoria = ct.id AND COALESCE(p.activo, true) = true) as cantidad_productos
    FROM categoria_tree ct
    ORDER BY ct.ruta_completa, ct.orden;
END;
$$ LANGUAGE plpgsql;

-- Función para insertar subcategoría
CREATE OR REPLACE FUNCTION insertar_subcategoria(
    _nombre TEXT,
    _color TEXT,
    _icono TEXT,
    _id_empresa BIGINT,
    _id_categoria_padre BIGINT
) RETURNS BIGINT AS $$
DECLARE
    v_nivel INTEGER;
    v_nuevo_id BIGINT;
BEGIN
    -- Obtener el nivel del padre
    SELECT COALESCE(nivel, 1) + 1 INTO v_nivel
    FROM categorias
    WHERE id = _id_categoria_padre;
    
    -- Si no hay padre, nivel = 1
    IF v_nivel IS NULL THEN
        v_nivel := 1;
    END IF;
    
    -- Insertar la subcategoría
    INSERT INTO categorias (nombre, color, icono, id_empresa, id_categoria_padre, nivel, activo)
    VALUES (_nombre, _color, _icono, _id_empresa, _id_categoria_padre, v_nivel, true)
    RETURNING id INTO v_nuevo_id;
    
    RETURN v_nuevo_id;
END;
$$ LANGUAGE plpgsql;

-- Función para mover categoría (cambiar padre)
CREATE OR REPLACE FUNCTION mover_categoria(
    _id_categoria BIGINT,
    _nuevo_padre BIGINT
) RETURNS JSONB AS $$
DECLARE
    v_nivel_nuevo INTEGER;
BEGIN
    -- Verificar que no se mueva a sí misma o a un descendiente
    IF _nuevo_padre IS NOT NULL THEN
        IF EXISTS (
            WITH RECURSIVE descendientes AS (
                SELECT id FROM categorias WHERE id = _id_categoria
                UNION ALL
                SELECT c.id FROM categorias c
                INNER JOIN descendientes d ON c.id_categoria_padre = d.id
            )
            SELECT 1 FROM descendientes WHERE id = _nuevo_padre
        ) THEN
            RETURN jsonb_build_object('exito', false, 'mensaje', 'No se puede mover una categoría a uno de sus descendientes');
        END IF;
        
        SELECT COALESCE(nivel, 1) + 1 INTO v_nivel_nuevo FROM categorias WHERE id = _nuevo_padre;
    ELSE
        v_nivel_nuevo := 1;
    END IF;
    
    UPDATE categorias 
    SET id_categoria_padre = _nuevo_padre, nivel = v_nivel_nuevo
    WHERE id = _id_categoria;
    
    RETURN jsonb_build_object('exito', true, 'mensaje', 'Categoría movida correctamente');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 2: VARIANTES DE PRODUCTOS
-- =====================================================

-- Tabla de atributos (Talla, Color, Material, etc.)
CREATE TABLE IF NOT EXISTS atributos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'texto', -- texto, color, numero
    id_empresa BIGINT NOT NULL REFERENCES empresa(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nombre, id_empresa)
);

COMMENT ON TABLE atributos IS 'Tipos de atributos para variantes (ej: Talla, Color)';

-- Tabla de valores de atributos
CREATE TABLE IF NOT EXISTS atributo_valores (
    id BIGSERIAL PRIMARY KEY,
    id_atributo BIGINT NOT NULL REFERENCES atributos(id) ON DELETE CASCADE,
    valor VARCHAR(100) NOT NULL,
    valor_visual VARCHAR(50), -- Para colores: código hex
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    UNIQUE(id_atributo, valor)
);

COMMENT ON TABLE atributo_valores IS 'Valores posibles para cada atributo (ej: S, M, L, XL para Talla)';

-- Modificar productos para soportar variantes
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS es_producto_padre BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS id_producto_padre BIGINT REFERENCES productos(id),
ADD COLUMN IF NOT EXISTS tiene_variantes BOOLEAN DEFAULT false;

COMMENT ON COLUMN productos.es_producto_padre IS 'True si es un producto con variantes';
COMMENT ON COLUMN productos.id_producto_padre IS 'ID del producto padre (si es una variante)';
COMMENT ON COLUMN productos.tiene_variantes IS 'True si este producto tiene variantes hijas';

-- Tabla de variantes de producto (relación producto-atributo-valor)
CREATE TABLE IF NOT EXISTS producto_variantes (
    id BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    id_atributo BIGINT NOT NULL REFERENCES atributos(id),
    id_valor BIGINT NOT NULL REFERENCES atributo_valores(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_producto, id_atributo)
);

COMMENT ON TABLE producto_variantes IS 'Valores de atributos asignados a cada variante de producto';

-- Índices para variantes
CREATE INDEX IF NOT EXISTS idx_productos_padre ON productos(id_producto_padre);
CREATE INDEX IF NOT EXISTS idx_producto_variantes_producto ON producto_variantes(id_producto);
CREATE INDEX IF NOT EXISTS idx_atributos_empresa ON atributos(id_empresa);

-- Función para crear atributo con valores
CREATE OR REPLACE FUNCTION crear_atributo_con_valores(
    _nombre VARCHAR(100),
    _tipo VARCHAR(50),
    _id_empresa BIGINT,
    _valores TEXT[] -- Array de valores
) RETURNS JSONB AS $$
DECLARE
    v_id_atributo BIGINT;
    v_valor TEXT;
    v_orden INTEGER := 0;
BEGIN
    -- Insertar atributo
    INSERT INTO atributos (nombre, tipo, id_empresa)
    VALUES (_nombre, _tipo, _id_empresa)
    RETURNING id INTO v_id_atributo;
    
    -- Insertar valores
    FOREACH v_valor IN ARRAY _valores LOOP
        v_orden := v_orden + 1;
        INSERT INTO atributo_valores (id_atributo, valor, orden)
        VALUES (v_id_atributo, v_valor, v_orden);
    END LOOP;
    
    RETURN jsonb_build_object(
        'exito', true,
        'id_atributo', v_id_atributo,
        'mensaje', 'Atributo creado con ' || array_length(_valores, 1) || ' valores'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para crear variante de producto
CREATE OR REPLACE FUNCTION crear_variante_producto(
    _id_producto_padre BIGINT,
    _nombre_variante TEXT,
    _precio_venta NUMERIC,
    _precio_compra NUMERIC,
    _codigo_barras TEXT,
    _atributos JSONB -- [{id_atributo: 1, id_valor: 5}, ...]
) RETURNS JSONB AS $$
DECLARE
    v_id_variante BIGINT;
    v_atributo JSONB;
    v_producto_padre RECORD;
BEGIN
    -- Obtener datos del producto padre
    SELECT * INTO v_producto_padre FROM productos WHERE id = _id_producto_padre;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Producto padre no encontrado');
    END IF;
    
    -- Marcar producto padre como que tiene variantes
    UPDATE productos SET tiene_variantes = true, es_producto_padre = true 
    WHERE id = _id_producto_padre;
    
    -- Crear la variante como un nuevo producto
    INSERT INTO productos (
        nombre, precio_venta, precio_compra, id_categoria, codigo_barras,
        codigo_interno, id_empresa, sevende_por, maneja_inventarios,
        id_producto_padre, es_producto_padre, activo
    ) VALUES (
        COALESCE(_nombre_variante, v_producto_padre.nombre),
        COALESCE(_precio_venta, v_producto_padre.precio_venta),
        COALESCE(_precio_compra, v_producto_padre.precio_compra),
        v_producto_padre.id_categoria,
        _codigo_barras,
        v_producto_padre.codigo_interno,
        v_producto_padre.id_empresa,
        v_producto_padre.sevende_por,
        v_producto_padre.maneja_inventarios,
        _id_producto_padre,
        false,
        true
    )
    RETURNING id INTO v_id_variante;
    
    -- Asignar atributos a la variante
    FOR v_atributo IN SELECT * FROM jsonb_array_elements(_atributos) LOOP
        INSERT INTO producto_variantes (id_producto, id_atributo, id_valor)
        VALUES (
            v_id_variante,
            (v_atributo->>'id_atributo')::BIGINT,
            (v_atributo->>'id_valor')::BIGINT
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'exito', true,
        'id_variante', v_id_variante,
        'mensaje', 'Variante creada correctamente'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener variantes de un producto
CREATE OR REPLACE FUNCTION obtener_variantes_producto(_id_producto_padre BIGINT)
RETURNS TABLE (
    id BIGINT,
    nombre TEXT,
    precio_venta NUMERIC,
    precio_compra NUMERIC,
    codigo_barras TEXT,
    atributos JSONB,
    stock_total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nombre,
        p.precio_venta,
        p.precio_compra,
        p.codigo_barras,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'atributo', a.nombre,
                'valor', av.valor,
                'valor_visual', av.valor_visual
            ))
            FROM producto_variantes pv
            JOIN atributos a ON pv.id_atributo = a.id
            JOIN atributo_valores av ON pv.id_valor = av.id
            WHERE pv.id_producto = p.id),
            '[]'::jsonb
        ) as atributos,
        COALESCE((SELECT SUM(s.cantidad) FROM stock s WHERE s.id_producto = p.id), 0) as stock_total
    FROM productos p
    WHERE p.id_producto_padre = _id_producto_padre
      AND COALESCE(p.activo, true) = true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 3: MULTIPRECIOS (Mejorar la tabla existente)
-- =====================================================

-- Mejorar la tabla multiprecios existente
ALTER TABLE multiprecios
ADD COLUMN IF NOT EXISTS nombre VARCHAR(100), -- "Mayoreo", "Distribuidor", etc.
ADD COLUMN IF NOT EXISTS cantidad_minima NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS cantidad_maxima NUMERIC,
ADD COLUMN IF NOT EXISTS id_empresa BIGINT REFERENCES empresa(id),
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN multiprecios.nombre IS 'Nombre del nivel de precio (Minorista, Mayoreo, etc.)';
COMMENT ON COLUMN multiprecios.cantidad_minima IS 'Cantidad mínima para aplicar este precio';
COMMENT ON COLUMN multiprecios.cantidad_maxima IS 'Cantidad máxima (NULL = sin límite)';

-- Agregar columna a productos para indicar si maneja multiprecios
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS maneja_multiprecios BOOLEAN DEFAULT false;

COMMENT ON COLUMN productos.maneja_multiprecios IS 'True si el producto tiene precios por volumen configurados';

-- Índices para multiprecios
CREATE INDEX IF NOT EXISTS idx_multiprecios_producto ON multiprecios(id_producto);
CREATE INDEX IF NOT EXISTS idx_multiprecios_empresa ON multiprecios(id_empresa);

-- Función para obtener precio según cantidad
CREATE OR REPLACE FUNCTION obtener_precio_por_cantidad(
    _id_producto BIGINT,
    _cantidad NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    v_precio NUMERIC;
    v_precio_base NUMERIC;
BEGIN
    -- Primero intentar obtener precio por cantidad de multiprecios
    SELECT precio_venta INTO v_precio
    FROM multiprecios
    WHERE id_producto = _id_producto
      AND COALESCE(activo, true) = true
      AND _cantidad >= COALESCE(cantidad_minima, 1)
      AND (_cantidad <= cantidad_maxima OR cantidad_maxima IS NULL)
    ORDER BY cantidad_minima DESC
    LIMIT 1;
    
    -- Si no hay multiprecio, usar precio base del producto
    IF v_precio IS NULL THEN
        SELECT precio_venta INTO v_precio
        FROM productos
        WHERE id = _id_producto;
    END IF;
    
    RETURN COALESCE(v_precio, 0);
END;
$$ LANGUAGE plpgsql;

-- Función para gestionar multiprecios de un producto
CREATE OR REPLACE FUNCTION gestionar_multiprecios(
    _id_producto BIGINT,
    _id_empresa BIGINT,
    _precios JSONB -- [{nombre: "Mayoreo", precio_venta: 10.00, cantidad_minima: 12, cantidad_maxima: 50}, ...]
) RETURNS JSONB AS $$
DECLARE
    v_precio JSONB;
    v_count INTEGER := 0;
BEGIN
    -- Desactivar precios anteriores
    UPDATE multiprecios SET activo = false WHERE id_producto = _id_producto;
    
    -- Insertar nuevos precios
    FOR v_precio IN SELECT * FROM jsonb_array_elements(_precios) LOOP
        INSERT INTO multiprecios (
            id_producto, id_empresa, nombre, precio_venta, 
            cantidad_minima, cantidad_maxima, cantidad, activo
        ) VALUES (
            _id_producto,
            _id_empresa,
            v_precio->>'nombre',
            (v_precio->>'precio_venta')::NUMERIC,
            COALESCE((v_precio->>'cantidad_minima')::NUMERIC, 1),
            (v_precio->>'cantidad_maxima')::NUMERIC,
            COALESCE((v_precio->>'cantidad_minima')::NUMERIC, 1), -- Para compatibilidad
            true
        );
        v_count := v_count + 1;
    END LOOP;
    
    -- Actualizar flag en producto
    UPDATE productos SET maneja_multiprecios = (v_count > 0) WHERE id = _id_producto;
    
    RETURN jsonb_build_object(
        'exito', true,
        'precios_configurados', v_count,
        'mensaje', 'Multiprecios configurados correctamente'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener todos los precios de un producto
CREATE OR REPLACE FUNCTION obtener_multiprecios_producto(_id_producto BIGINT)
RETURNS TABLE (
    id BIGINT,
    nombre VARCHAR,
    precio_venta NUMERIC,
    cantidad_minima NUMERIC,
    cantidad_maxima NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.nombre,
        m.precio_venta,
        m.cantidad_minima,
        m.cantidad_maxima
    FROM multiprecios m
    WHERE m.id_producto = _id_producto
      AND COALESCE(m.activo, true) = true
    ORDER BY m.cantidad_minima ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 4: PRODUCTOS COMPUESTOS (Kits/Combos)
-- =====================================================

-- Tabla de productos compuestos
CREATE TABLE IF NOT EXISTS productos_compuestos (
    id BIGSERIAL PRIMARY KEY,
    id_producto_compuesto BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    id_producto_componente BIGINT NOT NULL REFERENCES productos(id),
    cantidad NUMERIC NOT NULL DEFAULT 1,
    es_obligatorio BOOLEAN DEFAULT true,
    precio_especial NUMERIC, -- NULL = usar precio del componente
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_producto_compuesto, id_producto_componente)
);

COMMENT ON TABLE productos_compuestos IS 'Componentes de productos compuestos (kits, combos)';
COMMENT ON COLUMN productos_compuestos.es_obligatorio IS 'Si es false, es un componente opcional del kit';
COMMENT ON COLUMN productos_compuestos.precio_especial IS 'Precio especial del componente en el kit';

-- Agregar columna a productos para identificar compuestos
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS es_compuesto BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tipo_compuesto VARCHAR(20); -- 'kit', 'combo', 'pack'

COMMENT ON COLUMN productos.es_compuesto IS 'True si es un producto compuesto (kit/combo)';
COMMENT ON COLUMN productos.tipo_compuesto IS 'Tipo: kit (fijo), combo (configurable), pack';

-- Índices para productos compuestos
CREATE INDEX IF NOT EXISTS idx_productos_compuestos_padre ON productos_compuestos(id_producto_compuesto);
CREATE INDEX IF NOT EXISTS idx_productos_compuestos_componente ON productos_compuestos(id_producto_componente);

-- Función para crear producto compuesto
CREATE OR REPLACE FUNCTION crear_producto_compuesto(
    _nombre TEXT,
    _precio_venta NUMERIC,
    _id_categoria BIGINT,
    _id_empresa BIGINT,
    _tipo_compuesto VARCHAR(20),
    _componentes JSONB -- [{id_producto: 1, cantidad: 2, es_obligatorio: true}, ...]
) RETURNS JSONB AS $$
DECLARE
    v_id_compuesto BIGINT;
    v_componente JSONB;
    v_count INTEGER := 0;
    v_costo_total NUMERIC := 0;
    v_precio_componente NUMERIC;
BEGIN
    -- Crear el producto compuesto
    INSERT INTO productos (
        nombre, precio_venta, precio_compra, id_categoria, id_empresa,
        es_compuesto, tipo_compuesto, maneja_inventarios, activo
    ) VALUES (
        _nombre,
        _precio_venta,
        0, -- Se calculará después
        _id_categoria,
        _id_empresa,
        true,
        _tipo_compuesto,
        false, -- Los compuestos no manejan inventario propio
        true
    )
    RETURNING id INTO v_id_compuesto;
    
    -- Agregar componentes
    FOR v_componente IN SELECT * FROM jsonb_array_elements(_componentes) LOOP
        -- Obtener precio de compra del componente
        SELECT precio_compra INTO v_precio_componente
        FROM productos WHERE id = (v_componente->>'id_producto')::BIGINT;
        
        v_costo_total := v_costo_total + (COALESCE(v_precio_componente, 0) * COALESCE((v_componente->>'cantidad')::NUMERIC, 1));
        
        INSERT INTO productos_compuestos (
            id_producto_compuesto, id_producto_componente, cantidad, es_obligatorio, precio_especial
        ) VALUES (
            v_id_compuesto,
            (v_componente->>'id_producto')::BIGINT,
            COALESCE((v_componente->>'cantidad')::NUMERIC, 1),
            COALESCE((v_componente->>'es_obligatorio')::BOOLEAN, true),
            (v_componente->>'precio_especial')::NUMERIC
        );
        v_count := v_count + 1;
    END LOOP;
    
    -- Actualizar costo del compuesto
    UPDATE productos SET precio_compra = v_costo_total WHERE id = v_id_compuesto;
    
    RETURN jsonb_build_object(
        'exito', true,
        'id_producto', v_id_compuesto,
        'componentes', v_count,
        'costo_calculado', v_costo_total,
        'mensaje', 'Producto compuesto creado correctamente'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener componentes de un producto compuesto
CREATE OR REPLACE FUNCTION obtener_componentes_producto(_id_producto_compuesto BIGINT)
RETURNS TABLE (
    id BIGINT,
    id_producto_componente BIGINT,
    nombre_componente TEXT,
    cantidad NUMERIC,
    es_obligatorio BOOLEAN,
    precio_unitario NUMERIC,
    precio_especial NUMERIC,
    subtotal NUMERIC,
    stock_disponible NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.id_producto_componente,
        p.nombre as nombre_componente,
        pc.cantidad,
        pc.es_obligatorio,
        p.precio_venta as precio_unitario,
        pc.precio_especial,
        COALESCE(pc.precio_especial, p.precio_venta) * pc.cantidad as subtotal,
        COALESCE((SELECT SUM(s.cantidad) FROM stock s WHERE s.id_producto = p.id), 0) as stock_disponible
    FROM productos_compuestos pc
    JOIN productos p ON pc.id_producto_componente = p.id
    WHERE pc.id_producto_compuesto = _id_producto_compuesto
    ORDER BY pc.es_obligatorio DESC, p.nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para validar stock de producto compuesto
CREATE OR REPLACE FUNCTION validar_stock_compuesto(
    _id_producto_compuesto BIGINT,
    _id_almacen BIGINT,
    _cantidad_requerida NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_componente RECORD;
    v_stock_disponible NUMERIC;
    v_puede_vender BOOLEAN := true;
    v_cantidad_maxima NUMERIC := 999999;
    v_faltantes JSONB := '[]'::jsonb;
BEGIN
    FOR v_componente IN 
        SELECT pc.*, p.nombre as nombre_componente
        FROM productos_compuestos pc
        JOIN productos p ON pc.id_producto_componente = p.id
        WHERE pc.id_producto_compuesto = _id_producto_compuesto
          AND pc.es_obligatorio = true
    LOOP
        -- Verificar stock de cada componente
        SELECT COALESCE(cantidad, 0) INTO v_stock_disponible
        FROM stock
        WHERE id_producto = v_componente.id_producto_componente
          AND id_almacen = _id_almacen;
        
        -- Calcular cuántos kits se pueden hacer con este componente
        IF v_componente.cantidad > 0 THEN
            v_cantidad_maxima := LEAST(v_cantidad_maxima, FLOOR(v_stock_disponible / v_componente.cantidad));
        END IF;
        
        -- Verificar si hay suficiente stock
        IF v_stock_disponible < (v_componente.cantidad * _cantidad_requerida) THEN
            v_puede_vender := false;
            v_faltantes := v_faltantes || jsonb_build_object(
                'producto', v_componente.nombre_componente,
                'requerido', v_componente.cantidad * _cantidad_requerida,
                'disponible', v_stock_disponible
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'puede_vender', v_puede_vender,
        'cantidad_maxima_disponible', v_cantidad_maxima,
        'faltantes', v_faltantes
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 5: NÚMEROS DE SERIE (Seriales)
-- =====================================================

-- Tabla de productos serializados
CREATE TABLE IF NOT EXISTS producto_seriales (
    id BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL REFERENCES productos(id),
    numero_serie VARCHAR(100) NOT NULL,
    estado VARCHAR(20) DEFAULT 'disponible', -- disponible, vendido, defectuoso, en_garantia
    id_almacen BIGINT REFERENCES almacen(id),
    
    -- Trazabilidad de compra
    fecha_ingreso TIMESTAMPTZ DEFAULT NOW(),
    id_proveedor BIGINT REFERENCES clientes_proveedores(id),
    costo_unitario NUMERIC,
    numero_factura_compra VARCHAR(50),
    
    -- Trazabilidad de venta
    fecha_venta TIMESTAMPTZ,
    id_venta BIGINT REFERENCES ventas(id),
    id_cliente BIGINT REFERENCES clientes_proveedores(id),
    
    -- Garantía
    fecha_fin_garantia DATE,
    notas TEXT,
    
    -- Metadata
    id_empresa BIGINT NOT NULL REFERENCES empresa(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(numero_serie, id_empresa)
);

COMMENT ON TABLE producto_seriales IS 'Tracking de números de serie para productos individuales';

-- Agregar columna a productos para indicar si maneja seriales
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS maneja_seriales BOOLEAN DEFAULT false;

COMMENT ON COLUMN productos.maneja_seriales IS 'True si el producto requiere número de serie';

-- Índices para seriales
CREATE INDEX IF NOT EXISTS idx_seriales_producto ON producto_seriales(id_producto);
CREATE INDEX IF NOT EXISTS idx_seriales_numero ON producto_seriales(numero_serie);
CREATE INDEX IF NOT EXISTS idx_seriales_estado ON producto_seriales(estado);
CREATE INDEX IF NOT EXISTS idx_seriales_almacen ON producto_seriales(id_almacen);
CREATE INDEX IF NOT EXISTS idx_seriales_empresa ON producto_seriales(id_empresa);

-- Función para registrar serial en ingreso
CREATE OR REPLACE FUNCTION registrar_serial_ingreso(
    _id_producto BIGINT,
    _numero_serie VARCHAR(100),
    _id_almacen BIGINT,
    _id_empresa BIGINT,
    _id_proveedor BIGINT DEFAULT NULL,
    _costo_unitario NUMERIC DEFAULT NULL,
    _numero_factura VARCHAR(50) DEFAULT NULL,
    _fecha_fin_garantia DATE DEFAULT NULL,
    _notas TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_id_serial BIGINT;
BEGIN
    -- Verificar que el producto maneja seriales
    IF NOT EXISTS (SELECT 1 FROM productos WHERE id = _id_producto AND maneja_seriales = true) THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Este producto no maneja números de serie');
    END IF;
    
    -- Verificar que el serial no exista
    IF EXISTS (SELECT 1 FROM producto_seriales WHERE numero_serie = _numero_serie AND id_empresa = _id_empresa) THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'El número de serie ya existe en el sistema');
    END IF;
    
    -- Insertar serial
    INSERT INTO producto_seriales (
        id_producto, numero_serie, id_almacen, id_empresa,
        id_proveedor, costo_unitario, numero_factura_compra,
        fecha_fin_garantia, notas, estado
    ) VALUES (
        _id_producto, _numero_serie, _id_almacen, _id_empresa,
        _id_proveedor, _costo_unitario, _numero_factura,
        _fecha_fin_garantia, _notas, 'disponible'
    )
    RETURNING id INTO v_id_serial;
    
    RETURN jsonb_build_object(
        'exito', true,
        'id_serial', v_id_serial,
        'mensaje', 'Serial registrado correctamente'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para registrar múltiples seriales
CREATE OR REPLACE FUNCTION registrar_seriales_lote(
    _id_producto BIGINT,
    _seriales TEXT[], -- Array de números de serie
    _id_almacen BIGINT,
    _id_empresa BIGINT,
    _id_proveedor BIGINT DEFAULT NULL,
    _costo_unitario NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_serial TEXT;
    v_insertados INTEGER := 0;
    v_duplicados TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH v_serial IN ARRAY _seriales LOOP
        -- Intentar insertar cada serial
        BEGIN
            INSERT INTO producto_seriales (
                id_producto, numero_serie, id_almacen, id_empresa,
                id_proveedor, costo_unitario, estado
            ) VALUES (
                _id_producto, v_serial, _id_almacen, _id_empresa,
                _id_proveedor, _costo_unitario, 'disponible'
            );
            v_insertados := v_insertados + 1;
        EXCEPTION WHEN unique_violation THEN
            v_duplicados := array_append(v_duplicados, v_serial);
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'exito', true,
        'insertados', v_insertados,
        'duplicados', v_duplicados,
        'mensaje', v_insertados || ' seriales registrados, ' || array_length(v_duplicados, 1) || ' duplicados ignorados'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para vender serial
CREATE OR REPLACE FUNCTION vender_serial(
    _numero_serie VARCHAR(100),
    _id_empresa BIGINT,
    _id_venta BIGINT,
    _id_cliente BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_serial RECORD;
BEGIN
    -- Buscar el serial
    SELECT * INTO v_serial
    FROM producto_seriales
    WHERE numero_serie = _numero_serie
      AND id_empresa = _id_empresa
      AND estado = 'disponible';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Serial no encontrado o no disponible');
    END IF;
    
    -- Actualizar estado
    UPDATE producto_seriales
    SET estado = 'vendido',
        fecha_venta = NOW(),
        id_venta = _id_venta,
        id_cliente = _id_cliente,
        updated_at = NOW()
    WHERE id = v_serial.id;
    
    RETURN jsonb_build_object(
        'exito', true,
        'id_serial', v_serial.id,
        'id_producto', v_serial.id_producto,
        'mensaje', 'Serial vendido correctamente'
    );
END;
$$ LANGUAGE plpgsql;

-- Función para buscar serial
CREATE OR REPLACE FUNCTION buscar_serial(
    _numero_serie VARCHAR(100),
    _id_empresa BIGINT
) RETURNS JSONB AS $$
DECLARE
    v_serial RECORD;
BEGIN
    SELECT 
        ps.*,
        p.nombre as nombre_producto,
        a.nombre as nombre_almacen,
        prov.nombre as nombre_proveedor,
        cli.nombre as nombre_cliente,
        v.fecha as fecha_venta_registro
    INTO v_serial
    FROM producto_seriales ps
    LEFT JOIN productos p ON ps.id_producto = p.id
    LEFT JOIN almacen a ON ps.id_almacen = a.id
    LEFT JOIN clientes_proveedores prov ON ps.id_proveedor = prov.id
    LEFT JOIN clientes_proveedores cli ON ps.id_cliente = cli.id
    LEFT JOIN ventas v ON ps.id_venta = v.id
    WHERE ps.numero_serie = _numero_serie
      AND ps.id_empresa = _id_empresa;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('encontrado', false, 'mensaje', 'Serial no encontrado');
    END IF;
    
    RETURN jsonb_build_object(
        'encontrado', true,
        'serial', row_to_json(v_serial)
    );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener seriales disponibles de un producto
CREATE OR REPLACE FUNCTION obtener_seriales_disponibles(
    _id_producto BIGINT,
    _id_almacen BIGINT DEFAULT NULL
) RETURNS TABLE (
    id BIGINT,
    numero_serie VARCHAR,
    fecha_ingreso TIMESTAMPTZ,
    costo_unitario NUMERIC,
    dias_en_stock INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.numero_serie,
        ps.fecha_ingreso,
        ps.costo_unitario,
        EXTRACT(DAY FROM NOW() - ps.fecha_ingreso)::INTEGER as dias_en_stock
    FROM producto_seriales ps
    WHERE ps.id_producto = _id_producto
      AND ps.estado = 'disponible'
      AND (_id_almacen IS NULL OR ps.id_almacen = _id_almacen)
    ORDER BY ps.fecha_ingreso ASC; -- FIFO
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 6: VISTAS DE CONSULTA
-- =====================================================

-- Vista de productos con toda la información extendida
CREATE OR REPLACE VIEW vista_productos_completos AS
SELECT 
    p.id,
    p.nombre,
    p.precio_venta,
    p.precio_compra,
    p.id_categoria,
    c.nombre as categoria,
    c.id_categoria_padre,
    cp.nombre as categoria_padre,
    p.codigo_barras,
    p.codigo_interno,
    p.id_empresa,
    p.sevende_por,
    p.maneja_inventarios,
    p.maneja_multiprecios,
    p.maneja_seriales,
    p.es_compuesto,
    p.tipo_compuesto,
    p.tiene_variantes,
    p.es_producto_padre,
    p.id_producto_padre,
    pp.nombre as nombre_producto_padre,
    COALESCE(p.activo, true) as activo,
    -- Contadores
    (SELECT COUNT(*) FROM productos_compuestos pc WHERE pc.id_producto_compuesto = p.id) as cantidad_componentes,
    (SELECT COUNT(*) FROM productos v WHERE v.id_producto_padre = p.id AND COALESCE(v.activo, true)) as cantidad_variantes,
    (SELECT COUNT(*) FROM multiprecios m WHERE m.id_producto = p.id AND COALESCE(m.activo, true)) as cantidad_precios,
    (SELECT COUNT(*) FROM producto_seriales ps WHERE ps.id_producto = p.id AND ps.estado = 'disponible') as seriales_disponibles
FROM productos p
LEFT JOIN categorias c ON p.id_categoria = c.id
LEFT JOIN categorias cp ON c.id_categoria_padre = cp.id
LEFT JOIN productos pp ON p.id_producto_padre = pp.id;

-- =====================================================
-- PARTE 7: FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para clonar producto con variantes
CREATE OR REPLACE FUNCTION clonar_producto(
    _id_producto BIGINT,
    _nuevo_nombre TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_producto RECORD;
    v_nuevo_id BIGINT;
BEGIN
    SELECT * INTO v_producto FROM productos WHERE id = _id_producto;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'mensaje', 'Producto no encontrado');
    END IF;
    
    INSERT INTO productos (
        nombre, precio_venta, precio_compra, id_categoria, id_empresa,
        sevende_por, maneja_inventarios, maneja_multiprecios, maneja_seriales,
        activo
    ) VALUES (
        COALESCE(_nuevo_nombre, v_producto.nombre || ' (copia)'),
        v_producto.precio_venta,
        v_producto.precio_compra,
        v_producto.id_categoria,
        v_producto.id_empresa,
        v_producto.sevende_por,
        v_producto.maneja_inventarios,
        v_producto.maneja_multiprecios,
        v_producto.maneja_seriales,
        true
    )
    RETURNING id INTO v_nuevo_id;
    
    -- Clonar multiprecios si existen
    INSERT INTO multiprecios (id_producto, id_empresa, nombre, precio_venta, cantidad_minima, cantidad_maxima, cantidad, activo)
    SELECT v_nuevo_id, id_empresa, nombre, precio_venta, cantidad_minima, cantidad_maxima, cantidad, true
    FROM multiprecios WHERE id_producto = _id_producto AND COALESCE(activo, true);
    
    RETURN jsonb_build_object(
        'exito', true,
        'id_producto', v_nuevo_id,
        'mensaje', 'Producto clonado correctamente'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS PARA RLS
-- =====================================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE atributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atributo_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_compuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_seriales ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
-- Primero eliminar si existen para evitar error de duplicado
DROP POLICY IF EXISTS "atributos_empresa" ON atributos;
DROP POLICY IF EXISTS "atributo_valores_all" ON atributo_valores;
DROP POLICY IF EXISTS "producto_variantes_all" ON producto_variantes;
DROP POLICY IF EXISTS "productos_compuestos_all" ON productos_compuestos;
DROP POLICY IF EXISTS "producto_seriales_empresa" ON producto_seriales;

-- Crear políticas
CREATE POLICY "atributos_empresa" ON atributos FOR ALL USING (true);
CREATE POLICY "atributo_valores_all" ON atributo_valores FOR ALL USING (true);
CREATE POLICY "producto_variantes_all" ON producto_variantes FOR ALL USING (true);
CREATE POLICY "productos_compuestos_all" ON productos_compuestos FOR ALL USING (true);
CREATE POLICY "producto_seriales_empresa" ON producto_seriales FOR ALL USING (true);

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
COMMENT ON FUNCTION obtener_categorias_jerarquicas IS 'Obtiene categorías con estructura jerárquica';
COMMENT ON FUNCTION crear_variante_producto IS 'Crea una variante de producto con atributos';
COMMENT ON FUNCTION obtener_precio_por_cantidad IS 'Calcula precio según cantidad (multiprecios)';
COMMENT ON FUNCTION crear_producto_compuesto IS 'Crea un kit/combo con sus componentes';
COMMENT ON FUNCTION registrar_serial_ingreso IS 'Registra un número de serie al ingresar stock';
