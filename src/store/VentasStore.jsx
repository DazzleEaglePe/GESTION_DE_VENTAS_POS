import { create } from "zustand";
import {
  InsertarVentas,
  EliminarVentasIncompletas,
  MostrarVentasXsucursal,
  MostrarVentaPendiente,
  useClientesProveedoresStore,
  ConfirmarVenta,
  EliminarVenta,
  supabase,
} from "../index";
import { EliminarVentasPendientesPorCierre, ContarVentasPendientes } from "../supabase/crudVenta";
import { toast } from "sonner";
const initialState = {
  items: [],
  total: 0,
  statePantallaCobro: false,
  tipocobro: "",
  stateMetodosPago: false,
  idventa: 0,
};
export const useVentasStore = create((set, get) => ({
  ...initialState,
  porcentajeCambio: 0,
  dataventas: [],
  resetState: () => {
    const { selectCliPro } = useClientesProveedoresStore.getState();
    selectCliPro([]);
    set(initialState);
  },
  // Setter directo para idventa (usado al recuperar venta pendiente)
  setIdVenta: (id) => set({ idventa: id }),
  setStatePantallaCobro: (p) =>
    set((state) => {
      if (p.data.length === 0) {
        toast.warning("Agrega productos, por favor");
        return {
          state,
        };
      } else {
        return {
          statePantallaCobro: !state.statePantallaCobro,
          tipocobro: p.tipocobro,
        };
      }
    }),
  setStateMetodosPago: () =>
    set((state) => ({ stateMetodosPago: !state.stateMetodosPago })),
  insertarVentas: async (p) => {
    const result = await InsertarVentas(p);
    set({ idventa: result?.id });
    return result;
  },
  eliminarventasIncompletas: async (p) => {
    await EliminarVentasIncompletas(p);
  },
  // Buscar venta pendiente para recuperar al volver al POS
  mostrarVentaPendiente: async (p) => {
    const response = await MostrarVentaPendiente(p);
    if (response?.id) {
      set({ idventa: response.id });
    }
    return response;
  },
  eliminarVenta: async (p) => {
    const { resetState } = get();
    await EliminarVenta(p);
    resetState();
  },
  mostrarventasxsucursal: async (p) => {
    const response = await MostrarVentasXsucursal(p);
    set({ dataventas: response });
    set({ idventa: response?.id ? response?.id : 0 });
    return response;
  },

  confirmarVenta: async (p) => {
    const { error, data } = await supabase
      .rpc("confirmar_venta", p)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
  
  // Eliminar todas las ventas pendientes de un cierre de caja
  eliminarVentasPendientesPorCierre: async (p) => {
    return await EliminarVentasPendientesPorCierre(p);
  },
  
  // Contar ventas pendientes de un cierre de caja
  contarVentasPendientes: async (p) => {
    return await ContarVentasPendientes(p);
  },
}));
