import { supabase } from "../index";

/**
 * Obtener categorías con jerarquía completa
 */
export async function ObtenerCategoriasJerarquicas(p) {
  if (!p?.id_empresa) return [];

  const { data, error } = await supabase.rpc("obtener_categorias_jerarquicas", {
    _id_empresa: p.id_empresa,
  });

  if (error) {
    throw new Error("Error al obtener categorías: " + error.message);
  }

  return data || [];
}

/**
 * Insertar subcategoría
 */
export async function InsertarSubcategoria(p) {
  const { data, error } = await supabase.rpc("insertar_subcategoria", {
    _nombre: p.nombre,
    _color: p.color || null,
    _icono: p.icono || null,
    _id_empresa: p.id_empresa,
    _id_categoria_padre: p.id_categoria_padre,
  });

  if (error) {
    throw new Error("Error al crear subcategoría: " + error.message);
  }

  return data;
}

/**
 * Mover categoría a otro padre
 */
export async function MoverCategoria(p) {
  const { data, error } = await supabase.rpc("mover_categoria", {
    _id_categoria: p.id_categoria,
    _nuevo_padre: p.nuevo_padre,
  });

  if (error) {
    throw new Error("Error al mover categoría: " + error.message);
  }

  return data;
}

/**
 * Obtener subcategorías de una categoría
 */
export async function ObtenerSubcategorias(p) {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("id_categoria_padre", p.id_categoria)
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    throw new Error("Error al obtener subcategorías: " + error.message);
  }

  return data || [];
}

/**
 * Actualizar orden de categorías
 */
export async function ActualizarOrdenCategorias(p) {
  // p.categorias = [{id: 1, orden: 0}, {id: 2, orden: 1}, ...]
  for (const cat of p.categorias) {
    const { error } = await supabase
      .from("categorias")
      .update({ orden: cat.orden })
      .eq("id", cat.id);

    if (error) {
      throw new Error("Error al actualizar orden: " + error.message);
    }
  }

  return { exito: true, mensaje: "Orden actualizado" };
}

/**
 * Construir árbol de categorías desde lista plana
 */
export function construirArbolCategorias(categorias) {
  const mapa = new Map();
  const raices = [];

  // Crear mapa de categorías
  categorias.forEach((cat) => {
    mapa.set(cat.id, { ...cat, hijos: [] });
  });

  // Construir árbol
  categorias.forEach((cat) => {
    if (cat.id_categoria_padre) {
      const padre = mapa.get(cat.id_categoria_padre);
      if (padre) {
        padre.hijos.push(mapa.get(cat.id));
      }
    } else {
      raices.push(mapa.get(cat.id));
    }
  });

  return raices;
}
