import { supabase } from "./supabase.config";

const tabla = "stock";

/**
 * Obtiene o crea un registro de stock si no existe
 * @returns {Promise<number>} ID del stock
 */
export async function ObtenerOCrearStock(p) {
  const { data, error } = await supabase.rpc("obtener_o_crear_stock", {
    p_id_almacen: p.id_almacen,
    p_id_producto: p.id_producto,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

export async function InsertarStock(p) {
  const { error } = await supabase.from(tabla).insert(p);
  if (error) {
    throw new Error(error.message);
  }
}

export async function EditarStock(p, tipo) {
  const { error } = await supabase.rpc(
    tipo === "ingreso" ? "incrementarstock": "reducirstock",p
  );
  if (error) {
    throw new Error(error.message);
  }
}
export async function MostrarStockXAlmacenYProducto(p) {
  const { data } = await supabase
    .from(tabla)
    .select()
    .eq("id_almacen", p.id_almacen)
    .eq("id_producto", p.id_producto)
    .maybeSingle();
  return data;
}
// Buscar stock en TODOS los almacenes que tengan el producto (para mostrar alternativas)
export async function MostrarStockXAlmacenesYProducto(p) {
  const { data } = await supabase
    .from(tabla)
    .select(`*, almacen(*, sucursales(*))`)
    .eq("id_producto", p.id_producto)
    .gt("stock", 0);
  return data;
}

// Nueva función para obtener stock total de un producto en todos los almacenes
export async function MostrarStockTotalXProducto(p) {
  const { data } = await supabase
    .from(tabla)
    .select(`stock, almacen(nombre, sucursales(nombre))`)
    .eq("id_producto", p.id_producto);
  return data;
}

/**
 * Registra un movimiento de stock de forma atómica
 * Incluye: inserción de movimiento, actualización de stock y precios
 * Todo en una sola transacción para evitar inconsistencias
 */
export async function RegistrarMovimientoAtomico(p) {
  const { error } = await supabase.rpc("registrar_movimiento_atomico", {
    p_movimiento: p.movimiento,
    p_tipo: p.tipo,
    p_id_stock: p.id_stock,
    p_cantidad: p.cantidad,
    p_precio_compra: p.precio_compra,
    p_precio_venta: p.precio_venta,
    p_id_producto: p.id_producto,
  });
  
  if (error) {
    throw new Error(error.message);
  }
}
