import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useSucursalesStore } from "../store/SucursalesStore";
import { useImpresorasStore } from "../store/ImpresorasStore";
import { toast } from "sonner";
import { useAsignacionCajaSucursalStore } from "../store/AsignacionCajaSucursalStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useProductosStore } from "../store/ProductosStore";
import { ConvertirMinusculas } from "../utils/Conversiones";
import { useCategoriasStore } from "../store/CategoriasStore";
import { useMovStockStore } from "../store/MovStockStore";
import { useAlmacenesStore } from "../store/AlmacenesStore";
import { useFormattedDate } from "../hooks/useFormattedDate";
import { useStockStore } from "../store/StockStore";
import { useGlobalStore } from "../store/GlobalStore";

// export const useBuscarProductosQuery = () => {
//   const { buscador, buscarProductos } = useProductosStore();
//   const { dataempresa } = useEmpresaStore();

//   return useQuery({
//     queryKey: ["buscar productos", buscador],
//     queryFn: () =>
//       buscarProductos({
//         id_empresa: dataempresa?.id,
//         buscador: buscador,
//       }),
//     enabled: !!dataempresa,
//   });
// };
export const useInsertarMovStockMutation = (proveedorSelect) => {
  const queryClient = useQueryClient();
  const {  productosItemSelect,resetProductosItemSelect } = useProductosStore();
 const { itemSelect ,setStateClose} = useGlobalStore();
  const { tipo } = useMovStockStore();
  const {  dataStockXAlmacenYProducto:dataStock, RegistrarMovimientoAtomico } = useStockStore();
  const { almacenSelectItem } =
    useAlmacenesStore();
   
  const fechaActual = useFormattedDate();
  
  return useMutation({
    mutationKey: ["insertar movimiento stock"],
    mutationFn: async (data) => {
      // Construir el objeto movimiento para la función atómica
      const movimiento = {
        id_almacen: almacenSelectItem?.id,
        id_producto: productosItemSelect?.id,
        tipo_movimiento: tipo,
        cantidad: parseFloat(data.cantidad),
        fecha: fechaActual,
        detalle: "registro de inventario manual",
        origen: "inventario",
        id_proveedor: tipo === "ingreso" ? (proveedorSelect?.id || null) : null,
      };
      
      // Parámetros para la función atómica
      const params = {
        movimiento: movimiento,
        tipo: tipo,
        id_stock: dataStock?.id || null,
        cantidad: parseFloat(data.cantidad),
        precio_compra: parseFloat(data.precio_compra),
        precio_venta: parseFloat(data.precio_venta),
        id_producto: productosItemSelect?.id,
      };
      
      // Una sola llamada que hace todo atómicamente
      await RegistrarMovimientoAtomico(params);
    },
    onError: (error) => {
      toast.error("Error:" + error.message);
    },
    onSuccess: () => {
      toast.success("Registro guardado correctamente");
      queryClient.invalidateQueries(["buscar productos"]);
      setStateClose(false)
      resetProductosItemSelect()
    },
  });
};
