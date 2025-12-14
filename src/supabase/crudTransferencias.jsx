import { supabase } from "../index";

/**
 * Crear una nueva transferencia
 */
export async function CrearTransferencia(p) {
  const { data, error } = await supabase.rpc("crear_transferencia", {
    _id_almacen_origen: p.id_almacen_origen,
    _id_almacen_destino: p.id_almacen_destino,
    _id_usuario: p.id_usuario,
    _id_empresa: p.id_empresa,
    _productos: p.productos, // Array de {id_producto, cantidad}
    _notas: p.notas || null,
  });

  if (error) {
    throw new Error("Error al crear transferencia: " + error.message);
  }

  return data;
}

/**
 * Enviar transferencia (descontar stock del origen)
 */
export async function EnviarTransferencia(p) {
  const { data, error } = await supabase.rpc("enviar_transferencia", {
    _id_transferencia: p.id_transferencia,
    _id_usuario: p.id_usuario,
  });

  if (error) {
    throw new Error("Error al enviar transferencia: " + error.message);
  }

  return data;
}

/**
 * Recibir transferencia (agregar stock al destino)
 */
export async function RecibirTransferencia(p) {
  const { data, error } = await supabase.rpc("recibir_transferencia", {
    _id_transferencia: p.id_transferencia,
    _id_usuario: p.id_usuario,
    _productos_recibidos: p.productos_recibidos || null,
  });

  if (error) {
    throw new Error("Error al recibir transferencia: " + error.message);
  }

  return data;
}

/**
 * Cancelar transferencia
 */
export async function CancelarTransferencia(p) {
  const { data, error } = await supabase.rpc("cancelar_transferencia", {
    _id_transferencia: p.id_transferencia,
    _id_usuario: p.id_usuario,
    _motivo: p.motivo || null,
  });

  if (error) {
    throw new Error("Error al cancelar transferencia: " + error.message);
  }

  return data;
}

/**
 * Consultar transferencias con filtros
 */
export async function ConsultarTransferencias(p) {
  const { data, error } = await supabase.rpc("consultar_transferencias", {
    _id_empresa: p.id_empresa,
    _estado: p.estado || null,
    _id_almacen: p.id_almacen || null,
    _fecha_inicio: p.fecha_inicio || null,
    _fecha_fin: p.fecha_fin || null,
    _limite: p.limite || 50,
    _offset: p.offset || 0,
  });

  if (error) {
    throw new Error("Error al consultar transferencias: " + error.message);
  }

  return data || [];
}

/**
 * Obtener detalle de una transferencia
 */
export async function ObtenerDetalleTransferencia(p) {
  const { data, error } = await supabase.rpc("obtener_detalle_transferencia", {
    _id_transferencia: p.id_transferencia,
  });

  if (error) {
    throw new Error("Error al obtener detalle: " + error.message);
  }

  return data || [];
}

/**
 * Obtener estadísticas de transferencias
 */
export async function EstadisticasTransferencias(p) {
  const { data, error } = await supabase.rpc("estadisticas_transferencias", {
    _id_empresa: p.id_empresa,
    _fecha_inicio: p.fecha_inicio || null,
    _fecha_fin: p.fecha_fin || null,
  });

  if (error) {
    throw new Error("Error al obtener estadísticas: " + error.message);
  }

  return data?.[0] || null;
}

/**
 * Obtener transferencias recientes (vista)
 */
export async function TransferenciasRecientes(p) {
  const { data, error } = await supabase
    .from("vista_transferencias_recientes")
    .select("*")
    .eq("id_empresa", p.id_empresa)
    .order("fecha_creacion", { ascending: false })
    .limit(p.limite || 10);

  if (error) {
    throw new Error("Error al obtener transferencias recientes: " + error.message);
  }

  return data || [];
}
