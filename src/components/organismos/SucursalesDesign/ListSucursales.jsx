import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { useSucursalesStore } from "../../../store/SucursalesStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { BarLoader } from "react-spinners";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useCajasStore } from "../../../store/CajasStore";
import Swal from "sweetalert2";
import { toast } from "sonner";

export const ListSucursales = ({ data: dataProp, busqueda }) => {
  const queryClient = useQueryClient();
  const {
    mostrarCajasXSucursal,
    setStateSucursal,
    setAccion,
    selectSucursal,
    eliminarSucursal,
  } = useSucursalesStore();
  const { dataempresa } = useEmpresaStore();
  const {
    setStateCaja,
    setCajaSelectItem,
    setAccion: setAccionCaja,
    eliminarCaja,
  } = useCajasStore();

  // Solo cargar si no se pasan datos como prop
  const { data: dataQuery, isLoading, error } = useQuery({
    queryKey: ["mostrar Cajas XSucursal"],
    queryFn: () => mostrarCajasXSucursal({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa && !dataProp,
  });

  // Usar datos de prop si existen, sino los de query
  const data = dataProp || dataQuery;

  const editarSucursal = (p) => {
    selectSucursal(p);
    setStateSucursal(true);
    setAccion("Editar");
  };
  const agregarCaja = (p) => {
    setAccionCaja("Nuevo");
    setStateCaja(true);
    console.log(p);
    setCajaSelectItem(p);
  };
  const editarCaja = (p) => {
    setStateCaja(true);
    setAccionCaja("Editar");
    setCajaSelectItem(p);
  };
  const controladorEliminarCaja = (id) => {
    return new Promise((resolve, reject) => {
      Swal.fire({
        title: "¿Estás seguro(a)(e)?",
        text: "Una vez eliminado, se desactivará la caja",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const response = await eliminarCaja({ id: id });
            // Verificar si el servidor retornó un error de validación
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
  const controladorEliminarSucursal = (id) => {
    return new Promise((resolve, reject) => {
      Swal.fire({
        title: "¿Estás seguro(a)(e)?",
        text: "Una vez eliminado, se desactivará la sucursal",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const response = await eliminarSucursal({ id: id });
            // Verificar si el servidor retornó un error de validación
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
  const {mutate:doDeleteSucursal} = useMutation({
    mutationKey: ["eliminar Sucursal"],
    mutationFn: controladorEliminarSucursal,
    onError: (error) => {
      if (!error.message.includes("cancelada")) {
        toast.error(`${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success("Sucursal desactivada correctamente");
      queryClient.invalidateQueries(["mostrar Cajas XSucursal"]);
      queryClient.invalidateQueries(["sucursales inactivas"]);
    },
  });
  const {mutate:doDeleteCaja} = useMutation({
    mutationKey: ["eliminar caja"],
    mutationFn: controladorEliminarCaja,
    onError: (error) => {
      if (!error.message.includes("cancelada")) {
        toast.error(`${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success("Caja desactivada correctamente");
      queryClient.invalidateQueries(["mostrar Cajas XSucursal"]);
    },
  });

  if (!dataProp && isLoading) return <LoadingContainer><BarLoader color="#2563eb" /></LoadingContainer>;
  if (!dataProp && error) return <ErrorMessage>Error: {error.message}</ErrorMessage>;

  if (!data || data.length === 0) {
    return (
      <EmptyState>
        <Icon icon="lucide:building-2" />
        <p>No hay sucursales {busqueda ? "que coincidan con la búsqueda" : "registradas"}</p>
      </EmptyState>
    );
  }

  return (
    <Container>
      {data?.map((sucursal, index) => {
        return (
          <Sucursal key={sucursal.id || index}>
            <SucursalHeader>
              <SucursalLeft>
                <SucursalIcon>
                  <Icon icon="lucide:building-2" />
                </SucursalIcon>
                <SucursalInfo>
                  <SucursalTitle>{sucursal.nombre}</SucursalTitle>
                  <SucursalMeta>
                    <Icon icon="lucide:monitor" />
                    <span>{sucursal.caja?.length || 0} cajas</span>
                  </SucursalMeta>
                </SucursalInfo>
              </SucursalLeft>
              <Acciones>
                {sucursal?.delete && (
                  <ActionBtn 
                    $variant="danger"
                    onClick={() => doDeleteSucursal(sucursal?.id)}
                    title="Eliminar sucursal"
                  >
                    <Icon icon="lucide:trash-2" />
                  </ActionBtn>
                )}
                <ActionBtn 
                  $variant="edit"
                  onClick={() => editarSucursal(sucursal)}
                  title="Editar sucursal"
                >
                  <Icon icon="lucide:pencil" />
                </ActionBtn>
              </Acciones>
            </SucursalHeader>

            <CajaList>
              {sucursal.caja?.filter(c => c.activo !== false).map((caja, idx) => (
                <CajaItem key={caja.id || idx}>
                  <CajaLeft>
                    <CajaIcon>
                      <Icon icon="lucide:monitor" />
                    </CajaIcon>
                    <CajaInfo>
                      <CajaDescripcion>{caja.descripcion}</CajaDescripcion>
                      <FechaCreacion>
                        Creada: {new Date(caja.fecha_creacion).toLocaleDateString("es-PE")}
                      </FechaCreacion>
                    </CajaInfo>
                  </CajaLeft>
                  <CajaActions>
                    {caja?.delete && (
                      <ActionBtn 
                        $variant="danger"
                        $small
                        onClick={() => doDeleteCaja(caja?.id)}
                        title="Eliminar caja"
                      >
                        <Icon icon="lucide:trash-2" />
                      </ActionBtn>
                    )}
                    <ActionBtn 
                      $variant="edit"
                      $small
                      onClick={() => editarCaja(caja)}
                      title="Editar caja"
                    >
                      <Icon icon="lucide:pencil" />
                    </ActionBtn>
                  </CajaActions>
                </CajaItem>
              ))}
            </CajaList>

            <AddCajaBtn onClick={() => agregarCaja(sucursal)}>
              <Icon icon="lucide:plus" />
              <span>Agregar caja</span>
            </AddCajaBtn>
          </Sucursal>
        );
      })}
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

const Sucursal = styled.div`
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
  }
`;

const Acciones = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $small }) => ($small ? "28px" : "32px")};
  height: ${({ $small }) => ($small ? "28px" : "32px")};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: ${({ $variant }) => 
    $variant === "danger" ? "#fef2f2" : "#f3f4f6"};
  color: ${({ $variant }) => 
    $variant === "danger" ? "#ef4444" : "#6b7280"};

  svg {
    font-size: ${({ $small }) => ($small ? "14px" : "16px")};
  }

  &:hover {
    background: ${({ $variant }) => 
      $variant === "danger" ? "#fee2e2" : "#e5e7eb"};
    color: ${({ $variant }) => 
      $variant === "danger" ? "#dc2626" : "#374151"};
  }
`;

const CajaList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CajaItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 10px;
  transition: all 0.15s;

  &:hover {
    background: #f5f5f5;
    border-color: #d1d5db;
  }
`;

const CajaLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CajaIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #e5e7eb;
  border-radius: 8px;

  svg {
    font-size: 18px;
    color: #6b7280;
  }
`;

const CajaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CajaDescripcion = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
`;

const FechaCreacion = styled.span`
  font-size: 12px;
  color: #9ca3af;
`;

const CajaActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const AddCajaBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;

  svg {
    font-size: 18px;
  }

  &:hover {
    border-color: #2563eb;
    color: #2563eb;
    background: #f0f9ff;
  }
`;
