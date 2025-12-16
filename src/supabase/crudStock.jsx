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
  const { data, error } = await supabase
    .from(tabla)
    .select(`
      id,
      stock,
      id_almacen,
      id_producto,
      almacen(
        id,
        nombre,
        id_sucursal,
        sucursales(id, nombre)
      )
    `)
    .eq("id_producto", p.id_producto)
    .gt("stock", 0);
  
  if (error) {
    console.error("Error buscando stock en almacenes:", error);
    return [];
  }
  
  return data || [];
}

// Nueva función para obtener stock total de un producto en todos los almacenes
export async function MostrarStockTotalXProducto(p) {
  const { data } = await supabase
    .from(tabla)
    .select(`stock, almacen(nombre, sucursales(nombre))`)
    .eq("id_producto", p.id_producto);
  return data;
}

// Obtener productos con stock disponible en un almacén específico
export async function MostrarProductosConStockEnAlmacen(p) {
  const { data, error } = await supabase
    .from(tabla)
    .select(`
      id,
      stock,
      id_producto,
      productos(
        id,
        nombre,
        codigo_barras,
        precio_venta,
        activo
      )
    `)
    .eq("id_almacen", p.id_almacen)
    .gt("stock", 0);
  
  if (error) {
    console.error("Error obteniendo productos con stock:", error);
    return [];
  }
  
  // Filtrar solo productos activos y mapear la estructura
  return (data || [])
    .filter(item => item.productos?.activo === true)
    .map(item => ({
      id: item.productos.id,
      nombre: item.productos.nombre,
      codigo_barras: item.productos.codigo_barras,
      precio_venta: item.productos.precio_venta,
      stock_disponible: item.stock,
    }));
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
