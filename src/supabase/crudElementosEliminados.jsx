import { supabase } from "../index";

// Mostrar todos los elementos eliminados de la empresa
export async function MostrarElementosEliminados(p) {
  const { data, error } = await supabase.rpc("mostrar_elementos_eliminados", {
    _id_empresa: p.id_empresa,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

// Restaurar un elemento específico
export async function RestaurarElemento(p) {
  const { data, error } = await supabase.rpc("restaurar_registro", {
    p_tabla: p.tabla,
    p_id: p.id,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { exito: true, mensaje: "Elemento restaurado correctamente" };
}

// Eliminar permanentemente (hard delete) - Solo para administradores
export async function EliminarPermanente(p) {
  const { error } = await supabase
    .from(p.tabla)
    .delete()
    .eq("id", p.id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return { exito: true, mensaje: "Elemento eliminado permanentemente" };
}
