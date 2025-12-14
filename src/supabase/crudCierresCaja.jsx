import Swal from "sweetalert2";
import { supabase } from "./supabase.config";
const tabla = "cierrecaja";
const tabla2 = "ingresos_salidas_caja";
export async function MostrarCierreCajaAperturada(p) {
  const { data } = await supabase
    .from(tabla)
    .select()
    .eq("id_caja", p.id_caja)
    .eq("estado", 0)
    .maybeSingle();
  return data;
}

export async function AperturarCierreCaja(p) {
  const { error, data } = await supabase
    .from(tabla)
    .insert(p)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Función mejorada: Cierre de caja atómico con validaciones y seguridad
export async function CerrarTurnoCajaAtomico(p) {
  const { data, error } = await supabase.rpc("cerrar_caja_atomico", {
    _id_cierre_caja: p.id,
    _id_usuario: p.id_usuario,
    _total_efectivo_real: p.total_efectivo_real,
    _fecha_cierre: p.fechacierre,
    _justificacion: p.justificacion || null,
    _requirio_autorizacion: p.requirio_autorizacion || false,
    _id_supervisor: p.id_supervisor || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  // La función retorna un array, tomamos el primer resultado
  const resultado = data?.[0] || data;
  
  if (!resultado?.success) {
    // Extraer mensaje amigable
    const mensaje = resultado?.mensaje?.replace("CIERRE_ERROR: ", "") || "Error al cerrar caja";
    throw new Error(mensaje);
  }

  return resultado;
}

// Validar código de supervisor
export async function ValidarSupervisor(p) {
  const { data, error } = await supabase.rpc("validar_supervisor", {
    _codigo: p.codigo,
    _id_empresa: p.id_empresa,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] || data;
}

// Obtener historial de diferencias para dashboard
export async function ObtenerDiferenciasCaja(p) {
  const { data, error } = await supabase.rpc("obtener_diferencias_caja", {
    _id_empresa: p.id_empresa,
    _fecha_inicio: p.fecha_inicio || null,
    _fecha_fin: p.fecha_fin || null,
    _solo_pendientes: p.solo_pendientes || false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// Marcar diferencia como revisada
export async function MarcarDiferenciaRevisada(p) {
  const { data, error } = await supabase.rpc("marcar_diferencia_revisada", {
    _id_auditoria: p.id_auditoria,
    _notas: p.notas || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Función para validar estado antes de cerrar (útil para mostrar info al usuario)
export async function ValidarEstadoCierreCaja(p) {
  const { data, error } = await supabase.rpc("validar_estado_cierre_caja", {
    _id_cierre_caja: p.id_cierre_caja,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] || data;
}

// Mantener función original como fallback
export async function CerrarTurnoCaja(p) {
  const { error } = await supabase.from(tabla).update(p).eq("id",p.id);
  if (error) {
    throw new Error(error.message);
  }
}