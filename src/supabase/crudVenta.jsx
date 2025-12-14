import Swal from "sweetalert2";
import { supabase } from "../index";
const tabla = "ventas";
export async function InsertarVentas(p) {
  const { error, data } = await supabase
    .from(tabla)
    .insert(p)
    .select()
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}


export async function EliminarVentasIncompletas(p) {
  const { error } = await supabase
    .from(tabla)
    .delete()
    .eq("estado", "pendiente")
    .eq("id_usuario", p.id_usuario)
    .eq("id_cierre_caja", p.id_cierre_caja);
  if (error) {
    throw new Error(error.message);
  }
}

// Eliminar TODAS las ventas pendientes de un cierre de caja (sin filtrar por usuario)
export async function EliminarVentasPendientesPorCierre(p) {
  // Primero eliminar los detalles de venta asociados
  const { data: ventasPendientes } = await supabase
    .from(tabla)
    .select("id")
    .eq("estado", "pendiente")
    .eq("id_cierre_caja", p.id_cierre_caja);
  
  if (ventasPendientes?.length > 0) {
    const ventaIds = ventasPendientes.map(v => v.id);
    
    // Eliminar detalles de venta
    await supabase
      .from("detalle_venta")
      .delete()
      .in("id_venta", ventaIds);
    
    // Eliminar las ventas pendientes
    const { error } = await supabase
      .from(tabla)
      .delete()
      .eq("estado", "pendiente")
      .eq("id_cierre_caja", p.id_cierre_caja);
    
    if (error) {
      throw new Error(error.message);
    }
  }
  
  return { eliminadas: ventasPendientes?.length || 0 };
}

// Contar ventas pendientes de un cierre de caja
export async function ContarVentasPendientes(p) {
  const { count, error } = await supabase
    .from(tabla)
    .select("*", { count: "exact", head: true })
    .eq("estado", "pendiente")
    .eq("id_cierre_caja", p.id_cierre_caja);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return count || 0;
}

// Buscar venta pendiente para recuperar al volver al POS
export async function MostrarVentaPendiente(p) {
  const { data, error } = await supabase
    .from(tabla)
    .select(`
      *,
      detalle_venta(count)
    `)
    .eq("estado", "pendiente")
    .eq("id_usuario", p.id_usuario)
    .eq("id_cierre_caja", p.id_cierre_caja)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Solo retornar si tiene productos en el detalle
  if (data && data.detalle_venta?.[0]?.count > 0) {
    return data;
  }
  
  return null;
}
export async function EliminarVenta(p) {
  const { error } = await supabase
    .from(tabla)
    .delete()
    .eq("id", p.id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function MostrarVentasXsucursal(p) {
  const { data } = await supabase
    .from(tabla)
    .select()
    .eq("id_sucursal", p.id_sucursal)
    .eq("estado", "nueva")
    .maybeSingle();

  return data;
}
export async function ConfirmarVenta(p) {
  const { data, error } = await supabase
    .from(tabla)
    .update(p)
    .eq("id", p.id)
    .select();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
