import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

export function TablaInventarios({ data }) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);

  const columns = [
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: (info) => {
        const fecha = info.getValue();
        if (!fecha) return "-";
        const date = new Date(fecha);
        return (
          <DateCell>
            <Icon icon="lucide:calendar" width="14" />
            {date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
          </DateCell>
        );
      },
    },
    {
      accessorKey: "almacen.sucursales.nombre",
      header: "Sucursal",
      cell: (info) => (
        <LocationCell>
          <Icon icon="lucide:building-2" width="14" />
          {info.getValue() || "-"}
        </LocationCell>
      ),
    },
    {
      accessorKey: "almacen.nombre",
      header: "Almacén",
      cell: (info) => (
        <LocationCell>
          <Icon icon="lucide:warehouse" width="14" />
          {info.getValue() || "-"}
        </LocationCell>
      ),
    },
    {
      accessorKey: "detalle",
      header: "Movimiento",
      cell: (info) => <span>{info.getValue() || "-"}</span>,
    },
    {
      accessorKey: "proveedor.nombres",
      header: "Proveedor",
      cell: (info) => {
        const proveedor = info.getValue();
        if (!proveedor) return <span style={{ color: '#9ca3af' }}>-</span>;
        return (
          <ProveedorCell>
            <Icon icon="lucide:truck" width="14" />
            {proveedor}
          </ProveedorCell>
        );
      },
    },
    {
      accessorKey: "origen",
      header: "Origen",
      cell: (info) => {
        const origen = info.getValue();
        return (
          <OriginBadge $type={origen}>
            {origen || "-"}
          </OriginBadge>
        );
      },
    },
    {
      accessorKey: "tipo_movimiento",
      header: "Tipo",
      cell: (info) => {
        const tipo = info.getValue();
        const isIngreso = tipo?.toLowerCase() === "ingreso";
        return (
          <TypeBadge $isIngreso={isIngreso}>
            <Icon icon={isIngreso ? "lucide:arrow-down-circle" : "lucide:arrow-up-circle"} width="14" />
            {tipo || "-"}
          </TypeBadge>
        );
      },
    },
    {
      accessorKey: "cantidad",
      header: "Cantidad",
      cell: (info) => {
        const row = info.row.original;
        const tipo = row.tipo_movimiento?.toLowerCase();
        const isIngreso = tipo === "ingreso";
        return (
          <QuantityCell $isIngreso={isIngreso}>
            {isIngreso ? "+" : "-"}{info.getValue() || 0}
          </QuantityCell>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  if (!data || data.length === 0) {
    return (
      <EmptyState>
        <Icon icon="lucide:inbox" width="48" />
        <h4>Sin movimientos</h4>
        <p>No hay movimientos de inventario para este producto</p>
      </EmptyState>
    );
  }

  return (
    <Container>
      <TableWrapper>
        <Table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    $sortable={header.column.getCanSort()}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <ThContent>
                      {header.column.columnDef.header}
                      {header.column.getCanSort() && (
                        <SortIcon>
                          {header.column.getIsSorted() === "asc" ? (
                            <Icon icon="lucide:chevron-up" width="14" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <Icon icon="lucide:chevron-down" width="14" />
                          ) : (
                            <Icon icon="lucide:chevrons-up-down" width="14" />
                          )}
                        </SortIcon>
                      )}
                    </ThContent>
                  </Th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      {/* Pagination */}
      <Pagination>
        <PageInfo>
          Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            data.length
          )}{" "}
          de {data.length}
        </PageInfo>
        <PageControls>
          <PageButton
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <Icon icon="lucide:chevron-left" width="18" />
          </PageButton>
          <PageNumber>
            {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </PageNumber>
          <PageButton
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <Icon icon="lucide:chevron-right" width="18" />
          </PageButton>
        </PageControls>
      </Pagination>
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  width: 100%;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: ${({ $sortable }) => ($sortable ? "#f3f4f6" : "#f9fafb")};
  }
`;

const ThContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SortIcon = styled.span`
  color: #9ca3af;
  display: flex;
  align-items: center;
`;

const Tr = styled.tr`
  transition: background 0.15s;

  &:hover {
    background: #f9fafb;
  }

  &:not(:last-child) td {
    border-bottom: 1px solid #f3f4f6;
  }
`;

const Td = styled.td`
  padding: 14px 16px;
  color: #374151;
  vertical-align: middle;
`;

const DateCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 13px;

  svg {
    color: #9ca3af;
  }
`;

const LocationCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;

  svg {
    color: #9ca3af;
  }
`;

const ProveedorCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
  font-size: 13px;

  svg {
    color: #6366f1;
  }
`;

const OriginBadge = styled.span`
  display: inline-flex;
  padding: 4px 10px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
`;

const TypeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $isIngreso }) => ($isIngreso ? "#dcfce7" : "#fef2f2")};
  color: ${({ $isIngreso }) => ($isIngreso ? "#166534" : "#dc2626")};

  svg {
    color: inherit;
  }
`;

const QuantityCell = styled.span`
  font-weight: 700;
  font-size: 15px;
  color: ${({ $isIngreso }) => ($isIngreso ? "#16a34a" : "#dc2626")};
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-top: 8px;
`;

const PageInfo = styled.span`
  font-size: 13px;
  color: #6b7280;
`;

const PageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PageButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageNumber = styled.span`
  font-size: 13px;
  color: #374151;
  padding: 0 8px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #9ca3af;

  svg {
    margin-bottom: 12px;
    opacity: 0.4;
  }

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 6px 0;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
`;
