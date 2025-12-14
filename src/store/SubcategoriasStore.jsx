import { create } from "zustand";
import {
  ObtenerCategoriasJerarquicas,
  InsertarSubcategoria,
  MoverCategoria,
  ObtenerSubcategorias,
  ActualizarOrdenCategorias,
  construirArbolCategorias,
} from "../supabase/crudSubcategorias";

export const useSubcategoriasStore = create((set, get) => ({
  // Estado
  dataCategoriasJerarquicas: [],
  arbolCategorias: [],
  categoriaSeleccionada: null,
  modalAbierto: false,

  // Setters
  setCategoriaSeleccionada: (categoria) => set({ categoriaSeleccionada: categoria }),
  setModalAbierto: (estado) => set({ modalAbierto: estado }),

  // Acciones
  obtenerCategoriasJerarquicas: async (p) => {
    try {
      const data = await ObtenerCategoriasJerarquicas(p);
      const arbol = construirArbolCategorias(data);
      set({ dataCategoriasJerarquicas: data, arbolCategorias: arbol });
      return data;
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      throw error;
    }
  },

  insertarSubcategoria: async (p) => {
    try {
      const resultado = await InsertarSubcategoria(p);
      return { exito: true, id: resultado };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  moverCategoria: async (p) => {
    try {
      const resultado = await MoverCategoria(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerSubcategorias: async (p) => {
    try {
      return await ObtenerSubcategorias(p);
    } catch (error) {
      console.error("Error al obtener subcategorías:", error);
      return [];
    }
  },

  actualizarOrdenCategorias: async (p) => {
    try {
      return await ActualizarOrdenCategorias(p);
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  // Helpers
  obtenerCategoriasHijas: (idPadre) => {
    const { dataCategoriasJerarquicas } = get();
    return dataCategoriasJerarquicas.filter((c) => c.id_categoria_padre === idPadre);
  },

  obtenerRutaCategoria: (idCategoria) => {
    const { dataCategoriasJerarquicas } = get();
    const categoria = dataCategoriasJerarquicas.find((c) => c.id === idCategoria);
    return categoria?.ruta_completa || "";
  },

  obtenerCategoriasRaiz: () => {
    const { dataCategoriasJerarquicas } = get();
    return dataCategoriasJerarquicas.filter((c) => !c.id_categoria_padre);
  },
}));
