import { supabase } from "../index";

/**
 * Hook/utilidades para manejar las nuevas funcionalidades en el POS:
 * - Multiprecios (precio según cantidad)
 * - Variantes (selección de variante)
 * - Seriales (selección/registro de serial)
 * - Productos Compuestos (validación de stock de componentes)
 */

// ============================================================
// MULTIPRECIOS - Obtener precio según cantidad
// ============================================================

/**
 * Obtiene el precio aplicable según la cantidad del producto
 * @param {number} idProducto - ID del producto
 * @param {number} cantidad - Cantidad a comprar
 * @returns {Object} { precio, nombre_nivel, es_multiprecio }
 */
export async function ObtenerPrecioSegunCantidad(idProducto, cantidad) {
  // Primero verificar si el producto maneja multiprecios
  const { data: producto, error: errorProducto } = await supabase
    .from("productos")
    .select("precio_venta, maneja_multiprecios")
    .eq("id", idProducto)
    .single();

  if (errorProducto) throw new Error(errorProducto.message);

  // Si no maneja multiprecios, devolver precio base
  if (!producto.maneja_multiprecios) {
    return {
      precio: producto.precio_venta,
      nombre_nivel: "Precio Base",
      es_multiprecio: false,
    };
  }

  // Buscar multiprecio aplicable
  const { data: multiprecios, error: errorMulti } = await supabase
    .from("multiprecios")
    .select("*")
    .eq("id_producto", idProducto)
    .lte("cantidad_minima", cantidad)
    .order("cantidad_minima", { ascending: false })
    .limit(1);

  if (errorMulti) throw new Error(errorMulti.message);

  if (multiprecios && multiprecios.length > 0) {
    const multiprecio = multiprecios[0];
    // Verificar si la cantidad máxima aplica
    if (multiprecio.cantidad_maxima === null || cantidad <= multiprecio.cantidad_maxima) {
      return {
        precio: multiprecio.precio_venta,
        nombre_nivel: multiprecio.nombre || "Precio por Volumen",
        es_multiprecio: true,
        descuento: ((producto.precio_venta - multiprecio.precio_venta) / producto.precio_venta * 100).toFixed(1),
      };
    }
  }

  // Devolver precio base si no aplica ningún multiprecio
  return {
    precio: producto.precio_venta,
    nombre_nivel: "Precio Base",
    es_multiprecio: false,
  };
}

/**
 * Obtiene todos los niveles de precio de un producto
 */
