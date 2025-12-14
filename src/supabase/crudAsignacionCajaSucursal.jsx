import { supabase } from "../supabase/supabase.config";
const tabla = "asignacion_sucursal";
export async function MostrarSucursalCajaAsignada(p) {
  const { data } = await supabase
    .from(tabla)
    .select(`*, sucursales(*), caja(*)`)
    .eq("id_usuario", p.id_usuario)
    .maybeSingle();
    return data;
}
export async function InsertarAsignacionCajaSucursal(p) {
  const { error } = await supabase.from(tabla).insert(p);
  if (error) {
    throw new Error(error.message);
  }
}

export async function MostrarUsuariosAsignados(p) {
  const { data } = await supabase.rpc("mostrarusuariosasignados",p)
  return data
}
export async function BuscarUsuariosAsignados(p) {
  const { data } = await supabase.rpc("buscarusuariosasignados",p)
  return data
}

// Mostrar usuarios inactivos (soft deleted)
export async function MostrarUsuariosInactivos(p) {
  const { data, error } = await supabase.rpc("mostrarusuariosinactivos", {
    _id_empresa: p.id_empresa
  });
  
  if (error) {
    console.error("Error al obtener usuarios inactivos:", error);
    return [];
  }
  
  return data || [];
}

// Verificar si usuario tiene caja abierta
export async function VerificarCajaAbiertaUsuario(p) {
  const { data, error } = await supabase.rpc("verificar_caja_abierta_usuario", {
    _id_usuario: p.id_usuario
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

// Actualizar asignación de sucursal y caja
export async function ActualizarAsignacionUsuario(p) {
  const { data, error } = await supabase.rpc("actualizar_asignacion_usuario", {
    _id_usuario: p.id_usuario,
    _id_sucursal: p.id_sucursal,
    _id_caja: p.id_caja
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}