import styled from "styled-components";
import { Device } from "../../../styles/breakpoints";
import { Icon } from "@iconify/react";
import { useDetalleVentasStore } from "../../../store/DetalleVentasStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useVentasStore } from "../../../store/VentasStore";
import { FormatearNumeroDinero } from "../../../utils/Conversiones";
import { useValidarPermisosOperativos } from "../../../hooks/useValidarPermisosOperativos";

export function TotalPos() {
  const { setStateMetodosPago } = useVentasStore();
  const { total } = useDetalleVentasStore();
  const { dataempresa } = useEmpresaStore();
  const { validarPermiso } = useValidarPermisosOperativos();

  const validarPermisoCobrar = () => {
    const hasPermission = validarPermiso("Cobrar venta");
    if (!hasPermission) return;
    setStateMetodosPago();
  };

  return (
    <Container>
      <HeartIcon>
        <Icon icon="lucide:heart" />
      </HeartIcon>
      
      <TotalContent>
        <TotalAmount>
          {FormatearNumeroDinero(total, dataempresa?.currency, dataempresa?.iso)}
        </TotalAmount>
        
        <CobrarButton onClick={validarPermisoCobrar}>
          <Icon icon="lucide:banknote" />
          COBRAR
        </CobrarButton>
      </TotalContent>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
  border-radius: 14px;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -30px;
    left: -30px;
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -40px;
    right: -20px;
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 50%;
  }
`;

const HeartIcon = styled.div`
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;

  svg {
    font-size: 26px;
    color: #fff;
  }
`;

const TotalContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 1;
`;

const TotalAmount = styled.span`
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media ${Device.desktop} {
    font-size: 36px;
  }
`;

const CobrarButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #16a34a;
  background: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 18px;
  }

  @media ${Device.desktop} {
    display: none;
  }
`;
