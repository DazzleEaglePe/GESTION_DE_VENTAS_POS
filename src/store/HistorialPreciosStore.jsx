import { create } from "zustand";
import {
  ConsultarHistorialPreciosProducto,
  ConsultarHistorialPreciosEmpresa,
  ObtenerEstadisticasPrecios,
  RegistrarCambioPrecio,
  ObtenerPrecioEnFecha,
  ConsultarUltimosCambiosPrecios,
} from "../supabase/crudHistorialPrecios";

export const useHistorialPreciosStore = create((set, get) => ({
  // Estado
  historialProducto: [],
  historialEmpresa: [],
  estadisticas: null,
  ultimosCambios: [],
  loading: false,
  error: null,

  // Filtros
  filtros: {
    fecha_inicio: null,
    fecha_fin: null,
    id_categoria: null,
    tipo_cambio: null,
  },

  // Paginación
  paginacion: {
    limite: 50,
    offset: 0,
    hasMore: true,
  },

  // Setters
  setFiltros: (filtros) =>
    set((state) => ({
      filtros: { ...state.filtros, ...filtros },
    })),

  resetFiltros: () =>
    set({
      filtros: {
        fecha_inicio: null,
        fecha_fin: null,
        id_categoria: null,
        tipo_cambio: null,
      },
    }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Acciones principales

  /**
   * Consultar historial de precios de un producto específico
   */
  consultarHistorialProducto: async (id_producto, reset = false) => {
    const { paginacion } = get();
    set({ loading: true, error: null });

    try {
      const data = await ConsultarHistorialPreciosProducto({
        id_producto,
        limite: paginacion.limite,
        offset: reset ? 0 : paginacion.offset,
      });

      set((state) => ({
        historialProducto: reset
          ? data
          : [...state.historialProducto, ...data],
        paginacion: {
          ...state.paginacion,
          offset: reset ? paginacion.limite : state.paginacion.offset + paginacion.limite,
          hasMore: data.length === paginacion.limite,
        },
        loading: false,
      }));

      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Consultar historial de precios de toda la empresa
   */
  consultarHistorialEmpresa: async (id_empresa, reset = false) => {
    const { filtros, paginacion } = get();
    set({ loading: true, error: null });

    try {
      const data = await ConsultarHistorialPreciosEmpresa({
        id_empresa,
        ...filtros,
        limite: paginacion.limite,
        offset: reset ? 0 : paginacion.offset,
      });

      set((state) => ({
        historialEmpresa: reset ? data : [...state.historialEmpresa, ...data],
        paginacion: {
          ...state.paginacion,
          offset: reset ? paginacion.limite : state.paginacion.offset + paginacion.limite,
          hasMore: data.length === paginacion.limite,
        },
        loading: false,
      }));

      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Obtener estadísticas de cambios de precio
   */
  obtenerEstadisticas: async (id_empresa, fecha_inicio = null, fecha_fin = null) => {
    set({ loading: true, error: null });

    try {
      const data = await ObtenerEstadisticasPrecios({
        id_empresa,
        fecha_inicio,
        fecha_fin,
      });

      set({ estadisticas: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Registrar cambio de precio manualmente
   */
  registrarCambioPrecio: async (params) => {
    set({ loading: true, error: null });

    try {
      const resultado = await RegistrarCambioPrecio(params);
      set({ loading: false });
      return resultado;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Obtener precio en una fecha específica
   */
  obtenerPrecioEnFecha: async (id_producto, fecha) => {
    try {
      const data = await ObtenerPrecioEnFecha({ id_producto, fecha });
      return data;
    } catch (error) {
      console.error("Error al obtener precio en fecha:", error);
      throw error;
    }
  },

  /**
   * Consultar últimos cambios (para widgets/dashboards)
   */
  consultarUltimosCambios: async (id_empresa, limite = 10) => {
    set({ loading: true, error: null });

    try {
      const data = await ConsultarUltimosCambiosPrecios({
        id_empresa,
        limite,
      });

      set({ ultimosCambios: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Limpiar estado
  limpiarHistorial: () =>
    set({
      historialProducto: [],
      historialEmpresa: [],
      estadisticas: null,
      ultimosCambios: [],
      error: null,
      paginacion: {
        limite: 50,
        offset: 0,
        hasMore: true,
      },
    }),
}));
