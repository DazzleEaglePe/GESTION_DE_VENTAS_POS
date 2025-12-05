import { create } from "zustand";
import {
  ObtenerAtributos,
  CrearAtributoConValores,
  AgregarValorAtributo,
  EliminarAtributo,
  CrearVarianteProducto,
  ObtenerVariantesProducto,
  EditarVariante,
  EliminarVariante,
  ObtenerProductosConVariantes,
  generarSKUVariante,
} from "../supabase/crudVariantes";

export const useVariantesStore = create((set, get) => ({
  // Estado
  dataAtributos: [],
  dataVariantes: [],
  productosConVariantes: [],
  productoSeleccionado: null,
  modalAtributos: false,
  modalVariantes: false,

  // Setters
  setProductoSeleccionado: (producto) => set({ productoSeleccionado: producto }),
  setModalAtributos: (estado) => set({ modalAtributos: estado }),
  setModalVariantes: (estado) => set({ modalVariantes: estado }),

  // Atributos
  obtenerAtributos: async (p) => {
    try {
      const data = await ObtenerAtributos(p);
      set({ dataAtributos: data });
      return data;
    } catch (error) {
      console.error("Error al obtener atributos:", error);
      return [];
    }
  },

  crearAtributoConValores: async (p) => {
    try {
      const resultado = await CrearAtributoConValores(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  agregarValorAtributo: async (p) => {
    try {
      const resultado = await AgregarValorAtributo(p);
      return { exito: true, data: resultado };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  eliminarAtributo: async (p) => {
    try {
      await EliminarAtributo(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  // Variantes
  crearVarianteProducto: async (p) => {
    try {
      const resultado = await CrearVarianteProducto(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerVariantesProducto: async (p) => {
    try {
      const data = await ObtenerVariantesProducto(p);
      set({ dataVariantes: data });
      return data;
    } catch (error) {
      console.error("Error al obtener variantes:", error);
      return [];
    }
  },

  editarVariante: async (p) => {
    try {
      await EditarVariante(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  eliminarVariante: async (p) => {
    try {
      await EliminarVariante(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerProductosConVariantes: async (p) => {
    try {
      const data = await ObtenerProductosConVariantes(p);
      set({ productosConVariantes: data });
      return data;
    } catch (error) {
      console.error("Error al obtener productos:", error);
      return [];
    }
  },

  // Helpers
  generarSKU: (productoBase, atributos) => {
    return generarSKUVariante(productoBase, atributos);
  },

  // Generar todas las combinaciones de variantes
  generarCombinaciones: (atributosSeleccionados) => {
    // atributosSeleccionados = [{id, nombre, atributo_valores: [{id, valor}, ...]}, ...]
    if (!atributosSeleccionados.length) return [];

    const combinaciones = atributosSeleccionados.reduce(
      (acc, atributo) => {
        const nuevasCombinaciones = [];
        const valores = atributo.atributo_valores || atributo.valores || [];
        acc.forEach((combo) => {
          valores.forEach((v) => {
            nuevasCombinaciones.push([
              ...combo,
              { 
                id_atributo: atributo.id, 
                id_valor: v.id, 
                valor: v.valor,
                nombre_atributo: atributo.nombre 
              },
            ]);
          });
        });
        return nuevasCombinaciones;
      },
      [[]]
    );

    return combinaciones.filter((c) => c.length > 0);
  },
}));
