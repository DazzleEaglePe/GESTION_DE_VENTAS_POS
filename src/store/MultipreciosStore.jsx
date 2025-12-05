import { create } from "zustand";
import {
  ObtenerPrecioPorCantidad,
  GestionarMultiprecios,
  ObtenerMultipreciosProducto,
  InsertarMultiprecio,
  EditarMultiprecio,
  EliminarMultiprecio,
  ObtenerProductosConMultiprecios,
  ToggleMultipreciosProducto,
  generarPreciosAutomaticos,
  PLANTILLAS_PRECIOS,
} from "../supabase/crudMultiprecios";

export const useMultipreciosStore = create((set, get) => ({
  // Estado
  dataMultiprecios: [],
  productosConMultiprecios: [],
  productoSeleccionado: null,
  modalAbierto: false,
  plantillasPrecios: PLANTILLAS_PRECIOS,

  // Setters
  setProductoSeleccionado: (producto) => set({ productoSeleccionado: producto }),
  setModalAbierto: (estado) => set({ modalAbierto: estado }),

  // Acciones
  obtenerPrecioPorCantidad: async (p) => {
    try {
      return await ObtenerPrecioPorCantidad(p);
    } catch (error) {
      console.error("Error al obtener precio:", error);
      return null;
    }
  },

  gestionarMultiprecios: async (p) => {
    try {
      const resultado = await GestionarMultiprecios(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerMultipreciosProducto: async (p) => {
    try {
      const data = await ObtenerMultipreciosProducto(p);
      set({ dataMultiprecios: data });
      return data;
    } catch (error) {
      console.error("Error al obtener multiprecios:", error);
      return [];
    }
  },

  insertarMultiprecio: async (p) => {
    try {
      const resultado = await InsertarMultiprecio(p);
      return { exito: true, data: resultado };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  editarMultiprecio: async (p) => {
    try {
      await EditarMultiprecio(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  eliminarMultiprecio: async (p) => {
    try {
      await EliminarMultiprecio(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerProductosConMultiprecios: async (p) => {
    try {
      const data = await ObtenerProductosConMultiprecios(p);
      set({ productosConMultiprecios: data });
      return data;
    } catch (error) {
      console.error("Error al obtener productos:", error);
      return [];
    }
  },

  toggleMultipreciosProducto: async (p) => {
    try {
      await ToggleMultipreciosProducto(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  // Helpers
  generarPreciosAutomaticos: (precioBase) => {
    return generarPreciosAutomaticos(precioBase, PLANTILLAS_PRECIOS);
  },

  calcularDescuento: (precioBase, precioMultiprecio) => {
    if (!precioBase || precioBase === 0) return 0;
    return ((precioBase - precioMultiprecio) / precioBase) * 100;
  },

  obtenerPrecioAplicable: (precios, cantidad) => {
    // Encontrar el precio que aplica según la cantidad
    const precioAplicable = precios
      .filter((p) => cantidad >= (p.cantidad_minima || 1))
      .filter((p) => !p.cantidad_maxima || cantidad <= p.cantidad_maxima)
      .sort((a, b) => (b.cantidad_minima || 0) - (a.cantidad_minima || 0))[0];

    return precioAplicable;
  },
}));
