import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCierreCajaStore } from "../store/CierreCajaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useVentasStore } from "../store/VentasStore";
import { toast } from "sonner";

// Hook para recuperar venta pendiente al volver al POS
export const useMostrarVentaPendienteQuery = () => {
  const { mostrarVentaPendiente } = useVentasStore();
  const { datausuarios } = useUsuariosStore();
  const { dataCierreCaja } = useCierreCajaStore();

  return useQuery({
    queryKey: ["venta pendiente", { 
      id_usuario: datausuarios?.id, 
      id_cierre_caja: dataCierreCaja?.id 
    }],
    queryFn: () => mostrarVentaPendiente({
      id_usuario: datausuarios?.id,
      id_cierre_caja: dataCierreCaja?.id,
    }),
    enabled: !!datausuarios?.id && !!dataCierreCaja?.id,
    staleTime: 0, // Siempre verificar al montar
    refetchOnMount: true,
  });
};

export const useEliminarVentasIncompletasMutate = () => {
  const queryClient = useQueryClient();
  const { eliminarventasIncompletas } = useVentasStore();
  const { datausuarios } = useUsuariosStore();
  const { dataCierreCaja } = useCierreCajaStore();
  return useMutation({
    mutationKey: ["eliminar ventas incompletas"],
    mutationFn: async () => {
      await eliminarventasIncompletas({
        id_usuario: datausuarios?.id,
        id_cierre_caja: dataCierreCaja?.id,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mostrar detalle venta"]);
      queryClient.invalidateQueries(["venta pendiente"]);
    },
  });
};