export async function ObtenerNivelesMultiprecio(idProducto) {
  const { data, error } = await supabase
    .from("multiprecios")
    .select("*")
    .eq("id_producto", idProducto)
    .order("cantidad_minima", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================
// VARIANTES - Verificar y obtener variantes
// ============================================================

/**
 * Verifica si el producto tiene variantes configuradas
 */
export async function VerificarProductoConVariantes(idProducto) {
  const { data: producto, error } = await supabase
    .from("productos")
    .select("tiene_variantes")
    .eq("id", idProducto)
    .single();

  if (error) throw new Error(error.message);
  return producto?.tiene_variantes || false;
}

/**
 * Obtiene las variantes disponibles de un producto
 */
export async function ObtenerVariantesProducto(idProducto) {
  const { data, error } = await supabase
    .from("producto_variantes")
    .select(`
      *,
      productos!producto_variantes_id_producto_fkey(nombre, precio_venta)
    `)
    .eq("id_producto", idProducto);

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Obtiene los atributos y valores de una variante
 */
export async function ObtenerAtributosVariante(idVariante) {
  const { data, error } = await supabase
    .from("producto_variantes")
    .select("atributos_valores")
    .eq("id", idVariante)
    .single();

  if (error) throw new Error(error.message);

  if (!data?.atributos_valores || data.atributos_valores.length === 0) {
    return [];
  }

  // Obtener los nombres de los atributos
  const { data: valores, error: errorValores } = await supabase
    .from("atributo_valores")
    .select(`
      id,
      valor,
      codigo_color,
      atributos(nombre)
    `)
    .in("id", data.atributos_valores);

  if (errorValores) throw new Error(errorValores.message);
  return valores || [];
}

// ============================================================
// SERIALES - Verificar y seleccionar seriales
// ============================================================

/**
 * Verifica si el producto maneja seriales
 */
export async function VerificarProductoConSeriales(idProducto) {
  const { data: producto, error } = await supabase
    .from("productos")
    .select("maneja_seriales")
    .eq("id", idProducto)
    .single();

  if (error) throw new Error(error.message);
  return producto?.maneja_seriales || false;
}

/**
 * Obtiene seriales disponibles para un producto en un almacén específico
 */
export async function ObtenerSerialesDisponiblesParaVenta(idProducto, idAlmacen) {
  const { data, error } = await supabase
    .from("producto_seriales")
    .select("*")
    .eq("id_producto", idProducto)
    .eq("id_almacen", idAlmacen)
    .eq("estado", "disponible")
    .order("fecha_ingreso", { ascending: true }); // FIFO

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Reserva un serial para la venta (marca como vendido)
 */
export async function ReservarSerialParaVenta(idSerial, idVenta) {
  const { error } = await supabase
    .from("producto_seriales")
    .update({
      estado: "vendido",
      id_venta: idVenta,
      fecha_venta: new Date().toISOString(),
    })
    .eq("id", idSerial);

  if (error) throw new Error(error.message);
}

/**
 * Libera un serial (en caso de cancelar la venta)
 */
export async function LiberarSerial(idSerial) {
  const { error } = await supabase
    .from("producto_seriales")
    .update({
      estado: "disponible",
      id_venta: null,
      fecha_venta: null,
    })
    .eq("id", idSerial);

  if (error) throw new Error(error.message);
}

// ============================================================
// PRODUCTOS COMPUESTOS - Validación y descuento de stock
// ============================================================

/**
 * Verifica si el producto es compuesto (kit/combo)
 */
export async function VerificarProductoCompuesto(idProducto) {
  const { data: producto, error } = await supabase
    .from("productos")
    .select("es_compuesto, tipo_compuesto")
    .eq("id", idProducto)
    .single();

  if (error) throw new Error(error.message);
  return {
    es_compuesto: producto?.es_compuesto || false,
    tipo: producto?.tipo_compuesto || null,
  };
}

/**
 * Obtiene los componentes de un producto compuesto
 */
export async function ObtenerComponentesProductoCompuesto(idProducto) {
  const { data, error } = await supabase
    .from("productos_compuestos")
    .select(`
      *,
      productos!productos_compuestos_id_producto_componente_fkey(
        id,
        nombre,
        precio_venta,
        precio_compra
      )
    `)
    .eq("id_producto_compuesto", idProducto);

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Valida que haya stock suficiente de todos los componentes
 */
export async function ValidarStockComponentes(idProducto, idAlmacen, cantidadKits = 1) {
  const componentes = await ObtenerComponentesProductoCompuesto(idProducto);

  if (componentes.length === 0) {
    return { valido: true, mensaje: "Sin componentes", componentes: [] };
  }

  const resultados = [];

  for (const comp of componentes) {
    const cantidadNecesaria = comp.cantidad * cantidadKits;

    // Verificar stock del componente
    const { data: stock, error } = await supabase
      .from("stock")
      .select("cantidad")
      .eq("id_producto", comp.id_producto_componente)
      .eq("id_almacen", idAlmacen)
      .single();

    const stockActual = stock?.cantidad || 0;
    const suficiente = stockActual >= cantidadNecesaria;

    resultados.push({
      id_componente: comp.id_producto_componente,
      nombre: comp.productos?.nombre,
      cantidad_necesaria: cantidadNecesaria,
      stock_actual: stockActual,
      suficiente,
      faltante: suficiente ? 0 : cantidadNecesaria - stockActual,
    });
  }

  const todosSuficiente = resultados.every((r) => r.suficiente);

  return {
    valido: todosSuficiente,
    mensaje: todosSuficiente
      ? "Stock suficiente"
      : "Stock insuficiente en componentes",
    componentes: resultados,
  };
}

// ============================================================
// UTILIDAD PRINCIPAL - Verificar características del producto
// ============================================================

/**
 * Verifica todas las características especiales de un producto
 * para saber qué modales/acciones mostrar antes de agregar al carrito
 */
export async function VerificarCaracteristicasProducto(idProducto) {
  const { data: producto, error } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      precio_venta,
      tiene_variantes,
      maneja_multiprecios,
      maneja_seriales,
      es_compuesto,
      tipo_compuesto
    `)
    .eq("id", idProducto)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: producto.id,
    descripcion: producto.nombre,
    precio_base: producto.precio_venta,
    tieneVariantes: producto.tiene_variantes || false,
    tieneMultiprecios: producto.maneja_multiprecios || false,
    tieneSeriales: producto.maneja_seriales || false,
    esCompuesto: producto.es_compuesto || false,
    tipoCompuesto: producto.tipo_compuesto,
    // Indica si necesita interacción del usuario antes de agregar
    requiereInteraccion:
      producto.tiene_variantes ||
      producto.maneja_seriales ||
      producto.es_compuesto,
  };
}

/**
 * Prepara un producto para agregarlo al carrito con todas las validaciones
 */
export async function PrepararProductoParaCarrito({
  idProducto,
  idAlmacen,
  cantidad = 1,
  idVariante = null,
  idSerial = null,
}) {
  // Verificar características
  const caracteristicas = await VerificarCaracteristicasProducto(idProducto);

  // Si tiene multiprecios, obtener precio según cantidad
  let precioFinal = caracteristicas.precio_base;
  let infoMultiprecio = null;

  if (caracteristicas.tieneMultiprecios) {
    infoMultiprecio = await ObtenerPrecioSegunCantidad(idProducto, cantidad);
    precioFinal = infoMultiprecio.precio;
  }

  // Si es compuesto, validar stock de componentes
  let infoComponentes = null;
  if (caracteristicas.esCompuesto) {
    infoComponentes = await ValidarStockComponentes(idProducto, idAlmacen, cantidad);
    if (!infoComponentes.valido) {
      return {
        exito: false,
        error: "STOCK_COMPONENTES",
        mensaje: infoComponentes.mensaje,
        detalles: infoComponentes.componentes,
      };
    }
  }

  return {
    exito: true,
    producto: {
      id_producto: idProducto,
      descripcion: caracteristicas.descripcion,
      precio_unitario: precioFinal,
      cantidad,
      precio_base: caracteristicas.precio_base,
      id_variante: idVariante,
      id_serial: idSerial,
    },
    info: {
      multiprecio: infoMultiprecio,
      componentes: infoComponentes,
      caracteristicas,
    },
  };
}
