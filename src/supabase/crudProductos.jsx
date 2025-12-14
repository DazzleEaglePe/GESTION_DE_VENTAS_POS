
import { supabase } from "../index";
const tabla = "productos";

export async function InsertarProductos(p) {
  // Si incluye campos de opciones avanzadas, insertar directamente
  if (p._tiene_variantes !== undefined || p._maneja_multiprecios !== undefined || 
      p._maneja_seriales !== undefined || p._es_compuesto !== undefined) {
    const { data, error } = await supabase
      .from(tabla)
      .insert({
        nombre: p._nombre,
        precio_venta: p._precio_venta,
        precio_compra: p._precio_compra,
        id_categoria: p._id_categoria,
        codigo_barras: p._codigo_barras,
        codigo_interno: p._codigo_interno,
        id_empresa: p._id_empresa,
        sevende_por: p._sevende_por,
        maneja_inventarios: p._maneja_inventarios,
        tiene_variantes: p._tiene_variantes || false,
        maneja_multiprecios: p._maneja_multiprecios || false,
        maneja_seriales: p._maneja_seriales || false,
        es_compuesto: p._es_compuesto || false,
      })
      .select("id")
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    return data.id;
  }
  
  // Sino, usar el RPC original
  const { error, data } = await supabase.rpc("insertarproductos", p);
  if (error) {
    throw new Error(error.message);
  }
  console.log(data);
  return data;
}

export async function MostrarProductos(p) {
  const { data } = await supabase.rpc("mostrarproductos", {
    _id_empresa: p.id_empresa,
  });
  return data;
}

// Nueva función para mostrar productos inactivos
export async function MostrarProductosInactivos(p) {
  const { data, error } = await supabase.rpc("mostrar_productos_inactivos", {
    _id_empresa: p.id_empresa,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function BuscarProductos(p) {
  const { data, error } = await supabase.rpc("buscarproductos", {
    _id_empresa: p.id_empresa,
    buscador: p.buscador,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// Validar antes de eliminar producto
export async function ValidarEliminarProducto(p) {
  const { data, error } = await supabase.rpc("validar_eliminar_producto", {
    p_id_producto: p.id,
  });
  
  if (error) {
    throw new Error("Error de validación: " + error.message);
  }
  
  console.log("validar_eliminar_producto response:", data);
  
  // La función retorna un array, tomamos el primer elemento
  // Manejar caso donde puede venir como array simple o array anidado
  const resultado = Array.isArray(data) ? data[0] : data;
  return resultado;
}

// Desactivar producto (soft delete)
export async function DesactivarProducto(p) {
  const { error } = await supabase.rpc("desactivar_producto", {
    p_id_producto: p.id,
    p_id_usuario: p.id_usuario,
  });
  if (error) {
    throw new Error("Error al desactivar producto: " + error.message);
  }
}

// Restaurar producto desactivado
export async function RestaurarProducto(p) {
  const { error } = await supabase.rpc("restaurar_producto", {
    p_id_producto: p.id,
  });
  if (error) {
    throw new Error("Error al restaurar producto: " + error.message);
  }
}

// Eliminar producto físicamente (solo si la validación lo permite)
export async function EliminarProductoFisico(p) {
  const { error } = await supabase.from(tabla).delete().eq("id", p.id);
  if (error) {
    throw new Error(error.message);
  }
}

// Función principal de eliminación con validación integrada
export async function EliminarProductos(p) {
  // Si se pasa el flag "forzarDesactivacion", se salta la validación
  // (el usuario ya confirmó en el SweetAlert)
  if (p.forzarDesactivacion) {
    await DesactivarProducto({ id: p.id, id_usuario: p.id_usuario });
    return {
      exito: true,
      tipo: "desactivado",
      mensaje: "Producto desactivado correctamente",
    };
  }

  // 1. Validar antes de eliminar
  const validacion = await ValidarEliminarProducto(p);
  
  // 2. Si no puede eliminarse, retornar la información para que el frontend decida
  if (!validacion.puede_eliminar) {
    return {
      exito: false,
      validacion: validacion,
      mensaje: validacion.mensaje,
    };
  }
  
  // 3. Si puede eliminarse, usar soft delete por seguridad
  await DesactivarProducto({ id: p.id, id_usuario: p.id_usuario });
  
  return {
    exito: true,
    tipo: "desactivado",
    mensaje: "Producto desactivado correctamente",
  };
}

export async function EditarProductos(p) {
  // Si incluye campos de opciones avanzadas, usar update directo
  if (p._tiene_variantes !== undefined || p._maneja_multiprecios !== undefined || 
      p._maneja_seriales !== undefined || p._es_compuesto !== undefined) {
    const { error } = await supabase
      .from(tabla)
      .update({
        nombre: p._nombre,
        precio_venta: p._precio_venta,
        precio_compra: p._precio_compra,
        id_categoria: p._id_categoria,
        codigo_barras: p._codigo_barras,
        codigo_interno: p._codigo_interno,
        sevende_por: p._sevende_por,
        maneja_inventarios: p._maneja_inventarios,
        tiene_variantes: p._tiene_variantes || false,
        maneja_multiprecios: p._maneja_multiprecios || false,
        maneja_seriales: p._maneja_seriales || false,
        es_compuesto: p._es_compuesto || false,
      })
      .eq("id", p._id);
    
    if (error) {
      throw new Error(error.message);
    }
    return;
  }
  
  // Sino, usar el RPC original
  const { error } = await supabase.rpc("editarproductos", p);
  if (error) {
    throw new Error(error.message);
  }
}

export async function MostrarUltimoProducto(p) {
  const { data } = await supabase
    .from(tabla)
    .select()
    .eq("id_empresa", p.id_empresa)
    .order("id", { ascending: false })
    .maybeSingle();

  return data;
}
