import Swal from "sweetalert2";
import { supabase } from "../index";
const tabla = "sucursales";
export async function MostrarSucursales(p) {
  const { data, error } = await supabase
    .from(tabla)
    .select()
    .eq("id_empresa", p.id_empresa)
    .eq("activo", true);
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
export async function MostrarSucursalesAsignadasXuser(p) {
  const { data } = await supabase.rpc("mostrarsucursalesasignadas", {
    _id_usuario: p.id_usuario,
  });
  return data;
}
export async function MostrarCajasXSucursal(p) {
  const { data } = await supabase
    .from(tabla)
    .select(`*, caja(*)`)
    .eq("id_empresa", p.id_empresa)
    .eq("activo", true);
  return data;
}
export async function InsertarSucursal(p) {
  const { error } = await supabase.from(tabla).insert(p);
  if (error) {
    throw new Error(error.message);
  }
}
export async function EditarSucursal(p) {
  const { error } = await supabase.from(tabla).update(p).eq("id", p.id);
  if (error) {
    throw new Error(error.message);
  }
}
// Soft Delete para sucursales
export async function EliminarSucursal(p) {
  const { data, error } = await supabase.rpc("soft_delete_sucursal", {
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

// Restaurar sucursal eliminada
export async function RestaurarSucursal(p) {
  const { error } = await supabase.rpc("restaurar_registro", {
    p_tabla: tabla,
    p_id: p.id,
  });
  
  if (error) {
    throw new Error(error.message);
  }
}
