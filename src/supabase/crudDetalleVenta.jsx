import Swal from "sweetalert2";
import { supabase } from "../index";
const tabla = "detalle_venta";

export async function InsertarDetalleVentas(p) {
  // Usar la función con validación de stock
  const { error } = await supabase.rpc("insertardetalleventa_con_validacion", p);
  if (error) {
    // Detectar tipo de error para mostrar mensaje amigable
    if (error.message.includes("STOCK_ERROR")) {
      const mensaje = error.message.replace("STOCK_ERROR: ", "");
      throw new Error(mensaje);
    }
    if (error.message.includes("VENTA_ERROR")) {
      const mensaje = error.message.replace("VENTA_ERROR: ", "");
      // Marcar como error de venta para que el frontend pueda resetear
      const err = new Error(mensaje);
      err.code = "VENTA_NO_EXISTE";
      throw err;
    }
    if (error.message.includes("PRODUCTO_ERROR")) {
      const mensaje = error.message.replace("PRODUCTO_ERROR: ", "");
      throw new Error(mensaje);
    }
    throw new Error(error.message);
  }
}

/**
 * Insertar detalle de venta con soporte para variantes, seriales y multiprecios
 * Usa la función RPC insertar_detalle_venta_v2 que valida stock y reserva seriales
 */
export async function InsertarDetalleVentasConExtras(p) {
  // Preparar parámetros para la función v2
  const params = {
    _id_venta: p._id_venta,
    _cantidad: p._cantidad,
    _precio_venta: p._precio_venta,
    _descripcion: p._descripcion,
    _id_producto: p._id_producto,
    _precio_compra: p._precio_compra,
    _id_sucursal: p._id_sucursal,
    _id_almacen: p._id_almacen,
    _id_variante: p._id_variante || null,
    _id_serial: p._id_serial || null,
    _multiprecio_aplicado: p._multiprecio_aplicado || false,
    _nivel_multiprecio: p._nivel_multiprecio || null,
    _descuento_multiprecio: p._descuento_multiprecio || 0
  };

  const { data, error } = await supabase.rpc("insertar_detalle_venta_v2", params);
  
  if (error) {
    // Manejar errores específicos
    if (error.message.includes("requiere seleccionar una variante")) {
      throw new Error("Este producto requiere que selecciones una variante");
    }
    if (error.message.includes("requiere seleccionar un número de serie")) {
      throw new Error("Este producto requiere que selecciones un número de serie");
    }
    if (error.message.includes("serial seleccionado no está disponible")) {
      throw new Error("El número de serie seleccionado ya no está disponible");
    }
    if (error.message.includes("Stock insuficiente")) {
      throw new Error(error.message);
    }
    if (error.message.includes("VENTA_NO_EXISTE")) {
      const err = new Error("La venta no existe");
      err.code = "VENTA_NO_EXISTE";
      throw err;
    }
    throw new Error(error.message);
  }
  
  return data;
}

// Función auxiliar para verificar stock antes de agregar al carrito
export async function VerificarStockDisponible(p) {
  const { data, error } = await supabase.rpc("verificar_stock_disponible", {
    _id_producto: p.id_producto,
    _id_almacen: p.id_almacen,
    _id_venta: p.id_venta || null
  });
  if (error) {
    throw new Error(error.message);
  }
  return data?.[0] || { stock_actual: 0, cantidad_en_carrito: 0, stock_disponible: 0 };
}

export async function EditarCantidadDetalleVenta(p) {
  const { error } = await supabase.rpc("editarcantidaddv", p);
  if (error) {
    throw new Error(error.message);
  }
}
export async function MostrarDetalleVenta(p) {
  const { data, error } = await supabase
    .from(tabla)
    .select(`*, ventas(*),productos(*)`)
    .eq("id_venta", p.id_venta);
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function EliminarDetalleVentas(p) {
  const { error } = await supabase.from(tabla).delete().eq("id", p.id);
  if (error) {
    throw new Error(error.message);
  }
}
export async function Mostrartop5productosmasvendidosxcantidad(p) {
  const { data } = await supabase.rpc(
    "mostrartop5productosmasvendidosxcantidad",
    p
  );
  return data;
}
export async function Mostrartop10productosmasvendidosxmonto(p) {
  const { data } = await supabase.rpc(
    "mostrartop10productosmasvendidosxmonto",
    p
  );
  return data;
}
