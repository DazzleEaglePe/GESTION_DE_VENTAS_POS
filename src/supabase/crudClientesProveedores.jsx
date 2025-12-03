import Swal from "sweetalert2";
import { supabase } from "../index";
const tabla = "clientes_proveedores";
export async function InsertarClientesProveedores(p) {
  const { error, data } = await supabase.rpc("insertarclientesproveedores", p);
  if (error) {
    Swal.fire({
      icon: "error",
      title: error.message,
      text: error.message,
    });
    return;
  }
  return data;
}

export async function MostrarClientesProveedores(p) {
  const { data, error } = await supabase
    .from(tabla)
    .select()
    .eq("id_empresa", p.id_empresa)
    .eq("tipo", p.tipo)
    .eq("activo", true);
  if (error) {
    return;
  }
  return data;
}
export async function BuscarClientesProveedores(p) {
  const { data, error } = await supabase
    .from(tabla)
    .select()
    .eq("id_empresa", p.id_empresa)
    .eq("tipo", p.tipo)
    .eq("activo", true)
    .ilike("nombres", "%"+p.buscador+"%");
  if (error) {
    return;
  }
  return data;
}
// Soft Delete para clientes/proveedores
export async function EliminarClientesProveedores(p) {
  const { data, error } = await supabase.rpc("soft_delete_cliente_proveedor", {
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

// Restaurar cliente/proveedor eliminado
export async function RestaurarClienteProveedor(p) {
  const { error } = await supabase.rpc("restaurar_registro", {
    p_tabla: tabla,
    p_id: p.id,
  });
  
  if (error) {
    throw new Error(error.message);
  }
}
export async function EditarClientesProveedores(p) {
  const { error } = await supabase.rpc("editarclientesproveedores", p);
  if (error) {
    Swal.fire({
      icon: "error",
      title: error.message,
      text: error.message,
    });
    return;
  }
}


