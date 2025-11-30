import { create } from "zustand";
import {
  BuscarCategorias,
  EditarCategorias,
  EliminarCategorias,
  InsertarCategorias,
  MostrarCategorias,
  ValidarEliminarCategoria,
} from "../index";

export const useCategoriasStore = create((set, get) => ({
  buscador: "",
  setBuscador: (p) => {
    set({ buscador: p });
  },
  datacategorias: [],
  categoriaItemSelect: [],
  parametros: {},
  mostrarCategorias: async (p) => {
    const response = await MostrarCategorias(p);
    set({ parametros: p });
    set({ datacategorias: response });
    set({ categoriaItemSelect: response[0] });
    return response;
  },
  selectCategoria: (p) => {
    set({ categoriaItemSelect: p });
  },
  insertarCategorias: async (p, file) => {
    await InsertarCategorias(p, file);
    const { mostrarCategorias } = get();
    const { parametros } = get();
    set(mostrarCategorias(parametros));
  },
  // Validar antes de eliminar (para uso en UI)
  validarEliminarCategoria: async (p) => {
    return await ValidarEliminarCategoria(p);
  },
  // Eliminar categoría con validación integrada
  eliminarCategoria: async (p) => {
    const resultado = await EliminarCategorias(p);
    
    // Solo refrescar si fue exitoso
    if (resultado.exito) {
      const { mostrarCategorias, parametros } = get();
      set(mostrarCategorias(parametros));
    }
    
    return resultado;
  },
  editarCategoria: async (p, fileold, filenew) => {
    await EditarCategorias(p, fileold, filenew);
    const { mostrarCategorias } = get();
    const { parametros } = get();
    set(mostrarCategorias(parametros));
  },
  buscarCategorias: async (p) => {
    const response = await BuscarCategorias(p);
    set({ datacategorias: response });
    return response;
  },
}));
