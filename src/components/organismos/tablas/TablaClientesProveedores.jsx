import styled from "styled-components";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useClientesProveedoresStore } from "../../../index";

export function TablaClientesProveedores({
  data,
  SetopenRegistro,
  setdataSelect,
  setAccion,
}) {
  if (!data) return null;
  
  const [columnFilters, setColumnFilters] = useState([]);
  const { eliminarCliPro, selectCliPro } = useClientesProveedoresStore();

  function eliminar(p) {
    Swal.fire({
      title: "¿Desactivar registro?",
      text: `Se desactivará "${p.nombres}"`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111",
      cancelButtonColor: "#999",
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await eliminarCliPro({ id: p.id });
      }
    });
  }

  function editar(data) {
    selectCliPro(data);
    setdataSelect(data);
    setAccion("Editar");
    SetopenRegistro(true);
  }

  const columns = [
    {
      accessorKey: "nombres",
      header: "Nombre",
      cell: (info) => (
        <CellNombre>
          <AvatarIcon>
            <Icon icon="lucide:user" />
          </AvatarIcon>
          <span>{info.getValue()}</span>
        </CellNombre>
      ),
    },
    {
      accessorKey: "identificador_nacional",
      header: "DNI / RUC",
      cell: (info) => (
        <CellWithIcon>
          <Icon icon="lucide:id-card" />
          <span>{info.getValue() || "—"}</span>
        </CellWithIcon>
      ),
    },
    {
      accessorKey: "direccion",
      header: "Dirección",
      cell: (info) => (
        <CellWithIcon>
          <Icon icon="lucide:map-pin" />
          <span>{info.getValue() || "—"}</span>
        </CellWithIcon>
      ),
    },
    {
      accessorKey: "telefono",
      header: "Teléfono",
      cell: (info) => (
        <CellWithIcon>
          <Icon icon="lucide:phone" />
          <span>{info.getValue() || "—"}</span>
        </CellWithIcon>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: (info) => {
        const estado = info.getValue() || "activo";
        return (
          <EstadoBadge $estado={estado}>
            <Icon icon={estado === "activo" ? "lucide:check-circle" : "lucide:clock"} />
            {estado}
          </EstadoBadge>
        );
      },
    },
    {
      accessorKey: "acciones",
      header: "",
      enableSorting: false,
      cell: (info) => (
        <AccionesCell>
          <ActionBtn onClick={() => editar(info.row.original)} title="Editar">
            <Icon icon="lucide:pencil" />
          </ActionBtn>
          <ActionBtn $danger onClick={() => eliminar(info.row.original)} title="Desactivar">
            <Icon icon="lucide:trash-2" />
          </ActionBtn>
        </AccionesCell>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Container>
      {data.length === 0 ? (
        <EmptyState>
          <Icon icon="lucide:users" />
          <p>No hay registros</p>
        </EmptyState>
      ) : (
        <>
          <Table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      <HeaderContent
                        onClick={header.column.getToggleSortingHandler()}
                        $sortable={header.column.getCanSort()}
                      >
                        {header.column.columnDef.header}
                        {header.column.getCanSort() && (
                          <SortIcon $sorted={header.column.getIsSorted()}>
                            <Icon icon="lucide:chevrons-up-down" />
                          </SortIcon>
                        )}
                      </HeaderContent>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Paginación minimalista */}
          <Pagination>
            <PageInfo>
              {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </PageInfo>
            <PageButtons>
              <PageBtn
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <Icon icon="lucide:chevron-left" />
              </PageBtn>
              <PageBtn
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <Icon icon="lucide:chevron-right" />
              </PageBtn>
            </PageButtons>
          </Pagination>
        </>
      )}
    </Container>
  );
}

// Styles
const Container = styled.div`
  padding: 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  thead {
    th {
      padding: 14px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #eee;
      background: #fafafa;

      &:last-child {
        text-align: right;
        width: 100px;
      }
    }
  }

  tbody {
    tr {
      transition: background 0.15s;

      &:hover {
        background: #f9f9f9;
      }
    }

    td {
      padding: 16px;
      font-size: 14px;
      color: #333;
      border-bottom: 1px solid #f5f5f5;
      vertical-align: middle;

      &:last-child {
        text-align: right;
      }
    }
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  user-select: none;

  &:hover {
    color: ${({ $sortable }) => ($sortable ? "#111" : "#888")};
  }
`;

const SortIcon = styled.span`
  display: flex;
  opacity: ${({ $sorted }) => ($sorted ? 1 : 0.3)};
  
  svg {
    font-size: 14px;
  }
`;

const CellNombre = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  color: #111;
`;

const AvatarIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f0f0f0;
  border-radius: 10px;
  
  svg {
    font-size: 18px;
    color: #666;
  }
`;

const CellWithIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #555;

  svg {
    font-size: 16px;
    color: #bbb;
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }
`;

const EstadoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  text-transform: capitalize;
  
  ${({ $estado }) => {
    if ($estado === "activo") {
      return `
        background: #ecfdf5;
        color: #059669;
      `;
    }
    return `
      background: #fef3c7;
      color: #d97706;
    `;
  }}

  svg {
    font-size: 14px;
  }
`;

const AccionesCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  color: #888;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: ${({ $danger }) => ($danger ? "#fef2f2" : "#f5f5f5")};
    color: ${({ $danger }) => ($danger ? "#ef4444" : "#111")};
  }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid #eee;
`;

const PageInfo = styled.span`
  font-size: 14px;
  color: #888;
`;

const PageButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PageBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  color: #333;

  svg {
    font-size: 18px;
  }

  &:hover:not(:disabled) {
    background: #eee;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;

  svg {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.4;
  }

  p {
    margin: 0;
    font-size: 15px;
  }
`;
