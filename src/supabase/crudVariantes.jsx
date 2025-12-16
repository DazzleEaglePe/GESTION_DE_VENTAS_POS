import { supabase } from "../index";

// =====================================================
// ATRIBUTOS
// =====================================================

/**
 * Obtener atributos de la empresa
 */
export async function ObtenerAtributos(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase
    .from("atributos")
    .select(`
      *,
      atributo_valores (*)
    `)
    .eq("id_empresa", p.id_empresa)
    .eq("activo", true)
    .order("nombre");

  if (error) {
    throw new Error("Error al obtener atributos: " + error.message);
  }

  return data || [];
}

/**
 * Crear atributo con valores
 */
export async function CrearAtributoConValores(p) {
  const { data, error } = await supabase.rpc("crear_atributo_con_valores", {
    _nombre: p.nombre,
    _tipo: p.tipo || "texto",
    _id_empresa: p.id_empresa,
    _valores: p.valores,
  });

  if (error) {
    throw new Error("Error al crear atributo: " + error.message);
  }

  return data;
}

/**
 * Agregar valor a un atributo existente
 */
export async function AgregarValorAtributo(p) {
  const { data, error } = await supabase
    .from("atributo_valores")
    .insert({
      id_atributo: p.id_atributo,
      valor: p.valor,
      valor_visual: p.valor_visual || null,
      orden: p.orden || 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error("Error al agregar valor: " + error.message);
  }

  return data;
}

/**
 * Eliminar atributo (soft delete)
 */
export async function EliminarAtributo(p) {
  const { error } = await supabase
    .from("atributos")
    .update({ activo: false })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al eliminar atributo: " + error.message);
  }

  return { exito: true };
}

/**
 * Obtener atributos inactivos de la empresa
 */
export async function ObtenerAtributosInactivos(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase
    .from("atributos")
    .select(`
      *,
      atributo_valores (*)
    `)
    .eq("id_empresa", p.id_empresa)
    .eq("activo", false)
    .order("nombre");

  if (error) {
    throw new Error("Error al obtener atributos inactivos: " + error.message);
  }

  return data || [];
}

/**
 * Restaurar atributo
 */
export async function RestaurarAtributo(p) {
  const { error } = await supabase
    .from("atributos")
    .update({ activo: true })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al restaurar atributo: " + error.message);
  }

  return { exito: true };
}

/**
 * Editar atributo
 */
export async function EditarAtributo(p) {
  const { error } = await supabase
    .from("atributos")
    .update({ nombre: p.nombre })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al editar atributo: " + error.message);
  }

  return { exito: true };
}

/**
 * Editar valor de atributo
 */
export async function EditarValorAtributo(p) {
  const { error } = await supabase
    .from("atributo_valores")
    .update({ 
      valor: p.valor,
      valor_visual: p.valor_visual || null 
    })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al editar valor: " + error.message);
  }

  return { exito: true };
}

/**
 * Eliminar valor de atributo
 * Verifica primero si está en uso en producto_variantes
 */
export async function EliminarValorAtributo(p) {
  // Primero verificar si el valor está siendo usado en alguna variante
  const { data: enUso, error: errorVerificar } = await supabase
    .from("producto_variantes")
    .select("id")
    .eq("id_valor", p.id)
    .limit(1);

  if (errorVerificar) {
    throw new Error("Error al verificar uso del valor: " + errorVerificar.message);
  }

  if (enUso && enUso.length > 0) {
    throw new Error("No se puede eliminar: este valor está siendo usado en variantes de productos");
  }

  // Si no está en uso, eliminar físicamente
  const { error } = await supabase
    .from("atributo_valores")
    .delete()
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al eliminar valor: " + error.message);
  }

  return { exito: true };
}

// =====================================================
// VARIANTES DE PRODUCTO
// =====================================================

/**
 * Crear variante de producto
 * Crea un nuevo producto como "hijo" del producto padre con los atributos seleccionados
 */
