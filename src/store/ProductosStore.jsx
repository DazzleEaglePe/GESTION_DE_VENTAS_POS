import { create } from "zustand";
import {
  BuscarProductos,MostrarProductos,EliminarProductos,InsertarProductos,EditarProductos, Generarcodigo,
  MostrarProductosInactivos, RestaurarProducto, ValidarEliminarProducto,
  supabase
} from "../index";
const tabla ="productos"
export const useProductosStore = create((set, get) => ({
  refetchs:null,
  buscador: "",
  setBuscador: (p) => {
    set({ buscador: p });
  },
  dataProductos: [],
  dataProductosInactivos: [],
  productosItemSelect: {
    id:1
  },
  parametros: {},
  mostrarProductos: async (p) => {
    const response = await MostrarProductos(p);
    set({ parametros: p });
    set({ dataProductos: response });
    set({ productosItemSelect: response[0] });
    set({refetchs:p.refetchs})
    return response;
  },
  mostrarProductosInactivos: async (p) => {
    const response = await MostrarProductosInactivos(p);
    set({ dataProductosInactivos: response || [] });
    return response;
  },
  selectProductos: (p) => {
   
    set({ productosItemSelect: p });

  },
  resetProductosItemSelect: () => {
    set({ productosItemSelect: null });
  },
  insertarProductos: async (p) => {
  const response=  await InsertarProductos(p);
    const { mostrarProductos } = get();
    const { parametros } = get();
    set(mostrarProductos(parametros));
    return response;
  },
  // Validar antes de eliminar (para uso en UI)
  validarEliminarProducto: async (p) => {
    return await ValidarEliminarProducto(p);
  },
  // Eliminar producto con validación integrada
  eliminarProductos: async (p) => {
    const resultado = await EliminarProductos(p);
    
    // Solo refrescar si fue exitoso
    if (resultado.exito) {
      const { mostrarProductos, parametros } = get();
      set(mostrarProductos(parametros));
    }
    
    return resultado;
  },
  // Restaurar producto inactivo
  restaurarProducto: async (p) => {
    await RestaurarProducto(p);
    const { mostrarProductos, mostrarProductosInactivos, parametros } = get();
    // Refrescar ambas listas
    await mostrarProductos(parametros);
    await mostrarProductosInactivos({ id_empresa: parametros.id_empresa });
  },
  editarProductos: async (p) => {
    await EditarProductos(p);
    const { mostrarProductos } = get();
    const { parametros } = get();
    set(mostrarProductos(parametros));
  },
  buscarProductos: async (p) => {
    const response = await BuscarProductos(p);
    set({ dataProductos: response });
    return response;
  },
  codigogenerado:0,
  generarCodigo:()=>{
  const response=  Generarcodigo({id:2})
  set({codigogenerado:response})
  
 
  },
  editarPreciosProductos: async (p) => {
    const { error } = await supabase.from(tabla).update(p).eq("id", p.id);
    if (error) {
      throw new Error(error.message);
    }
  },
}));
