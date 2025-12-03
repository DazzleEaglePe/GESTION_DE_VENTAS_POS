import { create } from "zustand";
import { 
  MostrarElementosEliminados, 
  RestaurarElemento, 
  EliminarPermanente 
} from "../supabase/crudElementosEliminados";

export const useElementosEliminadosStore = create((set, get) => ({
  dataElementosEliminados: [],
  elementoSelect: null,
  stateModalRestaurar: false,
  
  setStateModalRestaurar: (state) => set({ stateModalRestaurar: state }),
  setElementoSelect: (elemento) => set({ elementoSelect: elemento }),
  
  mostrarElementosEliminados: async (p) => {
    const response = await MostrarElementosEliminados(p);
    set({ dataElementosEliminados: response });
    return response;
  },
  
  restaurarElemento: async (p) => {
    const resultado = await RestaurarElemento(p);
    return resultado;
  },
  
  eliminarPermanente: async (p) => {
    const resultado = await EliminarPermanente(p);
    return resultado;
  },
}));
