import { create } from "zustand";
import {
  ConsultarAuditoria,
  ResumenAuditoria,
  RegistrarAccionUsuario,
  HistorialRegistro,
} from "../supabase/crudAuditoria";

export const useAuditoriaStore = create((set, get) => ({
  // Estado
  dataAuditoria: [],
  resumenAuditoria: null,
  historialRegistro: [],
  filtros: {
    fecha_inicio: null,
    fecha_fin: null,
    tabla: null,
    operacion: null,
    id_usuario: null,
  },
  paginacion: {
    limite: 50,
    offset: 0,
    total: 0,
  },
  isLoading: false,

  // Setters
  setFiltros: (filtros) => set({ filtros: { ...get().filtros, ...filtros } }),
  resetFiltros: () =>
    set({
      filtros: {
        fecha_inicio: null,
        fecha_fin: null,
        tabla: null,
        operacion: null,
        id_usuario: null,
      },
    }),
  setPaginacion: (paginacion) =>
    set({ paginacion: { ...get().paginacion, ...paginacion } }),

  // Acciones
  consultarAuditoria: async (p) => {
    set({ isLoading: true });
    try {
      const { filtros, paginacion } = get();
      const response = await ConsultarAuditoria({
        id_empresa: p.id_empresa,
        ...filtros,
        limite: paginacion.limite,
        offset: paginacion.offset,
      });
      set({ dataAuditoria: response, isLoading: false });
      return response;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  obtenerResumen: async (p) => {
    const { filtros } = get();
    const response = await ResumenAuditoria({
      id_empresa: p.id_empresa,
      fecha_inicio: filtros.fecha_inicio,
      fecha_fin: filtros.fecha_fin,
    });
    set({ resumenAuditoria: response });
    return response;
  },

  registrarAccion: async (p) => {
    const response = await RegistrarAccionUsuario(p);
    return response;
  },

  obtenerHistorialRegistro: async (p) => {
    const response = await HistorialRegistro(p);
    set({ historialRegistro: response });
    return response;
  },

  // Paginación
  siguientePagina: () => {
    const { paginacion } = get();
    set({
      paginacion: {
        ...paginacion,
        offset: paginacion.offset + paginacion.limite,
      },
    });
  },

  paginaAnterior: () => {
    const { paginacion } = get();
    const nuevoOffset = Math.max(0, paginacion.offset - paginacion.limite);
    set({
      paginacion: {
        ...paginacion,
        offset: nuevoOffset,
      },
    });
  },

  irAPagina: (pagina) => {
    const { paginacion } = get();
    set({
      paginacion: {
        ...paginacion,
        offset: pagina * paginacion.limite,
      },
    });
  },
}));
