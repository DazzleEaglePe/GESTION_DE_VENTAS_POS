import { create } from "zustand";
import {
  InsertarDetalleVentas,
  InsertarDetalleVentasConExtras,
  MostrarDetalleVenta,
  EliminarDetalleVentas,
  Mostrartop5productosmasvendidosxcantidad,
  Mostrartop10productosmasvendidosxmonto,
  EditarCantidadDetalleVenta,
} from "../index";

function calcularTotal(items) {
  return items.reduce(
    (total, item) => total + item.precio_venta * item.cantidad,
    0
  );
}

export const useDetalleVentasStore = create((set, get) => ({
  datadetalleventa: [],
  parametros: {},
  total: 0,
  
  mostrardetalleventa: async (p) => {
    const response = await MostrarDetalleVenta(p);
    set({ datadetalleventa: response });
    set({ total: calcularTotal(response) });
    return response;
  },
  
  /**
   * Insertar detalle de venta - determina automáticamente si usar función estándar o con extras
   * Si tiene _id_variante, _id_serial o _multiprecio_aplicado, usa la función v2
   */
  insertarDetalleVentas: async (p) => {
    // Verificar si tiene datos especiales (variante, serial, multiprecio)
    const tieneExtras = p._id_variante || p._id_serial || p._multiprecio_aplicado;
    
    if (tieneExtras) {
      // Usar la función v2 con soporte para extras
      await InsertarDetalleVentasConExtras(p);
    } else {
      // Usar la función estándar
      await InsertarDetalleVentas(p);
    }
  },
  
  /**
   * Insertar detalle de venta con datos especiales (variantes, seriales, multiprecios)
   */
  insertarDetalleVentasConExtras: async (p) => {
    await InsertarDetalleVentasConExtras(p);
  },
  
  eliminardetalleventa: async (p) => {
    await EliminarDetalleVentas(p);
  },
  
  mostrartop5productosmasvendidosxcantidad: async (p) => {
    const response = Mostrartop5productosmasvendidosxcantidad(p);
    return response;
  },
  
  mostrartop10productosmasvendidosxmonto: async (p) => {
    const response = Mostrartop10productosmasvendidosxmonto(p);
    return response;
  },
  
  editarCantidadDetalleVenta: async (p) => {
    await EditarCantidadDetalleVenta(p);
  },
}));
