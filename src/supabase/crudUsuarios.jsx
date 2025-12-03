import Swal from "sweetalert2";
import { supabase } from "../index";
import { EliminarPermisos, InsertarPermisos } from "./crudPermisos";
import { usePermisosStore } from "../store/PermisosStore";
const tabla = "usuarios";
export async function MostrarUsuarios(p) {
  const { data, error } = await supabase
    .from(tabla)
    .select(`*, roles(*)`)
    .eq("id_auth", p.id_auth)
    .maybeSingle();
  if (error) {
    return;
  }
  return data;
}
export async function InsertarAdmin(p) {
  const { error } = await supabase.from(tabla).insert(p);
  if (error) {
    throw new Error(error.message);
  }
}
export async function InsertarUsuarios(p) {
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

export async function InsertarCredencialesUser(p) {
  const { data, error } = await supabase.rpc("crearcredencialesuser", p);
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
export async function ObtenerIdAuthSupabase() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session != null) {
    const { user } = session;
    const idauth = user.id;
    return idauth;
  }
}
// Soft Delete para usuarios
export async function EliminarUsuarioAsignado(p) {
  const { data, error } = await supabase.rpc("soft_delete_usuario", {
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

// Restaurar usuario eliminado
export async function RestaurarUsuario(p) {
  const { error } = await supabase.rpc("restaurar_registro", {
    p_tabla: tabla,
    p_id: p.id,
  });
  
  if (error) {
    throw new Error(error.message);
  }
}
export async function EditarUsuarios(p) {
  //console.log("p editar usuarios",p)
  const { error } = await supabase.from(tabla).update(p).eq("id", p.id);
  await EliminarPermisos({ id_usuario: p.id });
  const selectModules = usePermisosStore.getState().selectedModules || [];
  const id_usuario = p.id
  if (Array.isArray(selectModules) && selectModules.length > 0) {
    selectModules.forEach(async (idModule) => {
      let pp = {
        id_usuario: id_usuario,
        idmodulo: idModule,
      };
      console.log("p modulos",pp)
      await InsertarPermisos(pp);
    });
  } else {
    throw new Error("No hay módulos seleccionados");
  }
  if (error) {
    throw new Error(error.message);
  }
}