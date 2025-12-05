import { create } from "zustand";
import {
  RegistrarSerialIngreso,
  RegistrarSerialesLote,
  VenderSerial,
  BuscarSerial,
  ObtenerSerialesDisponibles,
  ObtenerTodosSerialesProducto,
  ActualizarEstadoSerial,
  ObtenerProductosConSeriales,
  ToggleSerialesProducto,
  ObtenerEstadisticasSeriales,
  TransferirSerial,
  GenerarReporteSeriales,
  ESTADOS_SERIAL,
} from "../supabase/crudSeriales";

export const useSerialesStore = create((set, get) => ({
  // Estado
  dataSeriales: [],
  serialesDisponibles: [],
  productosConSeriales: [],
  estadisticas: null,
  serialBuscado: null,
  productoSeleccionado: null,
  modalRegistro: false,
  modalBusqueda: false,
  estadosSerial: ESTADOS_SERIAL,

  // Setters
  setProductoSeleccionado: (producto) => set({ productoSeleccionado: producto }),
  setModalRegistro: (estado) => set({ modalRegistro: estado }),
  setModalBusqueda: (estado) => set({ modalBusqueda: estado }),
  setSerialBuscado: (serial) => set({ serialBuscado: serial }),

  // Acciones
  registrarSerialIngreso: async (p) => {
    try {
      const resultado = await RegistrarSerialIngreso(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  registrarSerialesLote: async (p) => {
    try {
      const resultado = await RegistrarSerialesLote(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  venderSerial: async (p) => {
    try {
      const resultado = await VenderSerial(p);
      return resultado;
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  buscarSerial: async (p) => {
    try {
      const resultado = await BuscarSerial(p);
      set({ serialBuscado: resultado });
      return resultado;
    } catch (error) {
      return { encontrado: false, mensaje: error.message };
    }
  },

  obtenerSerialesDisponibles: async (p) => {
    try {
      const data = await ObtenerSerialesDisponibles(p);
      set({ serialesDisponibles: data });
      return data;
    } catch (error) {
      console.error("Error al obtener seriales:", error);
      return [];
    }
  },

  obtenerTodosSerialesProducto: async (p) => {
    try {
      const data = await ObtenerTodosSerialesProducto(p);
      set({ dataSeriales: data });
      return data;
    } catch (error) {
      console.error("Error al obtener seriales:", error);
      return [];
    }
  },

  actualizarEstadoSerial: async (p) => {
    try {
      await ActualizarEstadoSerial(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerProductosConSeriales: async (p) => {
    try {
      const data = await ObtenerProductosConSeriales(p);
      set({ productosConSeriales: data });
      return data;
    } catch (error) {
      console.error("Error al obtener productos:", error);
      return [];
    }
  },

  toggleSerialesProducto: async (p) => {
    try {
      await ToggleSerialesProducto(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  obtenerEstadisticasSeriales: async (p) => {
    try {
      const data = await ObtenerEstadisticasSeriales(p);
      set({ estadisticas: data });
      return data;
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      return null;
    }
  },

  transferirSerial: async (p) => {
    try {
      await TransferirSerial(p);
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  generarReporteSeriales: async (p) => {
    try {
      return await GenerarReporteSeriales(p);
    } catch (error) {
      console.error("Error al generar reporte:", error);
      return [];
    }
  },

  // Helpers
  validarSerialUnico: (serial, serialesActuales) => {
    return !serialesActuales.some(
      (s) => s.numero_serie.toLowerCase() === serial.toLowerCase()
    );
  },

  parsearSerialesTexto: (texto) => {
    // Parsear seriales desde texto (uno por línea o separados por coma)
    return texto
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  },

  obtenerColorEstado: (estado) => {
    const estadoInfo = ESTADOS_SERIAL.find((e) => e.valor === estado);
    return estadoInfo?.color || "#6b7280";
  },

  contarPorEstado: () => {
    const { dataSeriales } = get();
    return {
      disponible: dataSeriales.filter((s) => s.estado === "disponible").length,
      vendido: dataSeriales.filter((s) => s.estado === "vendido").length,
      defectuoso: dataSeriales.filter((s) => s.estado === "defectuoso").length,
      en_garantia: dataSeriales.filter((s) => s.estado === "en_garantia").length,
    };
  },
}));
