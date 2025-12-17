import styled from "styled-components";
import { Paginacion, useProductosStore } from "../../../index";
import Swal from "sweetalert2";
import { useState } from "react";
import { Icon } from "@iconify/react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

export function TablaProductosInactivos({ data }) {
  const [pagina, setPagina] = useState(1);
  const [columnFilters] = useState([]);

  const { restaurarProducto } = useProductosStore();

  async function restaurar(p) {
    const result = await Swal.fire({
      title: "¿Restaurar producto?",
      html: `<p>El producto <strong>${p.nombre}</strong> volverá a estar activo.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Sí, restaurar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await restaurarProducto({ id: p.id });
        Swal.fire({
          icon: "success",
          title: "Producto restaurado",
          text: "El producto está activo nuevamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "No se pudo restaurar el producto",
        });
      }
    }
  }

  const columns = [
    {
      accessorKey: "nombre",
      header: "Producto",
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: "codigobarras",
      header: "Código",
      cell: (info) => (
        <CodeBadge>{info.getValue() || "—"}</CodeBadge>
      ),
    },
    {
      accessorKey: "p_venta",
      header: "Precio",
      cell: (info) => (
        <PriceBadge>
          {info.getValue() || "0.00"}
        </PriceBadge>
      ),
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
      cell: (info) => (
        <CategoryBadge>{info.getValue() || "—"}</CategoryBadge>
      ),
    },
    {
      accessorKey: "fecha_baja",
      header: "Desactivado",
      cell: (info) => (
        <DateBadge>
          <Icon icon="lucide:calendar" width="14" />
          {info.getValue()
            ? new Date(info.getValue()).toLocaleDateString("es-PE")
            : "—"}
        </DateBadge>
      ),
    },
    {
      accessorKey: "usuario_baja_nombre",
      header: "Por",
      cell: (info) => (
        <UserBadge>
          <Icon icon="lucide:user" width="14" />
          {info.getValue() || "Sistema"}
        </UserBadge>
      ),
    },
    {
      accessorKey: "acciones",
      header: "",
      enableSorting: false,
      cell: (info) => (
        <RestoreButton onClick={() => restaurar(info.row.original)}>
          <Icon icon="lucide:rotate-ccw" width="16" />
          Restaurar
        </RestoreButton>
      ),
    },
  ];

  const tableData = data || [];

  const table = useReactTable({
    data: tableData,
    columns,
    state: { columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!data || data.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>
          <Icon icon="lucide:package-x" width="56" />
        </EmptyIcon>
        <EmptyTitle>Sin productos inactivos</EmptyTitle>
        <EmptyText>
          Los productos desactivados aparecerán aquí
        </EmptyText>
      </EmptyState>
    );
  }

  return (
    <Container>
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

      <PaginationWrapper>
        <Paginacion
          table={table}
          pagina={pagina}
          setPagina={setPagina}
          maximo={table.getPageCount()}
        />
      </PaginationWrapper>
    </Container>
  );
}

// =====================
// STYLED COMPONENTS
// =====================

const Container = styled.div`
  padding: 0 24px 24px;
`;

const TableWrapper = styled.div`
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e5e5;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: #fafafa;
  border-bottom: 1px solid #e5e5e5;
`;

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: ${({ $sortable }) => ($sortable ? "#f0f0f0" : "transparent")};
  }

  &:last-child {
    text-align: right;
    padding-right: 20px;
  }
`;

const ThContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SortIcon = styled.span`
  display: flex;
  opacity: ${({ $sorted }) => ($sorted ? 1 : 0.4)};
  color: ${({ $sorted }) => ($sorted ? "#111" : "#9ca3af")};
  transition: all 0.15s;
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #fafafa;
  }
`;

const Td = styled.td`
  padding: 16px;
  font-size: 14px;
  color: #374151;
  vertical-align: middle;

  &:first-child {
    font-weight: 500;
    color: #111;
  }

  &:last-child {
    text-align: right;
    padding-right: 20px;
  }
`;

// Badges
const CodeBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 13px;
  font-family: "SF Mono", "Roboto Mono", monospace;
  color: #4b5563;
`;

const PriceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  background: #ecfdf5;
  color: #059669;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
`;

const DateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
`;

const UserBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
`;

const RestoreButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

// Empty State
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  background: #f9fafb;
  border-radius: 50%;
  color: #9ca3af;
  margin-bottom: 20px;
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
`;

const EmptyText = styled.p`
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
`;
