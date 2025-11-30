import { useQuery } from "@tanstack/react-query";
import { InventarioTemplate } from "../components/templates/InventarioTemplate";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useProductosStore } from "../store/ProductosStore";
import { useSucursalesStore } from "../store/SucursalesStore";
import { useCategoriasStore } from "../store/CategoriasStore";
import { BarLoader } from "react-spinners";
import styled from "styled-components";

export const Inventario = () => {
  const { dataempresa } = useEmpresaStore();
  const { mostrarProductos } = useProductosStore();
  const { mostrarSucursales } = useSucursalesStore();
  const { mostrarCategorias } = useCategoriasStore();

  // Cargar productos
  const { isLoading: isLoadingProductos } = useQuery({
    queryKey: ["mostrar productos", dataempresa?.id],
    queryFn: () => mostrarProductos({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa,
  });

  // Cargar sucursales
  const { isLoading: isLoadingSucursales } = useQuery({
    queryKey: ["mostrar sucursales", dataempresa?.id],
    queryFn: () => mostrarSucursales({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa,
  });

  // Cargar categorías
  const { isLoading: isLoadingCategorias } = useQuery({
    queryKey: ["mostrar categorias", dataempresa?.id],
    queryFn: () => mostrarCategorias({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa,
  });

  const isLoading = isLoadingProductos || isLoadingSucursales || isLoadingCategorias;

  if (isLoading) {
    return (
      <LoadingContainer>
        <BarLoader color="#6366f1" />
        <span>Cargando inventario...</span>
      </LoadingContainer>
    );
  }

  return <InventarioTemplate />;
};

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
  color: #6b7280;
  font-size: 14px;
`;