export async function CrearVarianteProducto(p) {
  // Soportar ambos formatos de parámetros
  const idProductoPadre = p.id_producto_padre || p.id_producto;
  const atributos = p.atributos || p.atributos_valores?.map(id_valor => ({ id_valor }));
  const precioVenta = p.precio_venta || p.precio;
  const stockInicial = p.stock_inicial || p.stock || 0;
  
  // Primero obtener datos del producto padre
  const { data: productoPadre, error: errorPadre } = await supabase
    .from("productos")
    .select("*")
    .eq("id", idProductoPadre)
    .single();

  if (errorPadre) {
    throw new Error("Error al obtener producto padre: " + errorPadre.message);
  }

  // Crear el producto variante (hijo)
  const nombreVariante = p.nombre_variante 
    ? `${productoPadre.nombre} - ${p.nombre_variante}`
    : productoPadre.nombre;

  const { data: nuevaVariante, error: errorVariante } = await supabase
    .from("productos")
    .insert({
      nombre: nombreVariante,
      precio_venta: precioVenta || productoPadre.precio_venta,
      precio_compra: p.precio_compra || productoPadre.precio_compra,
      codigo_barras: p.codigo_barras || p.sku || null,
      id_categoria: productoPadre.id_categoria,
      id_empresa: productoPadre.id_empresa,
      id_producto_padre: idProductoPadre,
      activo: true,
    })
    .select("id")
    .single();

  if (errorVariante) {
    throw new Error("Error al crear variante: " + errorVariante.message);
  }

  // Asociar los atributos a la variante en la tabla producto_variantes
  if (atributos && atributos.length > 0) {
    const atributosInsert = atributos.map(attr => ({
      id_producto: nuevaVariante.id,
      id_atributo: attr.id_atributo,
      id_valor: attr.id_valor,
    }));

    const { error: errorAtributos } = await supabase
      .from("producto_variantes")
      .insert(atributosInsert);

    if (errorAtributos) {
      console.warn("Error al asociar atributos:", errorAtributos.message);
    }
  }

  // Marcar el producto padre como que tiene variantes
  await supabase
    .from("productos")
    .update({ es_producto_padre: true })
    .eq("id", idProductoPadre);

  return { 
    exito: true, 
    id_variante: nuevaVariante.id,
    mensaje: "Variante creada exitosamente" 
  };
}

/**
 * Obtener variantes de un producto
 * Busca productos que tengan id_producto_padre = id del producto seleccionado
 */
export async function ObtenerVariantesProducto(p) {
  const idProducto = p.id_producto_padre || p.id_producto || p.id;
  
  if (!idProducto) return [];

  // Buscar productos variantes (hijos) del producto padre
  const { data, error } = await supabase
    .from("productos")
    .select(`
      *,
      producto_variantes (
        id,
        id_atributo,
        id_valor,
        atributos (nombre),
        atributo_valores (valor)
      )
    `)
    .eq("id_producto_padre", idProducto)
    .eq("activo", true)
    .order("nombre");

  if (error) {
    console.warn("Error al obtener variantes:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Editar variante
 */
export async function EditarVariante(p) {
  const { error } = await supabase
    .from("productos")
    .update({
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      precio_compra: p.precio_compra,
      codigo_barras: p.codigo_barras,
    })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al editar variante: " + error.message);
  }

  return { exito: true };
}

/**
 * Eliminar variante
 */
export async function EliminarVariante(p) {
  const { error } = await supabase
    .from("productos")
    .update({ activo: false })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al eliminar variante: " + error.message);
  }

  return { exito: true };
}

/**
 * Obtener productos con variantes
 */
export async function ObtenerProductosConVariantes(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase
    .from("productos")
    .select(`
      *,
      categorias (nombre)
    `)
    .eq("id_empresa", p.id_empresa)
    .eq("tiene_variantes", true)
    .eq("activo", true)
    .order("nombre");

  if (error) {
    throw new Error("Error al obtener productos: " + error.message);
  }

  return data || [];
}

/**
 * Generar SKU para variante
 */
export function generarSKUVariante(productoBase, atributos) {
  const base = productoBase.codigo_interno || productoBase.nombre.substring(0, 3).toUpperCase();
  const sufijo = atributos.map(a => a.valor.substring(0, 2).toUpperCase()).join("-");
  return `${base}-${sufijo}`;
}
