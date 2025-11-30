import Swal from "sweetalert2";
import { supabase } from "../index";
const tabla = "categorias";
export async function InsertarCategorias(p, file) {
  const { error, data } = await supabase.rpc("insertarcategorias", p);
  if (error) {
    Swal.fire({
      icon: "error",
      title: "Oops...categorias",
      text: error.message,
    });
    return;
  }
  const img = file.size;
  if (img != undefined) {
    const nuevo_id = data;
    const urlImagen = await subirImagen(nuevo_id, file);
    const piconoeditar = {
      icono: urlImagen.publicUrl,
      id: nuevo_id,
    };
    await EditarIconoCategorias(piconoeditar);
  }
}

async function subirImagen(idcategoria, file) {
  const ruta = "categorias/" + idcategoria;
  const { data, error } = await supabase.storage
    .from("imagenes")
    .upload(ruta, file, {
      cacheControl: "0",
      upsert: true,
    });
  if (error) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: error.message,
    });
    return;
  }
  if (data) {
    const { data: urlimagen } = await supabase.storage
      .from("imagenes")
      .getPublicUrl(ruta);
    return urlimagen;
  }
}
async function EditarIconoCategorias(p) {
  const { error } = await supabase.from("categorias").update(p).eq("id", p.id);
  if (error) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: error.message,
    });
    return;
  }
}


export async function MostrarCategorias(p) {
  const { data } = await supabase
    .from(tabla)
    .select()
    .eq("id_empresa", p.id_empresa)
    .order("id", { ascending: false });
  return data;
}
export async function BuscarCategorias(p) {
  const { data } = await supabase
    .from(tabla)
    .select()
    .eq("id_empresa", p.id_empresa)
    .ilike("nombre", "%" + p.descripcion + "%");

  return data;
}

// Validar antes de eliminar categoría
export async function ValidarEliminarCategoria(p) {
  const { data, error } = await supabase.rpc("validar_eliminar_categoria", {
    p_id_categoria: p.id,
  });
  
  if (error) {
    throw new Error("Error de validación: " + error.message);
  }
  
  // La función retorna un array, tomamos el primer elemento
  return data?.[0] || data;
}

// Eliminar categoría físicamente
export async function EliminarCategoriaFisico(p) {
  const { error } = await supabase.from(tabla).delete().eq("id", p.id);
  if (error) {
    throw new Error(error.message);
  }
  
  // Eliminar imagen si existe
  if (p.icono && p.icono !== "-") {
    const ruta = "categorias/" + p.id;
    await supabase.storage.from("imagenes").remove([ruta]);
  }
}

// Función principal de eliminación con validación integrada
export async function EliminarCategorias(p) {
  // 1. Validar antes de eliminar
  const validacion = await ValidarEliminarCategoria(p);
  
  // 2. Si no puede eliminarse, retornar la información
  if (!validacion.puede_eliminar) {
    return {
      exito: false,
      validacion: validacion,
      mensaje: validacion.mensaje,
    };
  }
  
  // 3. Si puede eliminarse, proceder
  await EliminarCategoriaFisico(p);
  
  return {
    exito: true,
    mensaje: "Categoría eliminada correctamente",
  };
}
export async function EditarCategorias(p, fileold, filenew) {
  const { error } = await supabase.rpc("editarcategorias", p);
  if (error) {
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: error.message,
    });
    return;
  }
  if (filenew != "-" && filenew.size != undefined) {
    if (fileold != "-") {
      await EditarIconoStorage(p._id, filenew);
    } else {
      const dataImagen = await subirImagen(p._id, filenew);
      const piconoeditar = {
        icono: dataImagen.publicUrl,
        id: p._id,
      };
      await EditarIconoCategorias(piconoeditar);
    }
  }
}
export async function EditarIconoStorage(id, file) {
  const ruta = "categorias/" + id;
  await supabase.storage.from("imagenes").update(ruta, file, {
    cacheControl: "0",
    upsert: true,
  });
}
