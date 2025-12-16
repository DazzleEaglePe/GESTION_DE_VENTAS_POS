import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { BarLoader } from "react-spinners";
import { Icon } from "@iconify/react/dist/iconify.js";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useAlmacenesStore } from "../../../store/AlmacenesStore";

export const ListAlmacenes = ({ data: dataProp, busqueda }) => {
  const queryClient = useQueryClient();
  const { dataempresa } = useEmpresaStore();
  const {
    setStateAlmacen,
    setAlmacenSelectItem,
    setAccion: setAccionAlmacen,
    eliminarAlmacen,
    mostrarAlmacenesXEmpresa,
  } = useAlmacenesStore();

  // Solo cargar si no se pasan datos como prop
  const { data: dataQuery, isLoading, error } = useQuery({
    queryKey: ["mostrar almacenes X empresa", dataempresa?.id],
    queryFn: () => mostrarAlmacenesXEmpresa({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id && !dataProp,
  });

  // Usar datos de prop si existen, sino los de query
  const data = dataProp || dataQuery;

  const agregarAlmacen = (sucursal) => {
    setAccionAlmacen("Nuevo");
    setStateAlmacen(true);
    setAlmacenSelectItem(sucursal);
  };

  const editarAlmacen = (almacen) => {
    setStateAlmacen(true);
    setAccionAlmacen("Editar");
    setAlmacenSelectItem(almacen);
  };

  const controladorEliminarAlmacen = (id) => {
    return new Promise((resolve, reject) => {
      Swal.fire({
        title: "¿Estás seguro(a)?",
        text: "Se desactivará este almacén",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sí, desactivar",
        cancelButtonText: "Cancelar",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const response = await eliminarAlmacen({ id: id });
            if (response && !response.exito) {
              reject(new Error(response.mensaje));
              return;
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error("Eliminación cancelada"));
        }
      });
    });
  };

  const { mutate: doDeleteAlmacen } = useMutation({
    mutationKey: ["eliminar almacen"],
    mutationFn: controladorEliminarAlmacen,
    onError: (error) => {
      if (!error.message.includes("cancelada")) {
        toast.error(`${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success("Almacén desactivado correctamente");
      queryClient.invalidateQueries(["mostrar almacenes X empresa"]);
      queryClient.invalidateQueries(["almacenes inactivos"]);
    },
  });

  if (!dataProp && isLoading) return <LoadingContainer><BarLoader color="#f59e0b" /></LoadingContainer>;
  if (!dataProp && error) return <ErrorMessage>Error: {error.message}</ErrorMessage>;

  if (!data || data.length === 0) {
    return (
      <EmptyState>
        <Icon icon="lucide:warehouse" />
        <p>No hay sucursales {busqueda ? "que coincidan con la búsqueda" : "con almacenes"}</p>
      </EmptyState>
    );
  }

  return (
    <Container>
      {data?.map((sucursal) => (
        <SucursalCard key={sucursal.id}>
          <SucursalHeader>
            <SucursalLeft>
              <SucursalIcon>
                <Icon icon="lucide:building-2" />
              </SucursalIcon>
              <SucursalInfo>
                <SucursalTitle>{sucursal.nombre}</SucursalTitle>
                <SucursalMeta>
                  <Icon icon="lucide:warehouse" />
                  <span>{sucursal.almacen?.filter(a => a.activo !== false).length || 0} almacenes</span>
                </SucursalMeta>
              </SucursalInfo>
            </SucursalLeft>
          </SucursalHeader>

          <AlmacenList>
            {sucursal.almacen?.filter(a => a.activo !== false).map((almacen) => (
              <AlmacenItem key={almacen.id}>
                <AlmacenLeft>
                  <AlmacenIcon>
                    <Icon icon="lucide:warehouse" />
                  </AlmacenIcon>
                  <AlmacenInfo>
                    <AlmacenNombre>{almacen.nombre}</AlmacenNombre>
                    <AlmacenFecha>
                      Creado: {new Date(almacen.fecha_creacion).toLocaleDateString("es-PE")}
                    </AlmacenFecha>
                  </AlmacenInfo>
                </AlmacenLeft>
                <AlmacenActions>
                  <ActionBtn 
                    $variant="danger"
                    onClick={() => doDeleteAlmacen(almacen?.id)}
                    title="Desactivar almacén"
                  >
                    <Icon icon="lucide:trash-2" />
                  </ActionBtn>
                  <ActionBtn 
                    $variant="edit"
                    onClick={() => editarAlmacen(almacen)}
                    title="Editar almacén"
                  >
                    <Icon icon="lucide:pencil" />
                  </ActionBtn>
                </AlmacenActions>
              </AlmacenItem>
            ))}
          </AlmacenList>

          <AddAlmacenBtn onClick={() => agregarAlmacen(sucursal)}>
            <Icon icon="lucide:plus" />
            <span>Agregar almacén</span>
          </AddAlmacenBtn>
        </SucursalCard>
      ))}
    </Container>
  );
};

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  width: 100%;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #ef4444;
  font-size: 14px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;

  svg {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 15px;
  }
`;

const SucursalCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const SucursalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const SucursalLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SucursalIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 12px;

  svg {
    font-size: 22px;
    color: #2563eb;
  }
`;

const SucursalInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SucursalTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  word-wrap: break-word;
  word-break: break-word;
`;

const SucursalMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;

  svg {
    font-size: 14px;
    color: #f59e0b;
  }
`;

const AlmacenList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AlmacenItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  padding: 12px;
  border-radius: 10px;
  transition: all 0.15s;

  &:hover {
    background: #fef3c7;
    border-color: #fcd34d;
  }
`;

const AlmacenLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AlmacenIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #fde68a;
  border-radius: 8px;

  svg {
    font-size: 18px;
    color: #f59e0b;
  }
`;

const AlmacenInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const AlmacenNombre = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
`;

const AlmacenFecha = styled.span`
  font-size: 12px;
  color: #9ca3af;
`;

const AlmacenActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: ${({ $variant }) => 
    $variant === "danger" ? "#fef2f2" : "#f3f4f6"};
  color: ${({ $variant }) => 
    $variant === "danger" ? "#ef4444" : "#6b7280"};

  svg {
    font-size: 14px;
  }

  &:hover {
    background: ${({ $variant }) => 
      $variant === "danger" ? "#fee2e2" : "#e5e7eb"};
    color: ${({ $variant }) => 
      $variant === "danger" ? "#dc2626" : "#374151"};
  }
`;

const AddAlmacenBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 2px dashed #fcd34d;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #f59e0b;
  cursor: pointer;
  transition: all 0.15s;

  svg {
    font-size: 18px;
  }

  &:hover {
    border-color: #f59e0b;
    background: #fffbeb;
  }
`;
