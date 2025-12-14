import { supabase } from "./supabase.config";
const tabla = "caja";
export async function MostrarCajaXSucursal(p) {
  // Validar que id_sucursal existe
  if (!p?.id_sucursal) {
    return [];
  }
  
  const { data } = await supabase
    .from(tabla)
    .select()
    .eq("id_sucursal", p.id_sucursal)
    .eq("activo", true);
   
  return data || [];
}


export async function EditarCaja(p) {
  const { error } = await supabase.from(tabla).update(p).eq("id", p.id);
  if (error) {
    throw new Error(error.message);
  }
}

// Soft Delete para cajas
export async function EliminarCaja(p) {
  const { data, error } = await supabase.rpc("soft_delete_caja", {
    p_id: p.id,
    p_usuario_id: p.id_usuario || null,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  // La función retorna JSONB con success, error/message
  if (!data.success) {
    return {
      exito: false,
      mensaje: data.error,
    };
  }
  
  return {
    exito: true,
    mensaje: data.message,
  };
}

// Restaurar caja eliminada
export async function RestaurarCaja(p) {
  const { error } = await supabase.rpc("restaurar_registro", {
    p_tabla: tabla,
    p_id: p.id,
  });
  
  if (error) {
    throw new Error(error.message);
  }
}
