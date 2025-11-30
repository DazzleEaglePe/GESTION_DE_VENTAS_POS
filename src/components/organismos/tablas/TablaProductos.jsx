import styled from "styled-components";
import { Paginacion, useProductosStore } from "../../../index";
import { useUsuariosStore } from "../../../store/UsuariosStore";
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

export function TablaProductos({
  data,
  SetopenRegistro,
  setdataSelect,
  setAccion,
}) {
  const [pagina, setPagina] = useState(1);
  const [columnFilters] = useState([]);

  const { eliminarProductos, validarEliminarProducto } = useProductosStore();
  const { datausuarios } = useUsuariosStore();

  async function eliminar(p) {
    if (p.nombre === "General") {
      Swal.fire({
        icon: "error",
        title: "Acción no permitida",
        text: "Este registro no se puede modificar.",
      });
      return;
    }

    try {
      const validacion = await validarEliminarProducto({ id: p.id });

      if (validacion?.ventas_asociadas > 0) {
        const result = await Swal.fire({
          title: "Producto con ventas",
          html: `
            <p>Este producto tiene <strong>${validacion.ventas_asociadas}</strong> venta(s).</p>
            <p>Será <strong>desactivado</strong> para preservar el historial.</p>
          `,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#9ca3af",
          confirmButtonText: "Desactivar",
          cancelButtonText: "Cancelar",
        });

        if (result.isConfirmed) {
          const resultado = await eliminarProductos({
            id: p.id,
            id_usuario: datausuarios?.id,
            forzarDesactivacion: true,
          });

          if (resultado.exito) {
            Swal.fire({
              icon: "success",
              title: "Producto desactivado",
              timer: 2000,
              showConfirmButton: false,
            });
          }
        }
        return;
      }

      if (validacion.tiene_stock && validacion.stock_total > 0) {
        const result = await Swal.fire({
          title: "Producto con stock",
          html: `<p>Tiene <strong>${validacion.stock_total}</strong> unidades en stock.</p>`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#9ca3af",
          confirmButtonText: "Desactivar",
          cancelButtonText: "Cancelar",
        });

        if (result.isConfirmed) {
          const resultado = await eliminarProductos({
            id: p.id,
            id_usuario: datausuarios?.id,
            forzarDesactivacion: true,
          });

          if (resultado.exito) {
            Swal.fire({
              icon: "success",
              title: "Producto desactivado",
              text: resultado.mensaje,
              timer: 2000,
              showConfirmButton: false,
            });
          }
        }
        return;
      }

      const result = await Swal.fire({
        title: "¿Desactivar producto?",
        text: "Podrás restaurarlo desde productos inactivos.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#9ca3af",
        confirmButtonText: "Desactivar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        const resultado = await eliminarProductos({
          id: p.id,
          id_usuario: datausuarios?.id,
          forzarDesactivacion: true,
        });

        if (resultado.exito) {
          Swal.fire({
            icon: "success",
            title: "Producto desactivado",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Ocurrió un error",
      });
    }
  }

  function editar(data) {
    SetopenRegistro(true);
    setdataSelect(data);
    setAccion("Editar");
  }

  const columns = [
    {
      accessorKey: "nombre",
      header: "Producto",
      cell: (info) => <ProductName>{info.getValue()}</ProductName>,
    },
    {
      accessorKey: "precio_venta",
      header: "P. Venta",
      cell: (info) => (
        <PriceBadge>
          <Icon icon="lucide:dollar-sign" width="14" />
          {Number(info.getValue() || 0).toFixed(2)}
        </PriceBadge>
      ),
    },
    {
      accessorKey: "precio_compra",
      header: "P. Compra",
      cell: (info) => (
        <PriceBadgeGray>
          <Icon icon="lucide:dollar-sign" width="14" />
          {Number(info.getValue() || 0).toFixed(2)}
        </PriceBadgeGray>
      ),
    },
    {
      accessorKey: "sevende_por",
      header: "Venta por",
      cell: (info) => <UnitBadge>{info.getValue() || "UNIDAD"}</UnitBadge>,
    },
    {
      accessorKey: "maneja_inventarios",
      header: "Inventario",
      cell: (info) => (
        <InventoryBadge $active={info.getValue()}>
          <Icon
            icon={info.getValue() ? "lucide:check" : "lucide:x"}
            width="14"
          />
        </InventoryBadge>
      ),
    },
    {
      accessorKey: "acciones",
      header: "",
      enableSorting: false,
      cell: (info) => (
        <ActionsCell>
          <ActionButton
            $variant="edit"
            onClick={() => editar(info.row.original)}
            title="Editar"
          >
            <Icon icon="lucide:pencil" width="16" />
          </ActionButton>
          <ActionButton
            $variant="delete"
            onClick={() => eliminar(info.row.original)}
            title="Desactivar"
          >
            <Icon icon="lucide:trash-2" width="16" />
          </ActionButton>
        </ActionsCell>
      ),
    },
  ];

  const table = useReactTable({
    data: data || [],
    columns,
    state: { columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!data || data.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>
          <Icon icon="lucide:package" width="56" />
        </EmptyIcon>
        <EmptyTitle>Sin productos</EmptyTitle>
        <EmptyText>Agrega tu primer producto para comenzar</EmptyText>
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
          irinicio={() => table.setPageIndex(0)}
          pagina={table.getState().pagination.pageIndex + 1}
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

  &:last-child {
    text-align: right;
    padding-right: 20px;
  }
`;

// Cell components
const ProductName = styled.span`
  font-weight: 500;
  color: #111;
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

const PriceBadgeGray = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
`;

const UnitBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const InventoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? "#ecfdf5" : "#fef2f2")};
  color: ${({ $active }) => ($active ? "#059669" : "#ef4444")};
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
  transition: all 0.15s;

  background: ${({ $variant }) =>
    $variant === "edit" ? "#f3f4f6" : "#fef2f2"};
  color: ${({ $variant }) => ($variant === "edit" ? "#374151" : "#ef4444")};

  &:hover {
    background: ${({ $variant }) =>
      $variant === "edit" ? "#e5e7eb" : "#fee2e2"};
    transform: translateY(-1px);
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
