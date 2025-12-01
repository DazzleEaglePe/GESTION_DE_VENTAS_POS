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
    .order("created_at", { ascending: false })
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
