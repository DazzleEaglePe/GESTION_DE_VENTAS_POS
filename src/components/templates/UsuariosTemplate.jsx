import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import { useUsuariosStore } from "../../index";
import { RegistrarUsuarios } from "../organismos/formularios/RegistrarUsuarios";
import ConfettiExplosion from "react-confetti-explosion";
import { Toaster } from "sonner";
import { useAsignacionCajaSucursalStore } from "../../store/AsignacionCajaSucursalStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import Swal from "sweetalert2";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function UsuariosTemplate() {
  const [openRegistro, setOpenRegistro] = useState(false);
  const { setItemSelect, eliminarUsuarioAsignado, restaurarUsuario } = useUsuariosStore();
  const [isExploding, setIsExploding] = useState(false);
  const [buscador, setBuscadorLocal] = useState("");
  const [tabActiva, setTabActiva] = useState("activos");
  const { dataempresa } = useEmpresaStore();
  
  const {
    accion,
    setAccion,
    datausuariosAsignados,
    datausuariosInactivos,
    setBuscador,
    mostrarUsuariosInactivos,
  } = useAsignacionCajaSucursalStore();
  const queryClient = useQueryClient();

  // Query para usuarios inactivos (se carga para mostrar contador)
  const { refetch: refetchInactivos, data: dataInactivos } = useQuery({
    queryKey: ["mostrar usuarios inactivos", { id_empresa: dataempresa?.id }],
    queryFn: () => mostrarUsuariosInactivos({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Contadores
  const cantidadActivos = datausuariosAsignados?.length || 0;
  const cantidadInactivos = dataInactivos?.length || datausuariosInactivos?.length || 0;

  function nuevoRegistro() {
    setOpenRegistro(true);
    setAccion("Nuevo");
    setItemSelect(null);
    setIsExploding(false);
  }

  function editarUsuario(item) {
    setOpenRegistro(true);
    setItemSelect(item);
    setAccion("Editar");
  }

  function cambiarTab(tab) {
    setTabActiva(tab);
    if (tab === "inactivos") {
      refetchInactivos();
    }
  }

  async function eliminarUsuario(item) {
    const result = await Swal.fire({
      title: "¿Desactivar usuario?",
      html: `
        <p>Se desactivará el acceso de <strong>${item.usuario}</strong></p>
        <p style="color: #666; font-size: 0.9em; margin-top: 8px;">Podrás restaurarlo desde "Inactivos"</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await eliminarUsuarioAsignado({ 
          id: item.id_usuario,
          eliminado_por: null
        });
        
        if (response?.exito === false) {
          Swal.fire({
            icon: "error",
            title: "No se pudo desactivar",
            text: response.mensaje,
          });
          return;
        }
        
        queryClient.invalidateQueries(["mostrar usuarios asignados"]);
        queryClient.invalidateQueries(["buscar usuarios asignados"]);
        
        Swal.fire({
          icon: "success",
          title: "Usuario desactivado",
          text: "Puedes restaurarlo desde la pestaña Inactivos",
          timer: 2500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "No se pudo desactivar el usuario",
        });
      }
    }
  }

  async function handleRestaurarUsuario(item) {
    const result = await Swal.fire({
      title: "¿Restaurar usuario?",
      html: `<p>El usuario <strong>${item.usuario}</strong> volverá a estar activo.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Sí, restaurar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await restaurarUsuario({ id: item.id_usuario });
        
        if (!response?.success) {
          Swal.fire({
            icon: "error",
            title: "No se pudo restaurar",
            text: response?.error || "Error desconocido",
          });
          return;
        }
        
        queryClient.invalidateQueries(["mostrar usuarios asignados"]);
        queryClient.invalidateQueries(["mostrar usuarios inactivos"]);
        
        Swal.fire({
          icon: "success",
          title: "Usuario restaurado",
          text: "El usuario está activo nuevamente",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "No se pudo restaurar el usuario",
        });
      }
    }
  }

  const handleBuscador = (e) => {
    const value = e.target.value;
    setBuscadorLocal(value);
    setBuscador(value);
  };

  const limpiarBuscador = () => {
    setBuscadorLocal("");
    setBuscador("");
  };

  // Filtrar usuarios activos
  const usuariosFiltrados = datausuariosAsignados?.filter((user) => {
    if (!buscador) return true;
    const search = buscador.toLowerCase();
    return (
      user.usuario?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.sucursal?.toLowerCase().includes(search) ||
      user.rol?.toLowerCase().includes(search)
    );
  });

  // Datos según tab activa (usar dataInactivos de la query o del store)
  const usuariosInactivosData = dataInactivos || datausuariosInactivos || [];
  const datosActuales = tabActiva === "activos" ? usuariosFiltrados : usuariosInactivosData;

  return (
    <Container>
      <Toaster richColors position="top-right" />
      
      {openRegistro && (
        <RegistrarUsuarios
          setIsExploding={setIsExploding}
          onClose={() => setOpenRegistro(false)}
          accion={accion}
        />
      )}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:users" />
          </IconWrapper>
          <div>
            <Title>Usuarios</Title>
            <Subtitle>Gestiona los accesos y permisos del equipo</Subtitle>
          </div>
        </HeaderLeft>

        <HeaderRight>
          {tabActiva === "activos" && (
            <>
              <SearchWrapper>
                <SearchIcon>
                  <Icon icon="lucide:search" />
                </SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="Buscar usuario..."
                  value={buscador}
                  onChange={handleBuscador}
                />
                {buscador && (
                  <ClearButton onClick={limpiarBuscador}>
                    <Icon icon="lucide:x" />
                  </ClearButton>
                )}
              </SearchWrapper>

              <AddButton onClick={nuevoRegistro}>
                <Icon icon="lucide:user-plus" />
                Nuevo usuario
              </AddButton>
            </>
          )}
        </HeaderRight>
      </Header>

      {/* Content Card */}
      <Card>
        {/* Tabs */}
        <CardHeaderTabs>
          <Tabs>
            <Tab $active={tabActiva === "activos"} onClick={() => cambiarTab("activos")}>
              <Icon icon="lucide:users" />
              Activos
              <TabBadge $active={tabActiva === "activos"}>
                {cantidadActivos}
              </TabBadge>
            </Tab>
            <Tab $active={tabActiva === "inactivos"} onClick={() => cambiarTab("inactivos")}>
              <Icon icon="lucide:user-x" />
              Inactivos
              <TabBadge $active={tabActiva === "inactivos"}>
                {cantidadInactivos}
              </TabBadge>
            </Tab>
          </Tabs>
        </CardHeaderTabs>

        {/* Content */}
        <Content>
          {isExploding && <ConfettiExplosion />}
          
          {!datosActuales || datosActuales.length === 0 ? (
            <EmptyState>
              <Icon icon={tabActiva === "activos" ? "lucide:user-x" : "lucide:user-check"} />
              <h3>
                {tabActiva === "activos" 
                  ? "No hay usuarios activos" 
                  : "No hay usuarios inactivos"}
              </h3>
              <p>
                {tabActiva === "activos"
                  ? "Agrega el primer usuario para comenzar"
                  : "Los usuarios desactivados aparecerán aquí"}
              </p>
            </EmptyState>
          ) : (
            <UsuariosGrid>
              {datosActuales.map((usuario) => (
                <UsuarioCard key={usuario.id_usuario} $inactive={tabActiva === "inactivos"}>
                  <CardHeaderUser $inactive={tabActiva === "inactivos"}>
                    <AvatarWrapper $color={getColorByRole(usuario.rol)} $inactive={tabActiva === "inactivos"}>
                      <Icon icon="lucide:user" />
                    </AvatarWrapper>
                    <CardInfo>
                      <UserName>{usuario.usuario || "Sin nombre"}</UserName>
                      <UserEmail>{usuario.email || "Sin email"}</UserEmail>
                    </CardInfo>
                    <CardActions>
                      {tabActiva === "activos" ? (
                        <>
                          <ActionBtn
                            $color="#3b82f6"
                            onClick={() => editarUsuario(usuario)}
                            title="Editar"
                          >
                            <Icon icon="lucide:pencil" />
                          </ActionBtn>
                          <ActionBtn
                            $color="#ef4444"
                            onClick={() => eliminarUsuario(usuario)}
                            title="Desactivar"
                          >
                            <Icon icon="lucide:user-minus" />
                          </ActionBtn>
                        </>
                      ) : (
                        <RestoreBtn onClick={() => handleRestaurarUsuario(usuario)}>
                          <Icon icon="lucide:rotate-ccw" />
                          Restaurar
                        </RestoreBtn>
                      )}
                    </CardActions>
                  </CardHeaderUser>

                <CardBody>
                  <InfoRow>
                    <InfoLabel>
                      <Icon icon="lucide:shield" />
                      Rol
                    </InfoLabel>
                    <RolBadge $color={getColorByRole(usuario.rol)}>
                      {usuario.rol || "Sin rol"}
                    </RolBadge>
                  </InfoRow>

                  <InfoRow>
                    <InfoLabel>
                      <Icon icon="lucide:building-2" />
                      Sucursal
                    </InfoLabel>
                    <InfoValue>{usuario.sucursal || "Sin asignar"}</InfoValue>
                  </InfoRow>

                  <InfoRow>
                    <InfoLabel>
                      <Icon icon="lucide:monitor" />
                      Caja
                    </InfoLabel>
                    <InfoValue>{usuario.caja || "Sin asignar"}</InfoValue>
                  </InfoRow>

                  {tabActiva === "inactivos" && usuario.fecha_eliminacion && (
                    <InfoRow>
                      <InfoLabel>
                        <Icon icon="lucide:calendar" />
                        Desactivado
                      </InfoLabel>
                      <DateBadge>
                        {new Date(usuario.fecha_eliminacion).toLocaleDateString("es-PE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </DateBadge>
                    </InfoRow>
                  )}

                  {tabActiva === "activos" && (
                    <InfoRow>
                      <InfoLabel>
                        <Icon icon="lucide:activity" />
                        Estado
                      </InfoLabel>
                      <StatusBadge $active={true}>
                        Activo
                      </StatusBadge>
                    </InfoRow>
                  )}
                </CardBody>
              </UsuarioCard>
            ))}
          </UsuariosGrid>
        )}
        </Content>
      </Card>
    </Container>
  );
}

// Función para obtener color según el rol
function getColorByRole(rol) {
  const colors = {
    Administrador: "#7c3aed",
    Admin: "#7c3aed",
    Cajero: "#0891b2",
    Vendedor: "#059669",
    Supervisor: "#d97706",
  };
  return colors[rol] || "#64748b";
}

// =====================
// STYLED COMPONENTS
// =====================

const Container = styled.div`
  min-height: calc(100vh - 50px);
  margin-top: 50px;
  padding: 24px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 768px) {
    padding: 16px;
    gap: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #fff;
  }
`;

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
  min-width: 260px;
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
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ClearButton = styled.button`
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  }

  &:active {
    transform: translateY(0);
  }
`;

const StatsBar = styled.div`
  display: none; /* Ya no se usa */
`;

const StatItem = styled.div`
  display: none; /* Ya no se usa */
`;

const Card = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const CardHeaderTabs = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active ? '#fff' : 'transparent'};
  color: ${props => props.$active ? '#1a1a2e' : '#64748b'};
  box-shadow: ${props => props.$active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

  svg {
    font-size: 16px;
  }

  &:hover {
    color: #1a1a2e;
  }
`;

const TabBadge = styled.span`
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.$active ? '#6366f1' : '#e2e8f0'};
  color: ${props => props.$active ? '#fff' : '#64748b'};
`;

const Content = styled.div`
  padding: 20px;
  min-height: 400px;
`;

const UsuariosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const UsuarioCard = styled.div`
  background: #fff;
  border: 1px solid ${props => props.$inactive ? '#fecaca' : '#e2e8f0'};
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s ease;
  opacity: ${props => props.$inactive ? 0.9 : 1};

  &:hover {
    border-color: ${props => props.$inactive ? '#fca5a5' : '#c7d2fe'};
    box-shadow: 0 4px 12px ${props => props.$inactive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.08)'};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-bottom: 1px solid #f1f5f9;
`;

const CardHeaderUser = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${props => props.$inactive ? '#fef2f2' : '#fafafa'};
  border-bottom: 1px solid ${props => props.$inactive ? '#fecaca' : '#f1f5f9'};
`;

const AvatarWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: ${(props) => props.$inactive ? '#fee2e2' : `${props.$color}15`};
  border-radius: 12px;

  svg {
    font-size: 22px;
    color: ${(props) => props.$inactive ? '#ef4444' : props.$color};
  }
`;

const CardInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.p`
  font-size: 0.8rem;
  color: #64748b;
  margin: 2px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardActions = styled.div`
  display: flex;
  gap: 6px;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: ${(props) => `${props.$color}10`};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  svg {
    font-size: 15px;
    color: ${(props) => props.$color};
  }

  &:hover {
    background: ${(props) => `${props.$color}20`};
    transform: scale(1.05);
  }
`;

const CardBody = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const InfoLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #64748b;

  svg {
    font-size: 14px;
  }
`;

const InfoValue = styled.span`
  font-size: 0.85rem;
  color: #1a1a2e;
  font-weight: 500;
`;

const RolBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${(props) => `${props.$color}15`};
  color: ${(props) => props.$color};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${(props) => (props.$active ? "#dcfce7" : "#fee2e2")};
  color: ${(props) => (props.$active ? "#16a34a" : "#dc2626")};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
`;

const RestoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  svg {
    font-size: 16px;
  }

  &:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DateBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ef4444;
  background: #fee2e2;
  padding: 4px 10px;
  border-radius: 6px;

  svg {
    font-size: 14px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;

  svg {
    font-size: 56px;
    margin-bottom: 16px;
    opacity: 0.4;
    color: #6366f1;
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0 0 8px 0;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;
