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

// Función mejorada: Cierre de caja atómico con validaciones
export async function CerrarTurnoCajaAtomico(p) {
  const { data, error } = await supabase.rpc("cerrar_caja_atomico", {
    _id_cierre_caja: p.id,
    _id_usuario: p.id_usuario,
    _total_efectivo_real: p.total_efectivo_real,
    _fecha_cierre: p.fechacierre,
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