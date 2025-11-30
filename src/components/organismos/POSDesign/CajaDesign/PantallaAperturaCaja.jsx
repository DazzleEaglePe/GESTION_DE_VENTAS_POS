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

export function PantallaAperturaCaja() {
  const { dataSucursalesAsignadas } = useAsignacionCajaSucursalStore();
  const { setCajaSelectItem } = useCajasStore();
  const { setCierreCajaItemSelect } = useCierreCajaStore();
  const { data: dataCierreCajaPorEmpresa } = useMostrarCierreCajaPorEmpresaQuery();

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <Header>
        <NavLink to="/" style={{ textDecoration: 'none' }}>
          <LogoContainer>
            <Logo>M&L</Logo>
            <LogoText>Mathias y Luciana</LogoText>
          </LogoContainer>
        </NavLink>
      </Header>

      <Content>
        <Card>
          <CardIcon>
            <Icon icon="lucide:monitor" />
          </CardIcon>
          <CardTitle>Apertura de Caja</CardTitle>
          <CardSubtitle>Selecciona una caja para comenzar tu turno</CardSubtitle>

          <CajasList>
            {dataSucursalesAsignadas?.map((item, index) => {
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
                  sucursal={item.sucursales?.nombre}
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
        </Card>

        <FooterInfo>
          <span>Minimarket "Mathias y Luciana"</span>
          <span>Ica, Perú — 2025</span>
        </FooterInfo>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: #111;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  padding: 20px 40px;
  display: flex;
  align-items: center;
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

  @media (max-width: 480px) {
    display: none;
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  text-align: center;

  @media (max-width: 480px) {
    padding: 24px;
    border-radius: 16px;
  }
`;

const CardIcon = styled.div`
  width: 64px;
  height: 64px;
  background: #111;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  
  svg {
    font-size: 28px;
    color: #fff;
  }
`;

const CardTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #111;
  margin: 0 0 8px 0;
`;

const CardSubtitle = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0 0 24px 0;
`;

const CajasList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FooterInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 32px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
`;
