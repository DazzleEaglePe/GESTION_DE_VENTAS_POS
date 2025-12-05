import { supabase } from "../index";

/**
 * Obtener precio según cantidad (para ventas)
 */
export async function ObtenerPrecioPorCantidad(p) {
  const { data, error } = await supabase.rpc("obtener_precio_por_cantidad", {
    _id_producto: p.id_producto,
    _cantidad: p.cantidad,
  });

  if (error) {
    throw new Error("Error al obtener precio: " + error.message);
  }

  return data;
}

/**
 * Gestionar multiprecios de un producto
 */
export async function GestionarMultiprecios(p) {
  const { data, error } = await supabase.rpc("gestionar_multiprecios", {
    _id_producto: p.id_producto,
    _id_empresa: p.id_empresa,
    _precios: p.precios, // [{nombre: "Mayoreo", precio_venta: 10.00, cantidad_minima: 12}, ...]
  });

  if (error) {
    throw new Error("Error al gestionar precios: " + error.message);
  }

  return data;
}

/**
 * Obtener multiprecios de un producto
 */
export async function ObtenerMultipreciosProducto(p) {
  const { data, error } = await supabase.rpc("obtener_multiprecios_producto", {
    _id_producto: p.id_producto,
  });

  if (error) {
    throw new Error("Error al obtener precios: " + error.message);
  }

  return data || [];
}

/**
 * Insertar un precio individual
 */
export async function InsertarMultiprecio(p) {
  const { data, error } = await supabase
    .from("multiprecios")
    .insert({
      id_producto: p.id_producto,
      id_empresa: p.id_empresa,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      cantidad_minima: p.cantidad_minima || 1,
      cantidad_maxima: p.cantidad_maxima || null,
      cantidad: p.cantidad_minima || 1, // Para compatibilidad
      activo: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error("Error al insertar precio: " + error.message);
  }

  return data;
}

/**
 * Editar un multiprecio
 */
export async function EditarMultiprecio(p) {
  const { error } = await supabase
    .from("multiprecios")
    .update({
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      cantidad_minima: p.cantidad_minima,
      cantidad_maxima: p.cantidad_maxima,
      cantidad: p.cantidad_minima, // Para compatibilidad
    })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al editar precio: " + error.message);
  }

  return { exito: true };
}

/**
 * Eliminar un multiprecio
 */
export async function EliminarMultiprecio(p) {
  const { error } = await supabase
    .from("multiprecios")
    .update({ activo: false })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al eliminar precio: " + error.message);
  }

  return { exito: true };
}

/**
 * Obtener productos con multiprecios
 */
export async function ObtenerProductosConMultiprecios(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      precio_venta,
      precio_compra,
      codigo_barras,
      maneja_multiprecios,
      categorias (nombre)
    `)
    .eq("id_empresa", p.id_empresa)
    .eq("maneja_multiprecios", true)
    .eq("activo", true)
    .order("nombre");

  if (error) {
    throw new Error("Error al obtener productos: " + error.message);
  }

  return data || [];
}

/**
 * Activar/Desactivar multiprecios para un producto
 */
export async function ToggleMultipreciosProducto(p) {
  const { error } = await supabase
    .from("productos")
    .update({ maneja_multiprecios: p.activo })
    .eq("id", p.id_producto);

  if (error) {
    throw new Error("Error al actualizar producto: " + error.message);
  }

  return { exito: true };
}

/**
 * Plantillas de precios predefinidas
 */
export const PLANTILLAS_PRECIOS = [
  {
    nombre: "Minorista",
    descripcion: "Precio unitario estándar",
    cantidad_minima: 1,
    cantidad_maxima: 5,
    porcentaje_descuento: 0,
  },
  {
    nombre: "Medio Mayoreo",
    descripcion: "Compras de 6-11 unidades",
    cantidad_minima: 6,
    cantidad_maxima: 11,
    porcentaje_descuento: 5,
  },
  {
    nombre: "Mayoreo",
    descripcion: "Compras de 12+ unidades",
    cantidad_minima: 12,
    cantidad_maxima: null,
    porcentaje_descuento: 10,
  },
];

/**
 * Generar precios automáticos basados en plantilla
 */
export function generarPreciosAutomaticos(precioBase, plantillas = PLANTILLAS_PRECIOS) {
  return plantillas.map((plantilla) => ({
    nombre: plantilla.nombre,
    precio_venta: precioBase * (1 - plantilla.porcentaje_descuento / 100),
    cantidad_minima: plantilla.cantidad_minima,
    cantidad_maxima: plantilla.cantidad_maxima,
  }));
}
