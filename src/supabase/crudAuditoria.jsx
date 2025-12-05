import { supabase } from "./supabase.config";

// Consultar registros de auditoría con filtros
export async function ConsultarAuditoria(p) {
  if (!p?.id_empresa) {
    return [];
  }

  const { data, error } = await supabase.rpc("consultar_auditoria", {
    _id_empresa: p.id_empresa,
    _fecha_inicio: p.fecha_inicio || null,
    _fecha_fin: p.fecha_fin || null,
    _tabla: p.tabla || null,
    _operacion: p.operacion || null,
    _id_usuario: p.id_usuario || null,
    _limite: p.limite || 100,
    _offset: p.offset || 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// Obtener resumen de auditoría (estadísticas)
export async function ResumenAuditoria(p) {
  if (!p?.id_empresa) {
    return null;
  }

  const { data, error } = await supabase.rpc("resumen_auditoria", {
    _id_empresa: p.id_empresa,
    _fecha_inicio: p.fecha_inicio || null,
    _fecha_fin: p.fecha_fin || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] || null;
}

// Registrar acción manual desde el frontend
export async function RegistrarAccionUsuario(p) {
  if (!p?.id_usuario || !p?.id_empresa) {
    return null;
  }

  const { data, error } = await supabase.rpc("registrar_accion_usuario", {
    _tabla: p.tabla,
    _operacion: p.operacion,
    _registro_id: p.registro_id || null,
    _id_usuario: p.id_usuario,
    _id_empresa: p.id_empresa,
    _modulo: p.modulo || null,
    _accion_detalle: p.accion_detalle || null,
    _datos_adicionales: p.datos_adicionales || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Obtener historial de un registro específico
export async function HistorialRegistro(p) {
  if (!p?.tabla || !p?.registro_id) {
    return [];
  }

  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .eq("tabla", p.tabla)
    .eq("registro_id", p.registro_id)
    .order("fecha_hora", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
