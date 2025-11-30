import { useQuery } from "@tanstack/react-query";
import { ConfiguracionesTemplate, Spinner1, useUsuariosStore } from "../index";
import { usePermisosStore } from "../store/PermisosStore";

export function Configuraciones() {
  const { datausuarios } = useUsuariosStore();
  const { mostrarPermisosConfiguracion, dataPermisosConfiguracion } = usePermisosStore();

  const { isLoading, error } = useQuery({
    queryKey: ["mostrar permisos configuracion", datausuarios?.id],
    queryFn: () => mostrarPermisosConfiguracion({ id_usuario: datausuarios.id }),
    enabled: !!datausuarios?.id,
    retry: 2,
    staleTime: 30000,
  });

  if (!datausuarios?.id || isLoading) {
    return <Spinner1 />;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Error al cargar configuración</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  return <ConfiguracionesTemplate />;
}
