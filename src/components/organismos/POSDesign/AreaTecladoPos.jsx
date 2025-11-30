import styled from "styled-components";
import { TotalPos } from "./TotalPos";
import { Device } from "../../../styles/breakpoints";
import { useVentasStore } from "../../../store/VentasStore";

import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useMetodosPagoStore } from "../../../store/MetodosPagoStore";
import { useValidarPermisosOperativos } from "../../../hooks/useValidarPermisosOperativos";
import { useDetalleVentasStore } from "../../../store/DetalleVentasStore";

export function AreaTecladoPos() {
  const { setStatePantallaCobro, stateMetodosPago } = useVentasStore();
  const { dataempresa } = useEmpresaStore();
  const { dataMetodosPago: datametodospago } = useMetodosPagoStore();
  const { datadetalleventa } = useDetalleVentasStore();
  const { validarPermiso } = useValidarPermisosOperativos();

  const ValidarPermisocobrar = (p) => {
    const response = validarPermiso("Cobrar venta");
    if (!response) return;
    setStatePantallaCobro({ data: datadetalleventa, tipocobro: p.nombre });
  };

  return (
    <Container stateMetodosPago={stateMetodosPago}>
      <PaymentMethods>
        {datametodospago?.map((item, index) => (
          <PaymentButton
            key={index}
            onClick={() => ValidarPermisocobrar(item)}
          >
            {item.nombre}
          </PaymentButton>
        ))}
      </PaymentMethods>

      <TotalSection>
        <TotalPos />
      </TotalSection>
    </Container>
  );
}

const Container = styled.div`
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: absolute;
  bottom: 10px;
  width: calc(100% - 5px);
  background: #fff;
  overflow: hidden;

  @media ${Device.desktop} {
    position: relative;
    width: 380px;
    bottom: initial;
  }
`;

const PaymentMethods = styled.div`
  display: ${({ stateMetodosPago }) => (stateMetodosPago ? "grid" : "none")};
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 16px;

  @media ${Device.desktop} {
    display: grid;
  }
`;

const PaymentButton = styled.button`
  padding: 16px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #111;
    background: #fafafa;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const TotalSection = styled.div`
  padding: 12px;
`;
