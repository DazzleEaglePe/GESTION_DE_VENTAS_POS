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
    // Manejar error de email duplicado
    if (error.code === "23505" || error.message?.includes("duplicate key") || error.details?.includes("already exists")) {
      throw new Error("Este correo electrónico ya está registrado. Por favor, usa otro.");
    }
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
  if (!p?.id) {
    return {
      exito: false,
      mensaje: "ID de usuario no proporcionado",
    };
  }

  const { data, error } = await supabase.rpc("soft_delete_usuario", {
    p_id: p.id,
    p_usuario_id: p.eliminado_por || null,
  });
  
  if (error) {
    console.error("Error en soft_delete_usuario:", error);
    return {
      exito: false,
      mensaje: error.message,
    };
  }
  
  // La función retorna JSONB con success, error/message
  if (!data?.success) {
    return {
      exito: false,
      mensaje: data?.error || "Error desconocido",
    };
  }
  
  return {
    exito: true,
    mensaje: data.message,
  };
}

// Restaurar usuario eliminado
export async function RestaurarUsuario(p) {
  const { data, error } = await supabase.rpc("restaurar_usuario", {
    _id_usuario: p.id,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  if (!data?.success) {
    throw new Error(data?.error || "Error al restaurar usuario");
  }
  
  return data;
}

// Verificar si un email ya existe
export async function VerificarEmailUsuario(p) {
  const { data, error } = await supabase.rpc("verificar_email_usuario", {
    _email: p.email,
    _id_empresa: p.id_empresa || null,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

export async function EditarUsuarios(p) {
  console.log("📝 EditarUsuarios - Datos recibidos:", p);
  
  // Preparar datos para actualizar (sin campos que no existen en la tabla)
  const datosActualizar = {
    ...(p.nombres && { nombres: p.nombres }),
    ...(p.nro_doc && { nro_doc: p.nro_doc }),
    ...(p.telefono && { telefono: p.telefono }),
    ...(p.id_rol && { id_rol: p.id_rol }),
    ...(p.tema && { tema: p.tema }),
  };

  console.log("📝 Datos a actualizar en DB:", datosActualizar);

  const { error } = await supabase.from(tabla).update(datosActualizar).eq("id", p.id);
  
  if (error) {
    console.error("❌ Error al actualizar usuario:", error);
    throw new Error(error.message);
  }

  console.log("✅ Usuario actualizado correctamente");

  // Solo actualizar permisos si viene con id_rol (edición desde panel admin)
  // y hay módulos seleccionados
  if (p.id_rol) {
    const selectModules = usePermisosStore.getState().selectedModules || [];
    console.log("🔐 Módulos seleccionados:", selectModules);
    
    if (Array.isArray(selectModules) && selectModules.length > 0) {
      await EliminarPermisos({ id_usuario: p.id });
      console.log("🗑️ Permisos anteriores eliminados");
      
      for (const idModule of selectModules) {
        const pp = {
          id_usuario: p.id,
          idmodulo: idModule,
        };
        console.log("➕ Insertando permiso:", pp);
        await InsertarPermisos(pp);
      }
      console.log("✅ Permisos actualizados correctamente");
    } else {
      console.warn("⚠️ No hay módulos seleccionados para actualizar permisos");
      // No lanzar error si solo se está editando el perfil sin cambiar rol/permisos
    }
  } else {
    console.log("ℹ️ Edición de perfil básico (sin cambios de rol/permisos)");
  }
}