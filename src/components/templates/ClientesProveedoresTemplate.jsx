import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import ConfettiExplosion from "react-confetti-explosion";
import {
  RegistrarClientesProveedores,
  useClientesProveedoresStore,
  useEmpresaStore,
} from "../../index";
import { TablaClientesProveedores } from "../organismos/tablas/TablaClientesProveedores";

export function ClientesProveedoresTemplate() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const esCliente = location.pathname === "/configuracion/clientes";
  const tipo = esCliente ? "cliente" : "proveedor";
  
  const [openRegistro, setOpenRegistro] = useState(false);
  const [accion, setAccion] = useState("");
  const [dataSelect, setDataSelect] = useState(null);
  const [isExploding, setIsExploding] = useState(false);
  const [tabActiva, setTabActiva] = useState("activos");
  
  const { dataempresa } = useEmpresaStore();
  const { 
    dataclipro, 
    mostrarCliPro, 
    eliminarCliPro, 
    setTipo,
    selectCliPro,
    setBuscador,
  } = useClientesProveedoresStore();

  // Query para cargar datos activos
  const { isLoading } = useQuery({
    queryKey: ["mostrar clientes proveedores", { id_empresa: dataempresa?.id, tipo }],
    queryFn: () => mostrarCliPro({ id_empresa: dataempresa?.id, tipo }),
    enabled: !!dataempresa?.id,
  });

  // Query para inactivos
  const { data: dataInactivos, refetch: refetchInactivos } = useQuery({
    queryKey: ["mostrar clientes proveedores inactivos", { id_empresa: dataempresa?.id, tipo }],
    queryFn: async () => {
      const { data } = await import("../../supabase/supabase.config").then(m => 
        m.supabase
          .from("clientes_proveedores")
          .select()
          .eq("id_empresa", dataempresa?.id)
          .eq("tipo", tipo)
          .eq("activo", false)
      );
      return data || [];
    },
    enabled: !!dataempresa?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Contadores
  const cantidadActivos = dataclipro?.length || 0;
  const cantidadInactivos = dataInactivos?.length || 0;

  function nuevoRegistro() {
    setTipo(tipo);
    setOpenRegistro(true);
    setAccion("Nuevo");
    setDataSelect(null);
    selectCliPro(null);
    setIsExploding(false);
  }

  function cambiarTab(tab) {
    setTabActiva(tab);
    if (tab === "inactivos") refetchInactivos();
  }

  function handleBusqueda(e) {
    setBuscador(e.target.value);
  }

  async function restaurarRegistro(item) {
    const result = await Swal.fire({
      title: `¿Restaurar ${esCliente ? "cliente" : "proveedor"}?`,
      text: `Se reactivará "${item.nombres}"`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#111",
      cancelButtonColor: "#999",
      confirmButtonText: "Sí, restaurar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const { supabase } = await import("../../supabase/supabase.config");
        const { error } = await supabase.rpc("restaurar_registro", {
          p_tabla: "clientes_proveedores",
          p_id: item.id,
        });
        
        if (error) throw error;
        
        queryClient.invalidateQueries(["mostrar clientes proveedores"]);
        queryClient.invalidateQueries(["mostrar clientes proveedores inactivos"]);
        toast.success("Restaurado correctamente");
      } catch (error) {
        toast.error(`Error: ${error.message}`);
      }
    }
  }

  // Estado para búsqueda local
  const [busquedaLocal, setBusquedaLocal] = useState("");

  function handleBusquedaLocal(e) {
    const valor = e.target.value;
    setBusquedaLocal(valor);
    setBuscador(valor);
  }

  return (
    <Container>
      <Toaster position="top-center" richColors />
      {isExploding && <ConfettiExplosion />}
      
      {openRegistro && (
        <RegistrarClientesProveedores
          setIsExploding={setIsExploding}
          onClose={() => setOpenRegistro(false)}
          dataSelect={dataSelect}
          accion={accion}
        />
      )}

      {/* Header Card */}
      <Header>
        <HeaderLeft>
          <IconWrapper $esCliente={esCliente}>
            <Icon icon={esCliente ? "lucide:users" : "lucide:truck"} />
          </IconWrapper>
          <HeaderInfo>
            <Title>{esCliente ? "Clientes" : "Proveedores"}</Title>
            <Subtitle>
              {cantidadActivos} {esCliente ? "clientes" : "proveedores"} registrados
            </Subtitle>
          </HeaderInfo>
        </HeaderLeft>

        <HeaderRight>
          <SearchWrapper $esCliente={esCliente}>
            <SearchIcon>
              <Icon icon="lucide:search" />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder={`Buscar ${esCliente ? "cliente" : "proveedor"}...`}
              value={busquedaLocal}
              onChange={handleBusquedaLocal}
              $esCliente={esCliente}
            />
            {busquedaLocal && (
              <ClearSearchBtn onClick={() => { setBusquedaLocal(""); setBuscador(""); }}>
                <Icon icon="lucide:x" />
              </ClearSearchBtn>
            )}
          </SearchWrapper>

          {tabActiva === "activos" && (
            <AddButton $esCliente={esCliente} onClick={nuevoRegistro}>
              <Icon icon="lucide:plus" />
              <span>Nuevo {esCliente ? "Cliente" : "Proveedor"}</span>
            </AddButton>
          )}
        </HeaderRight>
      </Header>

      {/* Toolbar con tabs */}
      <Toolbar>
        <ToolbarLeft>
          <Tabs>
            <Tab $active={tabActiva === "activos"} $esCliente={esCliente} onClick={() => cambiarTab("activos")}>
              <Icon icon={esCliente ? "lucide:users" : "lucide:truck"} />
              <span>Activos</span>
              <TabBadge $active={tabActiva === "activos"}>{cantidadActivos}</TabBadge>
            </Tab>
            <Tab $active={tabActiva === "inactivos"} $esCliente={esCliente} onClick={() => cambiarTab("inactivos")}>
              <Icon icon="lucide:user-x" />
              <span>Inactivos</span>
              <TabBadge $active={tabActiva === "inactivos"}>{cantidadInactivos}</TabBadge>
            </Tab>
          </Tabs>
        </ToolbarLeft>
      </Toolbar>

      {/* Content Card */}
      <ContentCard>
        <TableContainer>
          {tabActiva === "activos" ? (
            <TablaClientesProveedores
              setdataSelect={setDataSelect}
              setAccion={setAccion}
              SetopenRegistro={setOpenRegistro}
              data={dataclipro}
            />
          ) : (
            <TablaInactivos>
              {!dataInactivos || dataInactivos.length === 0 ? (
                <EmptyState>
                  <Icon icon="lucide:inbox" />
                  <p>No hay {esCliente ? "clientes" : "proveedores"} inactivos</p>
                </EmptyState>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>DNI/RUC</th>
                      <th>Dirección</th>
                      <th>Desactivado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataInactivos.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nombres}</td>
                        <td>{item.identificador_nacional || "-"}</td>
                        <td>{item.direccion || "-"}</td>
                        <td>
                          {item.fecha_eliminacion 
                            ? new Date(item.fecha_eliminacion).toLocaleDateString("es-PE")
                            : "-"}
                        </td>
                        <td>
                          <RestoreBtn onClick={() => restaurarRegistro(item)}>
                            <Icon icon="lucide:rotate-ccw" />
                            Restaurar
                          </RestoreBtn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TablaInactivos>
          )}
        </TableContainer>
      </ContentCard>
    </Container>
  );
}


// Styles
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
  flex-direction: column;
  gap: 20px;
  margin-bottom: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: ${({ $esCliente }) => 
    $esCliente 
      ? 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' 
      : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'};
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: ${({ $esCliente }) => $esCliente ? '#db2777' : '#10b981'};
  }
`;

const HeaderInfo = styled.div``;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 4px 0 0 0;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #94a3b8;
  display: flex;
  align-items: center;

  svg {
    font-size: 18px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-width: 280px;
  padding: 12px 40px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: #f8fafc;
  color: #1a1a2e;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
    border-color: ${({ $esCliente }) => $esCliente ? '#db2777' : '#10b981'};
    background: #fff;
    box-shadow: 0 0 0 3px ${({ $esCliente }) => 
      $esCliente ? 'rgba(219, 39, 119, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
  }
`;

const ClearSearchBtn = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #64748b;
    background: #f1f5f9;
  }

  svg {
    font-size: 16px;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ $esCliente }) => $esCliente ? '#db2777' : '#10b981'};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: ${({ $esCliente }) => $esCliente ? '#be185d' : '#059669'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ $esCliente }) => 
      $esCliente ? 'rgba(219, 39, 119, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
  }

  &:active {
    transform: translateY(0);
  }
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  flex-wrap: wrap;
  gap: 12px;
