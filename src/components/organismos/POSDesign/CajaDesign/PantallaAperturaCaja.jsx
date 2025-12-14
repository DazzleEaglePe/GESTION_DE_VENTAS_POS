import styled from "styled-components";
import { useUsuariosStore } from "../../../../store/UsuariosStore";
import { useCierreCajaStore } from "../../../../store/CierreCajaStore";
import { useAsignacionCajaSucursalStore } from "../../../../store/AsignacionCajaSucursalStore";
import { CardListCajas } from "./CardListCajas";
import { Device } from "../../../../styles/breakpoints";
import { useMostrarCierreCajaPorEmpresaQuery } from "../../../../tanstack/CierresCajaStack";
import { useCajasStore } from "../../../../store/CajasStore";
import { Icon } from "@iconify/react";
import { Toaster } from "sonner";
import { NavLink } from "react-router-dom";
import { useMemo } from "react";

export function PantallaAperturaCaja() {
  const { dataSucursalesAsignadas } = useAsignacionCajaSucursalStore();
  const { setCajaSelectItem } = useCajasStore();
  const { setCierreCajaItemSelect } = useCierreCajaStore();
  const { datausuarios } = useUsuariosStore();
  const { data: dataCierreCajaPorEmpresa } = useMostrarCierreCajaPorEmpresaQuery();

  // Agrupar cajas por sucursal
  const cajasAgrupadas = useMemo(() => {
    if (!dataSucursalesAsignadas) return {};
    
    return dataSucursalesAsignadas.reduce((acc, item) => {
      const sucursalNombre = item.sucursales?.nombre || "Sin sucursal";
      const sucursalId = item.sucursales?.id || "sin-id";
      
      if (!acc[sucursalId]) {
        acc[sucursalId] = {
          nombre: sucursalNombre,
          direccion: item.sucursales?.direccion || "",
          cajas: []
        };
      }
      acc[sucursalId].cajas.push(item);
      return acc;
    }, {});
  }, [dataSucursalesAsignadas]);

  const sucursalesArray = Object.entries(cajasAgrupadas);

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      <Sidebar>
        <SidebarHeader>
          <NavLink to="/" style={{ textDecoration: 'none' }}>
            <LogoContainer>
              <Logo>M&L</Logo>
              <LogoText>Minimarket</LogoText>
            </LogoContainer>
          </NavLink>
        </SidebarHeader>
        
        <UserCard>
          <UserAvatar>
            <Icon icon="lucide:user" width="20" />
          </UserAvatar>
          <UserInfo>
            <UserName>{datausuarios?.nombres}</UserName>
            <UserRole>{datausuarios?.roles?.nombre}</UserRole>
          </UserInfo>
        </UserCard>
        
        <SidebarStats>
          <StatItem>
            <StatIcon className="sucursales">
              <Icon icon="lucide:building-2" width="16" />
            </StatIcon>
            <StatInfo>
              <StatValue>{sucursalesArray.length}</StatValue>
              <StatLabel>Sucursales</StatLabel>
            </StatInfo>
          </StatItem>
          <StatItem>
            <StatIcon className="cajas">
              <Icon icon="lucide:monitor" width="16" />
            </StatIcon>
            <StatInfo>
              <StatValue>{dataSucursalesAsignadas?.length || 0}</StatValue>
              <StatLabel>Cajas asignadas</StatLabel>
            </StatInfo>
          </StatItem>
        </SidebarStats>
        
        <SidebarFooter>
          <FooterText>Selecciona una caja para comenzar</FooterText>
        </SidebarFooter>
      </Sidebar>

      <MainContent>
        <ContentHeader>
          <HeaderTitle>Apertura de Caja</HeaderTitle>
          <HeaderSubtitle>Selecciona la sucursal y caja donde trabajarás hoy</HeaderSubtitle>
        </ContentHeader>

        <SucursalesGrid>
          {sucursalesArray.map(([sucursalId, sucursal]) => (
            <SucursalCard key={sucursalId}>
              <SucursalHeader>
                <SucursalIcon>
                  <Icon icon="lucide:building-2" width="18" />
                </SucursalIcon>
                <SucursalInfo>
                  <SucursalName>{sucursal.nombre}</SucursalName>
                  {sucursal.direccion && (
                    <SucursalLocation>
                      <Icon icon="lucide:map-pin" width="12" />
                      {sucursal.direccion}
                    </SucursalLocation>
                  )}
                </SucursalInfo>
                <CajasCount>{sucursal.cajas.length} caja{sucursal.cajas.length !== 1 ? 's' : ''}</CajasCount>
              </SucursalHeader>
              
              <CajasList>
                {sucursal.cajas.map((item, index) => {
                  let state = Boolean(false);
                  let aperturaActiva = null;
                  if (Array.isArray(dataCierreCajaPorEmpresa)) {
                    aperturaActiva = dataCierreCajaPorEmpresa.find(
                      (a) => a.id_caja === item.id
                    );
                    state = Boolean(aperturaActiva);
                  }
                  return (
                    <CardListCajas
                      key={index}
                      title={item.caja?.descripcion}
                      sucursal={sucursal.nombre}
                      funcion={() => {
                        setCajaSelectItem(item);
                        if (state) {
                          setCierreCajaItemSelect(aperturaActiva);
                        }
                      }}
                      state={state}
                      subtitle={
                        state ? `${aperturaActiva?.rol}-${aperturaActiva?.usuario}` : 0
                      }
                    />
                  );
                })}
              </CajasList>
            </SucursalCard>
          ))}
        </SucursalesGrid>
      </MainContent>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: #fafafa;
  display: flex;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

/* Sidebar */
const Sidebar = styled.aside`
  width: 280px;
  background: #111;
  display: flex;
  flex-direction: column;
  padding: 24px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 100%;
    padding: 16px;
  }
`;

const SidebarHeader = styled.div`
  margin-bottom: 32px;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Logo = styled.div`
  width: 40px;
  height: 40px;
  background: #fff;
  color: #111;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoText = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #fff;
`;

const UserCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 24px;
`;

const UserAvatar = styled.div`
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const UserName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
`;

const UserRole = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
`;

const SidebarStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
`;

const StatIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.sucursales {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
  }
  
  &.cajas {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const StatValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #fff;
`;

const StatLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const SidebarFooter = styled.div`
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const FooterText = styled.p`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
`;

/* Main Content */
const MainContent = styled.main`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const ContentHeader = styled.div`
  margin-bottom: 32px;
`;

const HeaderTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #111;
  margin: 0 0 8px 0;
`;

const HeaderSubtitle = styled.p`
  font-size: 14px;
  color: #888;
  margin: 0;
`;

const SucursalesGrid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const SucursalCard = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  overflow: hidden;
`;

const SucursalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #f5f5f5;
  background: #fafafa;
`;

const SucursalIcon = styled.div`
  width: 40px;
  height: 40px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SucursalInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SucursalName = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin: 0;
`;

const SucursalLocation = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #888;
  margin-top: 2px;
  
  svg {
    flex-shrink: 0;
  }
`;

const CajasCount = styled.span`
  font-size: 12px;
  color: #888;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 20px;
`;

const CajasList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 12px;
`;
