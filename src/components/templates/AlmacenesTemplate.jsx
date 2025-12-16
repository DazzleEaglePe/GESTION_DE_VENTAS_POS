import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { ListAlmacenes } from "../organismos/AlmacenesDesign/ListAlmacenes";
import { RegistrarAlmacen } from "../organismos/formularios/RegistrarAlmacen";
import { useAlmacenesStore } from "../../store/AlmacenesStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { supabase } from "../../supabase/supabase.config";

export const AlmacenesTemplate = () => {
  const queryClient = useQueryClient();
  const { stateAlmacen, mostrarAlmacenesXEmpresa } = useAlmacenesStore();
  const { dataempresa } = useEmpresaStore();
  
  const [tabActiva, setTabActiva] = useState("activos");
  const [busqueda, setBusqueda] = useState("");

  // Query para almacenes activos por empresa (sucursales con sus almacenes)
  const { data: dataActivos } = useQuery({
    queryKey: ["mostrar almacenes X empresa", dataempresa?.id],
    queryFn: () => mostrarAlmacenesXEmpresa({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
  });

  // Query para sucursales con almacenes inactivos
  const { data: dataInactivos, refetch: refetchInactivos } = useQuery({
    queryKey: ["almacenes inactivos", { id_empresa: dataempresa?.id }],
    queryFn: async () => {
      const { data } = await supabase
        .from("sucursales")
        .select(`*, almacen(*)`)
        .eq("id_empresa", dataempresa?.id)
        .eq("activo", true);
      
      // Filtrar solo sucursales que tengan almacenes inactivos
      const sucursalesConAlmacenesInactivos = data?.map(suc => ({
        ...suc,
        almacen: suc.almacen?.filter(alm => alm.activo === false) || []
      })).filter(suc => suc.almacen.length > 0);
      
      return sucursalesConAlmacenesInactivos || [];
    },
    enabled: !!dataempresa?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Contar almacenes activos
  const cantidadActivos = dataActivos?.reduce((acc, suc) => 
    acc + (suc.almacen?.filter(a => a.activo !== false).length || 0), 0) || 0;
  
  // Contar almacenes inactivos
  const cantidadInactivos = dataInactivos?.reduce((acc, suc) => 
    acc + (suc.almacen?.length || 0), 0) || 0;

  function cambiarTab(tab) {
    setTabActiva(tab);
    if (tab === "inactivos") refetchInactivos();
  }

  async function restaurarAlmacen(item) {
    const result = await Swal.fire({
      title: "¿Restaurar almacén?",
      text: `Se reactivará "${item.nombre}"`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#999",
      confirmButtonText: "Sí, restaurar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.rpc("restaurar_registro", {
          p_tabla: "almacen",
          p_id: item.id,
        });
        
        if (error) throw error;
        
        queryClient.invalidateQueries(["mostrar almacenes X empresa"]);
        queryClient.invalidateQueries(["almacenes inactivos"]);
        toast.success("Almacén restaurado correctamente");
      } catch (error) {
        toast.error(`Error: ${error.message}`);
      }
    }
  }

  // Filtrar sucursales por búsqueda
  const sucursalesFiltradas = (dataActivos || []).filter(suc => 
    suc.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    suc.almacen?.some(alm => alm.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      {stateAlmacen && <RegistrarAlmacen />}

      {/* Header Card */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:warehouse" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Almacenes</Title>
            <Subtitle>
              {cantidadActivos} {cantidadActivos === 1 ? "almacén activo" : "almacenes activos"}
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
              placeholder="Buscar almacén o sucursal..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <ClearSearchBtn onClick={() => setBusqueda("")}>
                <Icon icon="lucide:x" />
              </ClearSearchBtn>
            )}
          </SearchWrapper>
        </HeaderRight>
      </Header>

      {/* Toolbar con tabs */}
      <Toolbar>
        <ToolbarLeft>
          <Tabs>
            <Tab $active={tabActiva === "activos"} onClick={() => cambiarTab("activos")}>
              <Icon icon="lucide:warehouse" />
              <span>Activos</span>
              <TabBadge $active={tabActiva === "activos"}>{cantidadActivos}</TabBadge>
            </Tab>
            <Tab $active={tabActiva === "inactivos"} onClick={() => cambiarTab("inactivos")}>
              <Icon icon="lucide:archive-x" />
              <span>Inactivos</span>
              <TabBadge $active={tabActiva === "inactivos"}>{cantidadInactivos}</TabBadge>
            </Tab>
          </Tabs>
        </ToolbarLeft>
      </Toolbar>

      {/* Content Card */}
      <ContentCard>
        {tabActiva === "activos" ? (
          <ListAlmacenes 
            data={sucursalesFiltradas} 
            busqueda={busqueda}
          />
        ) : (
          <InactivosContainer>
            {!dataInactivos || dataInactivos.length === 0 ? (
              <EmptyState>
                <Icon icon="lucide:inbox" />
                <p>No hay almacenes inactivos</p>
              </EmptyState>
            ) : (
              <InactivosGrid>
                {dataInactivos.map((sucursal) => (
                  sucursal.almacen?.map((almacen) => (
                    <InactivoCard key={almacen.id}>
                      <InactivoHeader>
                        <InactivoIcon>
                          <Icon icon="lucide:warehouse" />
                        </InactivoIcon>
                        <InactivoInfo>
                          <InactivoNombre>{almacen.nombre}</InactivoNombre>
                          <InactivoSucursal>
                            <Icon icon="lucide:building-2" />
                            {sucursal.nombre}
                          </InactivoSucursal>
                        </InactivoInfo>
                      </InactivoHeader>
                      <InactivoFecha>
                        Desactivado: {almacen.fecha_eliminacion 
                          ? new Date(almacen.fecha_eliminacion).toLocaleDateString("es-PE")
                          : "-"}
                      </InactivoFecha>
                      <RestoreBtn onClick={() => restaurarAlmacen(almacen)}>
                        <Icon icon="lucide:rotate-ccw" />
                        Restaurar
                      </RestoreBtn>
                    </InactivoCard>
                  ))
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
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #f59e0b;
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
    border-color: #f59e0b;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
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
  background: ${({ $active }) => ($active ? '#f59e0b' : '#f8fafc')};
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  border: 1px solid ${({ $active }) => ($active ? '#f59e0b' : '#e2e8f0')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 18px; }

  &:hover {
    background: ${({ $active }) => ($active ? '#f59e0b' : '#f1f5f9')};
    border-color: ${({ $active }) => ($active ? '#f59e0b' : '#cbd5e1')};
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
  display: block;
`;

const InactivoSucursal = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;

  svg {
    font-size: 12px;
  }
`;

const InactivoFecha = styled.span`
  font-size: 12px;
  color: #9ca3af;
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
