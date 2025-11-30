import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import Swal from "sweetalert2";
import { useCategoriasStore } from "../../../index";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

export function TablaCategorias({
  data,
  SetopenRegistro,
  setdataSelect,
  setAccion,
}) {
  const [sorting, setSorting] = useState([]);
  const { eliminarCategoria, validarEliminarCategoria } = useCategoriasStore();

  async function eliminar(p) {
    if (p.nombre === "General") {
      Swal.fire({
        title: "Acción no permitida",
        text: "Esta categoría es un valor por defecto y no puede modificarse.",
        icon: "warning",
        confirmButtonColor: "#111",
      });
      return;
    }

    try {
      const validacion = await validarEliminarCategoria({ id: p.id });

      if (validacion.productos_asociados > 0) {
        Swal.fire({
          title: "No se puede eliminar",
          html: `
            <p>Esta categoría tiene <strong>${validacion.productos_asociados}</strong> producto(s) asociado(s).</p>
            <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
              Debe reasignar o eliminar los productos antes de poder eliminar esta categoría.
            </p>
          `,
          icon: "warning",
          confirmButtonColor: "#111",
        });
        return;
      }

      const result = await Swal.fire({
        title: "¿Eliminar categoría?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        const resultado = await eliminarCategoria({ id: p.id, icono: p.icono });

        if (resultado.exito) {
          Swal.fire({
            icon: "success",
            title: "Eliminado",
            text: resultado.mensaje,
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: resultado.mensaje,
          });
        }
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Ocurrió un error al procesar la solicitud",
      });
    }
  }

  function editar(item) {
    if (item.nombre === "General") {
      Swal.fire({
        title: "Acción no permitida",
        text: "Esta categoría es un valor por defecto y no puede modificarse.",
        icon: "warning",
        confirmButtonColor: "#111",
      });
      return;
    }
    SetopenRegistro(true);
    setdataSelect(item);
    setAccion("Editar");
  }

  const columns = [
    {
      accessorKey: "icono",
      header: "Icono",
      enableSorting: false,
      cell: ({ row }) => (
        <IconCell>
          {row.original.icono && row.original.icono !== "-" ? (
            <CategoryImage src={row.original.icono} alt={row.original.nombre} />
          ) : (
            <EmptyIcon>
              <Icon icon="lucide:image" />
            </EmptyIcon>
          )}
        </IconCell>
      ),
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ getValue }) => <CategoryName>{getValue()}</CategoryName>,
    },
    {
      accessorKey: "color",
      header: "Color",
      enableSorting: false,
      cell: ({ getValue }) => (
        <ColorCell>
          <ColorDot $color={getValue()} />
          <ColorText>{getValue()}</ColorText>
        </ColorCell>
      ),
    },
    {
      accessorKey: "acciones",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionsCell>
          <ActionButton
            $variant="edit"
            onClick={() => editar(row.original)}
            title="Editar"
          >
            <Icon icon="lucide:pencil" />
          </ActionButton>
          <ActionButton
            $variant="delete"
            onClick={() => eliminar(row.original)}
            title="Eliminar"
          >
            <Icon icon="lucide:trash-2" />
          </ActionButton>
        </ActionsCell>
      ),
    },
  ];

  const table = useReactTable({
    data: data || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // Return condicional después de los hooks
  if (!data) return null;

  if (data.length === 0) {
    return (
      <EmptyState>
        <Icon icon="lucide:folder-open" />
        <h3>No hay categorías</h3>
        <p>Crea tu primera categoría para comenzar</p>
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
                        <SortIcon $active={header.column.getIsSorted()}>
                          <Icon icon="lucide:chevrons-up-down" />
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
          Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)} de {data.length}
        </PageInfo>
        <PageButtons>
          <PageButton
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <Icon icon="lucide:chevrons-left" />
          </PageButton>
          <PageButton
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <Icon icon="lucide:chevron-left" />
          </PageButton>
          <PageNumber>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </PageNumber>
          <PageButton
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <Icon icon="lucide:chevron-right" />
          </PageButton>
          <PageButton
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <Icon icon="lucide:chevrons-right" />
          </PageButton>
        </PageButtons>
      </Pagination>
    </Container>
  );
}

const Container = styled.div`
  padding: 0;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 16px 20px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  cursor: ${(props) => (props.$sortable ? "pointer" : "default")};
  user-select: none;
  white-space: nowrap;

  &:hover {
    background: ${(props) => (props.$sortable ? "#f1f5f9" : "#f8fafc")};
  }

  &:first-child {
    width: 80px;
  }

  &:last-child {
    width: 100px;
    text-align: right;
  }
`;

const ThContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SortIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${(props) => (props.$active ? "#43a047" : "#cbd5e1")};
  transition: color 0.2s;

  svg {
    font-size: 14px;
  }
`;

const Tr = styled.tr`
  transition: background 0.15s ease;

  &:hover {
    background: #f8fafc;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #f1f5f9;
  }
`;

const Td = styled.td`
  padding: 16px 20px;
  vertical-align: middle;

  &:last-child {
    text-align: right;
  }
`;

const IconCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CategoryImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  background: #f5f5f5;
`;

const EmptyIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;

  svg {
    font-size: 18px;
  }
`;

const CategoryName = styled.span`
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1a1a2e;
`;

const ColorCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ColorDot = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${(props) => props.$color || "#ccc"};
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ColorText = styled.span`
  font-size: 0.8125rem;
  color: #64748b;
  font-family: monospace;
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.$variant === "edit" &&
    `
    background: #f0f9ff;
    color: #0284c7;

    &:hover {
      background: #e0f2fe;
      color: #0369a1;
    }
  `}

  ${(props) =>
    props.$variant === "delete" &&
    `
    background: #fef2f2;
    color: #ef4444;

    &:hover {
      background: #fee2e2;
      color: #dc2626;
    }
  `}

  svg {
    font-size: 16px;
  }
`;

const Pagination = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const PageInfo = styled.span`
  font-size: 0.8125rem;
  color: #64748b;
`;

const PageButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const PageButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1a1a2e;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 16px;
  }
`;

const PageNumber = styled.span`
  padding: 0 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1a1a2e;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #64748b;

  svg {
    font-size: 48px;
    color: #cbd5e1;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 0.875rem;
    margin: 0;
  }
`;
