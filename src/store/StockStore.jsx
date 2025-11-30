import { create } from "zustand";
import {
  EditarStock,
  InsertarStock,
  MostrarStockXAlmacenesYProducto,
  MostrarStockXAlmacenYProducto,
  RegistrarMovimientoAtomico,
  ObtenerOCrearStock,
  MostrarStockTotalXProducto,
} from "../supabase/crudStock";

export const useStockStore = create((set) => ({
  stateModal: false,
  setStateModal: (p) => {
    set({ stateModal: p });
  },
  insertarStock: async (p) => {
    await InsertarStock(p);
  },
  dataStockXAlmacenYProducto: [],
  mostrarStockXAlmacenYProducto: async (p) => {
    const response = await MostrarStockXAlmacenYProducto(p);
    set({ dataStockXAlmacenYProducto: response });
    return response;
  },
  dataStockXAlmacenesYProducto: [],
  mostrarStockXAlmacenesYProducto: async (p) => {
    const response = await MostrarStockXAlmacenesYProducto(p);
    set({ dataStockXAlmacenesYProducto: response });
    return response;
  },
  editarStock: async (p,tipo) => {
    await EditarStock(p,tipo);
  },
  // Nuevas funciones Fase 1
  RegistrarMovimientoAtomico: async (p) => {
    await RegistrarMovimientoAtomico(p);
  },
  ObtenerOCrearStock: async (p) => {
    return await ObtenerOCrearStock(p);
  },
  // Mostrar stock total de un producto en todos los almacenes
  mostrarStockTotalXProducto: async (p) => {
    const response = await MostrarStockTotalXProducto(p);
    return response;
  },
}));
