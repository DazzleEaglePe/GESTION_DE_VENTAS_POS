import { supabase } from "../index";

/**
 * Crear producto compuesto (kit/combo)
 */
export async function CrearProductoCompuesto(p) {
  const { data, error } = await supabase.rpc("crear_producto_compuesto", {
    _nombre: p.nombre,
    _precio_venta: p.precio_venta,
    _id_categoria: p.id_categoria || null,
    _id_empresa: p.id_empresa,
    _tipo_compuesto: p.tipo_compuesto || "kit",
    _componentes: p.componentes, // [{id_producto: 1, cantidad: 2, es_obligatorio: true}, ...]
  });

  if (error) {
    throw new Error("Error al crear producto compuesto: " + error.message);
  }

  return data;
}

/**
 * Obtener componentes de un producto compuesto
 */
export async function ObtenerComponentesProducto(p) {
  const { data, error } = await supabase.rpc("obtener_componentes_producto", {
    _id_producto_compuesto: p.id_producto,
  });

  if (error) {
    throw new Error("Error al obtener componentes: " + error.message);
  }

  return data || [];
}

/**
 * Validar stock de producto compuesto
 */
export async function ValidarStockCompuesto(p) {
  const { data, error } = await supabase.rpc("validar_stock_compuesto", {
    _id_producto_compuesto: p.id_producto,
    _id_almacen: p.id_almacen,
    _cantidad_requerida: p.cantidad,
  });

  if (error) {
    throw new Error("Error al validar stock: " + error.message);
  }

  return data;
}

/**
 * Agregar componente a producto compuesto
 */
export async function AgregarComponente(p) {
  const { data, error } = await supabase
    .from("productos_compuestos")
    .insert({
      id_producto_compuesto: p.id_producto_compuesto,
      id_producto_componente: p.id_producto_componente,
      cantidad: p.cantidad || 1,
      es_obligatorio: p.es_obligatorio !== false,
      precio_especial: p.precio_especial || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Este producto ya es componente del kit");
    }
    throw new Error("Error al agregar componente: " + error.message);
  }

  return data;
}

/**
 * Editar componente
 */
export async function EditarComponente(p) {
  const { error } = await supabase
    .from("productos_compuestos")
    .update({
      cantidad: p.cantidad,
      es_obligatorio: p.es_obligatorio,
      precio_especial: p.precio_especial,
    })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al editar componente: " + error.message);
  }

  return { exito: true };
}

/**
 * Eliminar componente
 */
export async function EliminarComponente(p) {
  const { error } = await supabase
    .from("productos_compuestos")
    .delete()
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al eliminar componente: " + error.message);
  }

  return { exito: true };
}

/**
 * Obtener productos compuestos de la empresa
 */
export async function ObtenerProductosCompuestos(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      precio_venta,
      precio_compra,
      codigo_barras,
      tipo_compuesto,
      categorias (nombre)
    `)
    .eq("id_empresa", p.id_empresa)
    .eq("es_compuesto", true)
    .eq("activo", true)
    .order("nombre");

  if (error) {
    throw new Error("Error al obtener productos: " + error.message);
  }

  return data || [];
}

/**
 * Calcular precio sugerido del compuesto
 */
export async function CalcularPrecioCompuesto(componentes) {
  let costoTotal = 0;
  let precioSugeridoTotal = 0;

  for (const comp of componentes) {
    costoTotal += (comp.precio_compra || 0) * comp.cantidad;
    precioSugeridoTotal += (comp.precio_venta || 0) * comp.cantidad;
  }

  return {
    costo_total: costoTotal,
    precio_sugerido: precioSugeridoTotal,
    margen_sugerido: precioSugeridoTotal - costoTotal,
  };
}

/**
 * Obtener productos disponibles para ser componentes
 */
export async function ObtenerProductosParaComponentes(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, precio_venta, precio_compra, codigo_barras")
    .eq("id_empresa", p.id_empresa)
    .eq("es_compuesto", false) // No puede ser un kit dentro de otro kit
    .eq("activo", true)
    .order("nombre");

  if (error) {
    throw new Error("Error al obtener productos: " + error.message);
  }

  return data || [];
}

/**
 * Duplicar producto compuesto
 */
export async function DuplicarProductoCompuesto(p) {
  // Obtener el producto original
  const { data: original, error: errorOriginal } = await supabase
    .from("productos")
    .select("*")
    .eq("id", p.id_producto)
    .single();

  if (errorOriginal) throw new Error("Error al obtener producto: " + errorOriginal.message);

  // Obtener componentes
  const componentes = await ObtenerComponentesProducto({ id_producto: p.id_producto });

  // Crear el nuevo producto compuesto
  const resultado = await CrearProductoCompuesto({
    nombre: p.nuevo_nombre || original.nombre + " (copia)",
    precio_venta: original.precio_venta,
    id_categoria: original.id_categoria,
    id_empresa: original.id_empresa,
    tipo_compuesto: original.tipo_compuesto,
    componentes: componentes.map((c) => ({
      id_producto: c.id_producto_componente,
      cantidad: c.cantidad,
      es_obligatorio: c.es_obligatorio,
      precio_especial: c.precio_especial,
    })),
  });

  return resultado;
}

// Tipos de productos compuestos
export const TIPOS_COMPUESTO = [
  { valor: "kit", nombre: "Kit", descripcion: "Conjunto fijo de productos" },
  { valor: "combo", nombre: "Combo", descripcion: "Combinación con opciones" },
  { valor: "pack", nombre: "Pack", descripcion: "Paquete promocional" },
];
