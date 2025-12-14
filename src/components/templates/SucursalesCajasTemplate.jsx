import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { ListSucursales } from "../organismos/SucursalesDesign/ListSucursales";
import { RegistrarSucursal } from "../organismos/formularios/RegistrarSucursal";
import { useSucursalesStore } from "../../store/SucursalesStore";
import { useCajasStore } from "../../store/CajasStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { RegistrarCaja } from "../organismos/formularios/RegistrarCaja";
import { supabase } from "../../supabase/supabase.config";

export const SucursalesCajasTemplate = () => {
  const queryClient = useQueryClient();
  const { stateSucursal, setStateSucursal, setAccion, mostrarCajasXSucursal } = useSucursalesStore();
  const { stateCaja } = useCajasStore();
  const { dataempresa } = useEmpresaStore();
  
  const [tabActiva, setTabActiva] = useState("activos");
  const [busqueda, setBusqueda] = useState("");

  // Query para sucursales activas con cajas
  const { data: dataActivos } = useQuery({
    queryKey: ["mostrar Cajas XSucursal"],
    queryFn: () => mostrarCajasXSucursal({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa,
  });

  // Query para sucursales inactivas
  const { data: dataInactivos, refetch: refetchInactivos } = useQuery({
    queryKey: ["sucursales inactivas", { id_empresa: dataempresa?.id }],
    queryFn: async () => {
      const { data } = await supabase
        .from("sucursales")
        .select(`*, caja(*)`)
        .eq("id_empresa", dataempresa?.id)
        .eq("activo", false);
      return data || [];
    },
    enabled: !!dataempresa?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Contadores
  const cantidadActivos = dataActivos?.length || 0;
  const cantidadInactivos = dataInactivos?.length || 0;

  function nuevaSucursal() {
    setStateSucursal(true);
    setAccion("Nuevo");
  }

  function cambiarTab(tab) {
    setTabActiva(tab);
    if (tab === "inactivos") refetchInactivos();
  }

  async function restaurarSucursal(item) {
    const result = await Swal.fire({
      title: "¿Restaurar sucursal?",
      text: `Se reactivará "${item.nombre}"`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#999",
      confirmButtonText: "Sí, restaurar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.rpc("restaurar_registro", {
          p_tabla: "sucursales",
          p_id: item.id,
        });
        
        if (error) throw error;
        
        queryClient.invalidateQueries(["mostrar Cajas XSucursal"]);
        queryClient.invalidateQueries(["sucursales inactivas"]);
        toast.success("Sucursal restaurada correctamente");
      } catch (error) {
        toast.error(`Error: ${error.message}`);
      }
    }
  }

  // Filtrar sucursales por búsqueda
  const sucursalesFiltradas = (dataActivos || []).filter(suc => 
    suc.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const inactivosFiltrados = (dataInactivos || []).filter(suc =>
    suc.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      {stateSucursal && <RegistrarSucursal />}
      {stateCaja && <RegistrarCaja />}

      {/* Header Card */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:building-2" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Sucursales y Cajas</Title>
            <Subtitle>
              {cantidadActivos} {cantidadActivos === 1 ? "sucursal activa" : "sucursales activas"}
            </Subtitle>
          </HeaderInfo>
        </HeaderLeft>

        <HeaderRight>
          <SearchWrapper>
            <SearchIcon>
              <Icon icon="lucide:search" />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Buscar sucursal..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <ClearSearchBtn onClick={() => setBusqueda("")}>
                <Icon icon="lucide:x" />
              </ClearSearchBtn>
            )}
          </SearchWrapper>

          {tabActiva === "activos" && (
            <AddButton onClick={nuevaSucursal}>
              <Icon icon="lucide:plus" />
              <span>Nueva Sucursal</span>
            </AddButton>
          )}
        </HeaderRight>
      </Header>

      {/* Toolbar con tabs */}
      <Toolbar>
        <ToolbarLeft>
          <Tabs>
            <Tab $active={tabActiva === "activos"} onClick={() => cambiarTab("activos")}>
              <Icon icon="lucide:building-2" />
              <span>Activos</span>
              <TabBadge $active={tabActiva === "activos"}>{cantidadActivos}</TabBadge>
            </Tab>
            <Tab $active={tabActiva === "inactivos"} onClick={() => cambiarTab("inactivos")}>
              <Icon icon="lucide:building-x" />
              <span>Inactivos</span>
              <TabBadge $active={tabActiva === "inactivos"}>{cantidadInactivos}</TabBadge>
            </Tab>
          </Tabs>
        </ToolbarLeft>
      </Toolbar>

      {/* Content Card */}
      <ContentCard>
        {tabActiva === "activos" ? (
          <ListSucursales 
            data={sucursalesFiltradas} 
            busqueda={busqueda}
          />
        ) : (
          <InactivosContainer>
            {!inactivosFiltrados || inactivosFiltrados.length === 0 ? (
              <EmptyState>
                <Icon icon="lucide:inbox" />
                <p>No hay sucursales inactivas</p>
              </EmptyState>
            ) : (
              <InactivosGrid>
                {inactivosFiltrados.map((sucursal) => (
                  <InactivoCard key={sucursal.id}>
                    <InactivoHeader>
                      <InactivoIcon>
                        <Icon icon="lucide:building-2" />
                      </InactivoIcon>
                      <InactivoInfo>
                        <InactivoNombre>{sucursal.nombre}</InactivoNombre>
                        <InactivoFecha>
                          Desactivado: {sucursal.fecha_eliminacion 
                            ? new Date(sucursal.fecha_eliminacion).toLocaleDateString("es-PE")
                            : "-"}
                        </InactivoFecha>
                      </InactivoInfo>
                    </InactivoHeader>
                    <InactivoCajas>
                      <Icon icon="lucide:monitor" />
                      <span>{sucursal.caja?.length || 0} cajas asociadas</span>
                    </InactivoCajas>
                    <RestoreBtn onClick={() => restaurarSucursal(sucursal)}>
                      <Icon icon="lucide:rotate-ccw" />
                      Restaurar
                    </RestoreBtn>
                  </InactivoCard>
                ))}
              </InactivosGrid>
            )}
          </InactivosContainer>
        )}
      </ContentCard>
    </Container>
  );
};

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
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #2563eb;
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
    border-color: #2563eb;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
  background: #2563eb;
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
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
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
  background: ${({ $active }) => ($active ? '#2563eb' : '#f8fafc')};
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#e2e8f0')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 18px; }

  &:hover {
    background: ${({ $active }) => ($active ? '#2563eb' : '#f1f5f9')};
    border-color: ${({ $active }) => ($active ? '#2563eb' : '#cbd5e1')};
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
  padding: 24px;
`;

const InactivosContainer = styled.div`
  width: 100%;
`;

const InactivosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const InactivoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const InactivoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InactivoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #e5e7eb;
  border-radius: 10px;

  svg {
    font-size: 20px;
    color: #6b7280;
  }
`;

const InactivoInfo = styled.div`
  flex: 1;
`;

const InactivoNombre = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
`;

const InactivoFecha = styled.span`
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
`;

const InactivoCajas = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;

  svg {
    font-size: 16px;
  }
`;

const RestoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 8px;
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
