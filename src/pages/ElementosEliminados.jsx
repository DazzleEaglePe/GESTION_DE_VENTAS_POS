import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useElementosEliminadosStore } from "../store/ElementosEliminadosStore";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useMemo } from "react";
import Swal from "sweetalert2";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

// Mapeo de tablas a nombres legibles
const tablaNombres = {
  productos: "Producto",
  categorias: "Categoría",
  clientes_proveedores: "Cliente/Proveedor",
  metodos_pago: "Método de Pago",
  sucursales: "Sucursal",
  caja: "Caja",
  almacen: "Almacén",
  usuarios: "Usuario",
};

// Colores por tipo
const tablaColores = {
  productos: { bg: "#e3f2fd", text: "#1976d2" },
  categorias: { bg: "#e8f5e9", text: "#43a047" },
  clientes_proveedores: { bg: "#fff3e0", text: "#ef6c00" },
  metodos_pago: { bg: "#e0f2f1", text: "#00897b" },
  sucursales: { bg: "#fff8e1", text: "#ffa000" },
  caja: { bg: "#f3e5f5", text: "#7b1fa2" },
  almacen: { bg: "#efebe9", text: "#6d4c41" },
  usuarios: { bg: "#e8eaf6", text: "#3949ab" },
};

export function ElementosEliminados() {
  const queryClient = useQueryClient();
  const { dataempresa } = useEmpresaStore();
  const { mostrarElementosEliminados, restaurarElemento } = useElementosEliminadosStore();
  const [filtroTabla, setFiltroTabla] = useState("todos");

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["elementos-eliminados", dataempresa?.id],
    queryFn: () => mostrarElementosEliminados({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
  });

  const handleRestaurar = async (elemento) => {
    const result = await Swal.fire({
      title: "¿Restaurar elemento?",
      html: `
        <p>Se restaurará:</p>
        <p><strong>${elemento.descripcion}</strong></p>
        <p style="color: #666; font-size: 14px;">Tipo: ${tablaNombres[elemento.tabla] || elemento.tabla}</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Sí, restaurar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await restaurarElemento({ tabla: elemento.tabla, id: elemento.id });
        
        Swal.fire({
          icon: "success",
          title: "Restaurado",
          text: `${tablaNombres[elemento.tabla]} restaurado correctamente`,
          timer: 2000,
          showConfirmButton: false,
        });

        // Invalidar queries relacionadas
        queryClient.invalidateQueries(["elementos-eliminados"]);
        queryClient.invalidateQueries(["mostrar productos"]);
        queryClient.invalidateQueries(["mostrar categorias"]);
        queryClient.invalidateQueries(["mostrar clientes proveedores"]);
        queryClient.invalidateQueries(["mostrar metodos pago"]);
        queryClient.invalidateQueries(["mostrar sucursales"]);
        queryClient.invalidateQueries(["mostrar Cajas XSucursal"]);
        queryClient.invalidateQueries(["mostrar almacenes X empresa"]);
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "No se pudo restaurar el elemento",
        });
      }
    }
  };

  const columns = [
    {
      accessorKey: "tabla",
      header: "Tipo",
      cell: (info) => {
        const tabla = info.getValue();
        const colors = tablaColores[tabla] || { bg: "#f5f5f5", text: "#666" };
        return (
          <TipoBadge $bg={colors.bg} $text={colors.text}>
            <Icon icon={info.row.original.icono || "lucide:file"} width="14" />
            {tablaNombres[tabla] || tabla}
          </TipoBadge>
        );
      },
    },
    {
      accessorKey: "descripcion",
      header: "Nombre",
      cell: (info) => <NombreCell>{info.getValue()}</NombreCell>,
    },
    {
      accessorKey: "fecha_eliminacion",
      header: "Eliminado",
      cell: (info) => (
        <FechaCell>
          <Icon icon="lucide:calendar" width="14" />
          {info.getValue()
            ? new Date(info.getValue()).toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </FechaCell>
      ),
    },
    {
      accessorKey: "usuario_elimino",
      header: "Eliminado por",
      cell: (info) => (
        <UsuarioCell>
          <Icon icon="lucide:user" width="14" />
          {info.getValue() || "Sistema"}
        </UsuarioCell>
      ),
    },
    {
      accessorKey: "acciones",
      header: "",
      enableSorting: false,
      cell: (info) => (
        <RestaurarBtn onClick={() => handleRestaurar(info.row.original)}>
          <Icon icon="lucide:rotate-ccw" width="16" />
          Restaurar
        </RestaurarBtn>
      ),
    },
  ];

  // Filtrar datos por tipo - useMemo para evitar recálculos innecesarios
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return filtroTabla === "todos" 
      ? data 
      : data.filter((item) => item.tabla === filtroTabla);
  }, [data, filtroTabla]);

  // Obtener tipos únicos para el filtro
  const tiposUnicos = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map((item) => item.tabla))];
  }, [data]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <Icon icon="lucide:loader-2" className="spin" />
          <span>Cargando elementos eliminados...</span>
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <Icon icon="lucide:alert-circle" />
          <span>Error al cargar: {error.message}</span>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header */}
      <Header>
        <HeaderIcon>
          <Icon icon="lucide:trash-2" />
        </HeaderIcon>
        <HeaderContent>
          <h1>Elementos Eliminados</h1>
          <p>Recupera registros que fueron eliminados del sistema</p>
        </HeaderContent>
        <HeaderStats>
          <StatBadge>
            <Icon icon="lucide:archive" />
            {data?.length || 0} elementos
          </StatBadge>
        </HeaderStats>
      </Header>

      {/* Filtros */}
      {tiposUnicos.length > 0 && (
        <FiltersBar>
          <FilterLabel>Filtrar por tipo:</FilterLabel>
          <FilterGroup>
            <FilterBtn
              $active={filtroTabla === "todos"}
              onClick={() => setFiltroTabla("todos")}
            >
              Todos
            </FilterBtn>
            {tiposUnicos.map((tipo) => (
              <FilterBtn
                key={tipo}
                $active={filtroTabla === tipo}
                onClick={() => setFiltroTabla(tipo)}
              >
                {tablaNombres[tipo] || tipo}
              </FilterBtn>
            ))}
          </FilterGroup>
        </FiltersBar>
      )}

      {/* Contenido */}
      {filteredData.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <Icon icon="lucide:inbox" />
          </EmptyIcon>
          <EmptyTitle>No hay elementos eliminados</EmptyTitle>
          <EmptyText>
            Los registros que elimines aparecerán aquí para que puedas recuperarlos
          </EmptyText>
        </EmptyState>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <Thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        $sortable={header.column.getCanSort()}
                      >
                        <ThContent>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <SortIcon $sorted={header.column.getIsSorted()}>
                              <Icon icon="lucide:chevrons-up-down" width="14" />
                            </SortIcon>
                          )}
                        </ThContent>
                      </Th>
                    ))}
                  </tr>
                ))}
              </Thead>
              <Tbody>
                {table.getRowModel().rows.map((row) => (
                  <Tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableWrapper>

          {/* Paginación */}
          <PaginationBar>
            <PageInfo>
              Mostrando {table.getRowModel().rows.length} de {filteredData.length}
            </PageInfo>
            <PageButtons>
              <PageBtn
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <Icon icon="lucide:chevron-left" />
              </PageBtn>
              <PageNumber>
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </PageNumber>
              <PageBtn
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <Icon icon="lucide:chevron-right" />
              </PageBtn>
            </PageButtons>
          </PaginationBar>
        </>
      )}
    </Container>
  );
}

// =====================
// STYLED COMPONENTS
// =====================

const Container = styled.div`
  min-height: calc(100vh - 50px);
  margin-top: 50px;
  padding: 30px;
  background: #f5f5f5;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    font-size: 28px;
    color: #fff;
  }
`;

const HeaderContent = styled.div`
  flex: 1;

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 4px 0 0 0;
  }
`;

const HeaderStats = styled.div`
  display: flex;
  gap: 12px;
`;

const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;

  svg {
    font-size: 18px;
    color: #64748b;
  }
`;

const FiltersBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FilterLabel = styled.span`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterBtn = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${(props) => (props.$active ? "#3b82f6" : "#e2e8f0")};
  background: ${(props) => (props.$active ? "#eff6ff" : "#fff")};
  color: ${(props) => (props.$active ? "#3b82f6" : "#64748b")};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }
`;

const TableWrapper = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: ${(props) => (props.$sortable ? "pointer" : "default")};
  user-select: none;

  &:hover {
    background: ${(props) => (props.$sortable ? "#f1f5f9" : "transparent")};
  }
`;

const ThContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SortIcon = styled.span`
  opacity: ${(props) => (props.$sorted ? 1 : 0.4)};
  color: ${(props) => (props.$sorted ? "#3b82f6" : "#94a3b8")};
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 0.875rem;
  color: #334155;
`;

const TipoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: ${(props) => props.$bg};
  color: ${(props) => props.$text};
  font-size: 0.75rem;
  font-weight: 600;
`;

const NombreCell = styled.span`
  font-weight: 500;
  color: #1e293b;
`;

const FechaCell = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 0.8rem;

  svg {
    color: #94a3b8;
  }
`;

const UsuarioCell = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 0.8rem;

  svg {
    color: #94a3b8;
  }
`;

const RestaurarBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #059669;
    transform: translateY(-1px);
  }
`;

const PaginationBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
  border-radius: 0 0 16px 16px;
`;

const PageInfo = styled.span`
  font-size: 0.875rem;
  color: #64748b;
`;

const PageButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PageBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageNumber = styled.span`
  padding: 0 12px;
  font-size: 0.875rem;
  color: #334155;
  font-weight: 500;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 16px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  svg {
    font-size: 40px;
    color: #94a3b8;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  max-width: 300px;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;

  svg {
    font-size: 32px;
    color: #3b82f6;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  span {
    font-size: 0.875rem;
    color: #64748b;
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  background: #fef2f2;
  border-radius: 12px;
  color: #dc2626;

  svg {
    font-size: 24px;
  }
`;
