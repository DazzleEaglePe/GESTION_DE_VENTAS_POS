import { create } from "zustand";
import {
  CrearProductoCompuesto,
  ObtenerComponentesProducto,
  ValidarStockCompuesto,
  AgregarComponente,
  EditarComponente,
  EliminarComponente,
  ObtenerProductosCompuestos,
  CalcularPrecioCompuesto,
  ObtenerProductosParaComponentes,
  DuplicarProductoCompuesto,
  TIPOS_COMPUESTO,
} from "../supabase/crudProductosCompuestos";

export const useProductosCompuestosStore = create((set, get) => ({
  // Estado
  dataComponentes: [],
  productosCompuestos: [],
  productosDisponibles: [],
  productoSeleccionado: null,
  modalAbierto: false,
  tiposCompuesto: TIPOS_COMPUESTO,

  // Setters
  setProductoSeleccionado: (producto) => set({ productoSeleccionado: producto }),
  setModalAbierto: (estado) => set({ modalAbierto: estado }),

  // Acciones
  crearProductoCompuesto: async (p) => {
    try {
      const resultado = await CrearProductoCompuesto(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerComponentesProducto: async (p) => {
    try {
      const data = await ObtenerComponentesProducto(p);
      set({ dataComponentes: data });
      return data;
    } catch (error) {
      console.error("Error al obtener componentes:", error);
      return [];
    }
  },

  validarStockCompuesto: async (p) => {
    try {
      return await ValidarStockCompuesto(p);
    } catch (error) {
      return { puede_vender: false, mensaje: error.message };
    }
  },

  agregarComponente: async (p) => {
    try {
      const resultado = await AgregarComponente(p);
      return { exito: true, data: resultado };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  editarComponente: async (p) => {
    try {
      await EditarComponente(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  eliminarComponente: async (p) => {
    try {
      await EliminarComponente(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerProductosCompuestos: async (p) => {
    try {
      const data = await ObtenerProductosCompuestos(p);
      set({ productosCompuestos: data });
      return data;
    } catch (error) {
      console.error("Error al obtener productos compuestos:", error);
      return [];
    }
  },

  obtenerProductosParaComponentes: async (p) => {
    try {
      const data = await ObtenerProductosParaComponentes(p);
      set({ productosDisponibles: data });
      return data;
    } catch (error) {
      console.error("Error al obtener productos:", error);
      return [];
    }
  },

  calcularPrecioCompuesto: async (componentes) => {
    return await CalcularPrecioCompuesto(componentes);
  },

  duplicarProductoCompuesto: async (p) => {
    try {
      const resultado = await DuplicarProductoCompuesto(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  // Helpers
  calcularTotales: () => {
    const { dataComponentes } = get();
    const costoTotal = dataComponentes.reduce(
      (sum, c) => sum + (c.precio_unitario || 0) * c.cantidad,
      0
    );
    const precioSugerido = dataComponentes.reduce(
      (sum, c) => sum + (c.precio_especial || c.precio_unitario || 0) * c.cantidad,
      0
    );
    return { costoTotal, precioSugerido };
  },

  verificarComponenteExistente: (idProducto) => {
    const { dataComponentes } = get();
    return dataComponentes.some((c) => c.id_producto_componente === idProducto);
  },

  obtenerStockMinimoKit: () => {
    const { dataComponentes } = get();
    if (!dataComponentes.length) return 0;

    return Math.min(
      ...dataComponentes
        .filter((c) => c.es_obligatorio)
        .map((c) => Math.floor((c.stock_disponible || 0) / c.cantidad))
    );
  },
}));
