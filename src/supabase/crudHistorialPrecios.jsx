import { supabase } from "../index";

/**
 * Consultar historial de precios de un producto específico
 */
export async function ConsultarHistorialPreciosProducto(p) {
  const { data, error } = await supabase.rpc("consultar_historial_precios", {
    _id_producto: p.id_producto,
    _limite: p.limite || 50,
    _offset: p.offset || 0,
  });

  if (error) {
    throw new Error("Error al consultar historial: " + error.message);
  }

  return data || [];
}

/**
 * Consultar historial de precios de toda la empresa
 */
export async function ConsultarHistorialPreciosEmpresa(p) {
  const { data, error } = await supabase.rpc("consultar_historial_precios_empresa", {
    _id_empresa: p.id_empresa,
    _fecha_inicio: p.fecha_inicio || null,
    _fecha_fin: p.fecha_fin || null,
    _id_categoria: p.id_categoria || null,
    _tipo_cambio: p.tipo_cambio || null,
    _limite: p.limite || 100,
    _offset: p.offset || 0,
  });

  if (error) {
    throw new Error("Error al consultar historial: " + error.message);
  }

  return data || [];
}

/**
 * Obtener estadísticas de cambios de precio
 */
export async function ObtenerEstadisticasPrecios(p) {
  // Solo pasar fechas si están definidas, para que SQL use sus valores DEFAULT
  const params = {
    _id_empresa: p.id_empresa,
  };
  
  if (p.fecha_inicio) {
    params._fecha_inicio = p.fecha_inicio;
  }
  if (p.fecha_fin) {
    params._fecha_fin = p.fecha_fin;
  }

  const { data, error } = await supabase.rpc("estadisticas_historial_precios", params);

  if (error) {
    throw new Error("Error al obtener estadísticas: " + error.message);
  }

  return data?.[0] || null;
}

/**
 * Registrar cambio de precio manualmente (con detalles)
 */
export async function RegistrarCambioPrecio(p) {
  const { data, error } = await supabase.rpc("registrar_cambio_precio", {
    _id_producto: p.id_producto,
    _precio_venta_nuevo: p.precio_venta_nuevo,
    _precio_compra_nuevo: p.precio_compra_nuevo,
    _id_usuario: p.id_usuario,
    _id_empresa: p.id_empresa,
    _motivo: p.motivo || null,
    _tipo_cambio: p.tipo_cambio || "manual",
    _fecha_fin_vigencia: p.fecha_fin_vigencia || null,
  });

  if (error) {
    throw new Error("Error al registrar cambio de precio: " + error.message);
  }

  return data;
}

/**
 * Obtener precio de un producto en una fecha específica
 */
export async function ObtenerPrecioEnFecha(p) {
  const { data, error } = await supabase.rpc("obtener_precio_en_fecha", {
    _id_producto: p.id_producto,
    _fecha: p.fecha,
  });

  if (error) {
    throw new Error("Error al obtener precio: " + error.message);
  }

  return data?.[0] || null;
}

/**
 * Consultar últimos cambios de precio (usando la vista)
 */
export async function ConsultarUltimosCambiosPrecios(p) {
  let query = supabase
    .from("vista_ultimos_cambios_precio")
    .select("*")
    .eq("id_empresa", p.id_empresa)
    .order("fecha_cambio", { ascending: false });

  if (p.limite) {
    query = query.limit(p.limite);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Error al consultar cambios: " + error.message);
  }

  return data || [];
}
