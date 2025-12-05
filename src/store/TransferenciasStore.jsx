import { create } from "zustand";
import {
  CrearTransferencia,
  EnviarTransferencia,
  RecibirTransferencia,
  CancelarTransferencia,
  ConsultarTransferencias,
  ObtenerDetalleTransferencia,
  EstadisticasTransferencias,
  TransferenciasRecientes,
} from "../supabase/crudTransferencias";

export const useTransferenciasStore = create((set, get) => ({
  // Estado
  transferencias: [],
  detalleActual: [],
  estadisticas: null,
  transferenciasRecientes: [],
  loading: false,
  error: null,

  // Transferencia seleccionada para modal
  transferenciaSeleccionada: null,

  // Filtros
  filtros: {
    estado: null,
    id_almacen: null,
    fecha_inicio: null,
    fecha_fin: null,
  },

  // Setters
  setFiltros: (filtros) =>
    set((state) => ({
      filtros: { ...state.filtros, ...filtros },
    })),

  resetFiltros: () =>
    set({
      filtros: {
        estado: null,
        id_almacen: null,
        fecha_inicio: null,
        fecha_fin: null,
      },
    }),

  setTransferenciaSeleccionada: (transferencia) =>
    set({ transferenciaSeleccionada: transferencia }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Acciones principales

  /**
   * Crear una nueva transferencia
   */
  crearTransferencia: async (params) => {
    set({ loading: true, error: null });

    try {
      const resultado = await CrearTransferencia(params);
      
      if (!resultado.exito) {
        set({ loading: false });
        return resultado;
      }

      // Refrescar lista
      const { consultarTransferencias } = get();
      await consultarTransferencias(params.id_empresa, true);

      set({ loading: false });
      return resultado;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Enviar transferencia
   */
  enviarTransferencia: async (params) => {
    set({ loading: true, error: null });

    try {
      const resultado = await EnviarTransferencia(params);
      
      if (!resultado.exito) {
        set({ loading: false });
        return resultado;
      }

      set({ loading: false });
      return resultado;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Recibir transferencia
   */
  recibirTransferencia: async (params) => {
    set({ loading: true, error: null });

    try {
      const resultado = await RecibirTransferencia(params);
      
      if (!resultado.exito) {
        set({ loading: false });
        return resultado;
      }

      set({ loading: false });
      return resultado;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Cancelar transferencia
   */
  cancelarTransferencia: async (params) => {
    set({ loading: true, error: null });

    try {
      const resultado = await CancelarTransferencia(params);
      
      if (!resultado.exito) {
        set({ loading: false });
        return resultado;
      }

      set({ loading: false });
      return resultado;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Consultar transferencias
   */
  consultarTransferencias: async (id_empresa, reset = false) => {
    const { filtros } = get();
    set({ loading: true, error: null });

    try {
      const data = await ConsultarTransferencias({
        id_empresa,
        ...filtros,
      });

      set({
        transferencias: data,
        loading: false,
      });

      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Obtener detalle de transferencia
   */
  obtenerDetalle: async (id_transferencia) => {
    set({ loading: true, error: null });

    try {
      const data = await ObtenerDetalleTransferencia({ id_transferencia });
      set({ detalleActual: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Obtener estadísticas
   */
  obtenerEstadisticas: async (id_empresa, fecha_inicio = null, fecha_fin = null) => {
    set({ loading: true, error: null });

    try {
      const data = await EstadisticasTransferencias({
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
   * Obtener transferencias recientes
   */
  obtenerRecientes: async (id_empresa, limite = 10) => {
    try {
      const data = await TransferenciasRecientes({ id_empresa, limite });
      set({ transferenciasRecientes: data });
      return data;
    } catch (error) {
      console.error("Error al obtener recientes:", error);
      throw error;
    }
  },

  // Limpiar estado
  limpiarEstado: () =>
    set({
      transferencias: [],
      detalleActual: [],
      estadisticas: null,
      transferenciasRecientes: [],
      transferenciaSeleccionada: null,
      error: null,
    }),
}));
