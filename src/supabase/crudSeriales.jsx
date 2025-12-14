import { supabase } from "../index";

/**
 * Registrar serial en ingreso de stock
 */
export async function RegistrarSerialIngreso(p) {
  const { data, error } = await supabase.rpc("registrar_serial_ingreso", {
    _id_producto: p.id_producto,
    _numero_serie: p.numero_serie,
    _id_almacen: p.id_almacen,
    _id_empresa: p.id_empresa,
    _id_proveedor: p.id_proveedor || null,
    _costo_unitario: p.costo_unitario || null,
    _numero_factura: p.numero_factura || null,
    _fecha_fin_garantia: p.fecha_fin_garantia || null,
    _notas: p.notas || null,
  });

  if (error) {
    throw new Error("Error al registrar serial: " + error.message);
  }

  return data;
}

/**
 * Registrar múltiples seriales en lote
 */
export async function RegistrarSerialesLote(p) {
  const { data, error } = await supabase.rpc("registrar_seriales_lote", {
    _id_producto: p.id_producto,
    _seriales: p.seriales, // Array de strings
    _id_almacen: p.id_almacen,
    _id_empresa: p.id_empresa,
    _id_proveedor: p.id_proveedor || null,
    _costo_unitario: p.costo_unitario || null,
  });

  if (error) {
    throw new Error("Error al registrar seriales: " + error.message);
  }

  return data;
}

/**
 * Vender serial (marcar como vendido)
 */
export async function VenderSerial(p) {
  const { data, error } = await supabase.rpc("vender_serial", {
    _numero_serie: p.numero_serie,
    _id_empresa: p.id_empresa,
    _id_venta: p.id_venta,
    _id_cliente: p.id_cliente || null,
  });

  if (error) {
    throw new Error("Error al vender serial: " + error.message);
  }

  return data;
}

/**
 * Buscar serial
 */
export async function BuscarSerial(p) {
  const { data, error } = await supabase.rpc("buscar_serial", {
    _numero_serie: p.numero_serie,
    _id_empresa: p.id_empresa,
  });

  if (error) {
    throw new Error("Error al buscar serial: " + error.message);
  }

  return data;
}

/**
 * Obtener seriales disponibles de un producto
 */
export async function ObtenerSerialesDisponibles(p) {
  const { data, error } = await supabase.rpc("obtener_seriales_disponibles", {
    _id_producto: p.id_producto,
    _id_almacen: p.id_almacen || null,
  });

  if (error) {
    throw new Error("Error al obtener seriales: " + error.message);
  }

  return data || [];
}

/**
 * Obtener todos los seriales de un producto (todos los estados)
 */
export async function ObtenerTodosSerialesProducto(p) {
  const { data, error } = await supabase
    .from("producto_seriales")
    .select(`
      *,
      productos (nombre),
      almacen (nombre),
      clientes_proveedores!producto_seriales_id_proveedor_fkey (nombre),
      ventas (id, fecha)
    `)
    .eq("id_producto", p.id_producto)
    .order("fecha_ingreso", { ascending: false });

  if (error) {
    throw new Error("Error al obtener seriales: " + error.message);
  }

  return data || [];
}

/**
 * Actualizar estado de serial
 */
export async function ActualizarEstadoSerial(p) {
  const { error } = await supabase
    .from("producto_seriales")
    .update({
      estado: p.estado,
      notas: p.notas,
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.id);

  if (error) {
    throw new Error("Error al actualizar serial: " + error.message);
  }

  return { exito: true };
}

/**
 * Obtener productos que manejan seriales
 */
export async function ObtenerProductosConSeriales(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      codigo_barras,
      precio_venta,
      categorias (nombre)
    `)
    .eq("id_empresa", p.id_empresa)
    .eq("maneja_seriales", true)
    .eq("activo", true)
    .order("nombre");

  if (error) {
    throw new Error("Error al obtener productos: " + error.message);
  }

  return data || [];
}

/**
 * Activar/Desactivar seriales para un producto
 */
export async function ToggleSerialesProducto(p) {
  const { error } = await supabase
    .from("productos")
    .update({ maneja_seriales: p.activo })
    .eq("id", p.id_producto);

  if (error) {
    throw new Error("Error al actualizar producto: " + error.message);
  }

  return { exito: true };
}

/**
 * Obtener estadísticas de seriales por producto
 */
export async function ObtenerEstadisticasSeriales(p) {
  const { data, error } = await supabase
    .from("producto_seriales")
    .select("estado")
    .eq("id_producto", p.id_producto);

  if (error) {
    throw new Error("Error al obtener estadísticas: " + error.message);
  }

  const estadisticas = {
    total: data.length,
    disponible: data.filter((s) => s.estado === "disponible").length,
    vendido: data.filter((s) => s.estado === "vendido").length,
    defectuoso: data.filter((s) => s.estado === "defectuoso").length,
    en_garantia: data.filter((s) => s.estado === "en_garantia").length,
  };

  return estadisticas;
}

/**
 * Transferir serial entre almacenes
 */
export async function TransferirSerial(p) {
  const { error } = await supabase
    .from("producto_seriales")
    .update({
      id_almacen: p.id_almacen_destino,
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.id_serial);

  if (error) {
    throw new Error("Error al transferir serial: " + error.message);
  }

  return { exito: true };
}

/**
 * Generar reporte de seriales
 */
export async function GenerarReporteSeriales(p) {
  let query = supabase
    .from("producto_seriales")
    .select(`
      *,
      productos (nombre, codigo_barras),
      almacen (nombre),
      clientes_proveedores!producto_seriales_id_proveedor_fkey (nombre)
    `)
    .eq("id_empresa", p.id_empresa);

  if (p.estado) {
    query = query.eq("estado", p.estado);
  }

  if (p.id_producto) {
    query = query.eq("id_producto", p.id_producto);
  }

  if (p.id_almacen) {
    query = query.eq("id_almacen", p.id_almacen);
  }

  if (p.fecha_desde) {
    query = query.gte("fecha_ingreso", p.fecha_desde);
  }

  if (p.fecha_hasta) {
    query = query.lte("fecha_ingreso", p.fecha_hasta);
  }

  const { data, error } = await query.order("fecha_ingreso", { ascending: false });

  if (error) {
    throw new Error("Error al generar reporte: " + error.message);
  }

  return data || [];
}

// Estados posibles de seriales
export const ESTADOS_SERIAL = [
  { valor: "disponible", nombre: "Disponible", color: "#22c55e" },
  { valor: "vendido", nombre: "Vendido", color: "#3b82f6" },
  { valor: "defectuoso", nombre: "Defectuoso", color: "#ef4444" },
  { valor: "en_garantia", nombre: "En Garantía", color: "#f59e0b" },
];