`;

const ToolbarLeft = styled.div`
  display: flex;
  gap: 8px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  background: ${({ $active, $esCliente }) => 
    $active 
      ? ($esCliente ? '#db2777' : '#10b981') 
      : '#f8fafc'};
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  border: 1px solid ${({ $active, $esCliente }) => 
    $active 
      ? ($esCliente ? '#db2777' : '#10b981') 
      : '#e2e8f0'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 18px; }

  &:hover {
    background: ${({ $active, $esCliente }) => 
      $active 
        ? ($esCliente ? '#db2777' : '#10b981') 
        : '#f1f5f9'};
    border-color: ${({ $active, $esCliente }) => 
      $active 
        ? ($esCliente ? '#db2777' : '#10b981') 
        : '#cbd5e1'};
  }
`;

const TabBadge = styled.span`
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $active }) => ($active ? 'rgba(255,255,255,0.2)' : '#e2e8f0')};
  border-radius: 10px;
`;

const ContentCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const TableContainer = styled.div`
  padding: 0;
`;

const TablaInactivos = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 14px 20px;
      text-align: left;
    }

    th {
      background: #fafafa;
      font-weight: 600;
      font-size: 13px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #333;
    }

    tr:hover td {
      background: #fafafa;
    }
  }
`;

const RestoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 16px; }

  &:hover {
    background: #059669;
  }
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
