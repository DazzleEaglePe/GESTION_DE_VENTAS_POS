import styled from "styled-components";
import { useCierreCajaStore } from "../../../../store/CierreCajaStore";
import { useFormattedDate } from "../../../../hooks/useFormattedDate";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useMovCajaStore } from "../../../../store/MovCajaStore";
import { FormatearNumeroDinero } from "../../../../utils/Conversiones";
import { useEmpresaStore } from "../../../../store/EmpresaStore";
import { PantallaConteoCaja } from "./PantallaConteoCaja";
import { Icon } from "@iconify/react";

export function PantallaCierreCaja() {
  const { setStateCierraCaja, dataCierreCaja, stateConteoCaja, setStateConteoCaja } = useCierreCajaStore();
  const {
    mostrarEfectivoSinVentasMovcierrecaja,
    mostrarVentasMetodoPagoMovCaja,
    totalVentasMetodoPago,
    totalVentasEfectivo,
    totalAperturaCaja,
    totalGastosVariosCaja,
    totalIngresosVariosCaja,
    totalEfectivoCajaSinVentas,
    totalEfectivoTotalCaja,
  } = useMovCajaStore();
  const { dataempresa } = useEmpresaStore();
  const fechaactual = useFormattedDate();
  const fechaInicioFormateada = format(
    new Date(dataCierreCaja?.fechainicio),
    "dd/MM/yyyy HH:mm"
  );

  const { isLoading: isloading1 } = useQuery({
    queryKey: ["mostrar efectivo sin ventas movCaja"],
    queryFn: () =>
      mostrarEfectivoSinVentasMovcierrecaja({
        _id_cierre_caja: dataCierreCaja?.id,
      }),
  });

  const { data: dataventasmetodopago, isLoading: isloading2, isError, error } = useQuery({
    queryKey: ["mostrar ventas metodoPago movCaja"],
    queryFn: () =>
      mostrarVentasMetodoPagoMovCaja({ _id_cierre_caja: dataCierreCaja?.id }),
  });

  if (isloading1 || isloading2) {
    return (
      <Overlay>
        <LoadingContainer>
          <Icon icon="lucide:loader-2" className="spin" />
          <span>Cargando datos...</span>
        </LoadingContainer>
      </Overlay>
    );
  }

  if (isError) {
    return (
      <Overlay>
        <ErrorContainer>
          <Icon icon="lucide:alert-circle" />
          <span>Error: {error.message}</span>
        </ErrorContainer>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={() => setStateCierraCaja(false)}>
      <Container onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <CloseButton onClick={() => setStateCierraCaja(false)}>
            <Icon icon="lucide:x" />
          </CloseButton>
          <HeaderIcon>
            <Icon icon="lucide:receipt" />
          </HeaderIcon>
          <Title>Cierre de Caja</Title>
          <DateRange>
            <Icon icon="lucide:calendar" />
            {fechaInicioFormateada} — Ahora
          </DateRange>
        </Header>

        {/* Resumen Principal */}
        <SummaryCards>
          <SummaryCard>
            <SummaryIcon $variant="sales">
              <Icon icon="lucide:trending-up" />
            </SummaryIcon>
            <SummaryInfo>
              <SummaryLabel>Ventas Totales</SummaryLabel>
              <SummaryValue>
                {FormatearNumeroDinero(totalVentasMetodoPago, dataempresa?.currency, dataempresa?.iso)}
              </SummaryValue>
            </SummaryInfo>
          </SummaryCard>

          <SummaryCard>
            <SummaryIcon $variant="cash">
              <Icon icon="lucide:banknote" />
            </SummaryIcon>
            <SummaryInfo>
              <SummaryLabel>Efectivo en Caja</SummaryLabel>
              <SummaryValue>
                {FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}
              </SummaryValue>
            </SummaryInfo>
          </SummaryCard>
        </SummaryCards>

        {/* Tablas de detalle */}
        <DetailSection>
          <DetailGrid>
            {/* Dinero en Caja */}
            <DetailCard>
              <DetailTitle>
                <Icon icon="lucide:wallet" />
                Dinero en Caja
              </DetailTitle>
              <DetailList>
                <DetailItem>
                  <span>Fondo de caja</span>
                  <span>{FormatearNumeroDinero(totalAperturaCaja, dataempresa?.currency, dataempresa?.iso)}</span>
                </DetailItem>
                <DetailItem>
                  <span>Ventas en efectivo</span>
                  <span>{FormatearNumeroDinero(totalVentasEfectivo, dataempresa?.currency, dataempresa?.iso)}</span>
                </DetailItem>
                <DetailItem>
                  <span>Ingresos varios</span>
                  <span className="positive">+{FormatearNumeroDinero(totalIngresosVariosCaja, dataempresa?.currency, dataempresa?.iso)}</span>
                </DetailItem>
                <DetailItem>
                  <span>Gastos varios</span>
                  <span className="negative">-{FormatearNumeroDinero(totalGastosVariosCaja, dataempresa?.currency, dataempresa?.iso)}</span>
                </DetailItem>
                <Divider />
                <DetailItem className="total">
                  <span>Total</span>
                  <span>{FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}</span>
                </DetailItem>
              </DetailList>
            </DetailCard>

            {/* Ventas por método */}
            <DetailCard>
              <DetailTitle>
                <Icon icon="lucide:credit-card" />
                Ventas por Método
              </DetailTitle>
              <DetailList>
                {dataventasmetodopago?.map((item, index) => (
                  <DetailItem key={index}>
                    <span>{item?.metodo_pago}</span>
                    <span>{FormatearNumeroDinero(item?.monto, dataempresa?.currency, dataempresa?.iso)}</span>
                  </DetailItem>
                ))}
                <Divider />
                <DetailItem className="total">
                  <span>Total Ventas</span>
                  <span>{FormatearNumeroDinero(totalVentasMetodoPago, dataempresa?.currency, dataempresa?.iso)}</span>
                </DetailItem>
              </DetailList>
            </DetailCard>
          </DetailGrid>
        </DetailSection>

        {/* Botón de cerrar caja */}
        <Footer>
          <CloseRegisterButton onClick={() => setStateConteoCaja(true)}>
            <Icon icon="lucide:lock" />
            Cerrar Caja
          </CloseRegisterButton>
        </Footer>

        {stateConteoCaja && <PantallaConteoCaja />}
      </Container>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Container = styled.div`
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
`;

const LoadingContainer = styled.div`
  background: #fff;
  padding: 40px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #666;

  svg {
    font-size: 32px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  background: #fef2f2;
  padding: 40px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #dc2626;

  svg {
    font-size: 32px;
  }
`;

const Header = styled.div`
  padding: 24px 24px 20px;
  text-align: center;
  position: relative;
  border-bottom: 1px solid #f0f0f0;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  font-size: 20px;
  transition: all 0.15s;

  &:hover {
    background: #eee;
    color: #111;
  }
`;

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  background: #111;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  svg {
    font-size: 28px;
    color: #fff;
  }
`;

const Title = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #111;
  margin: 0 0 8px;
`;

const DateRange = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 20px;

  svg {
    font-size: 14px;
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fafafa;
  border-radius: 14px;
`;

const SummaryIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $variant }) => $variant === 'sales' ? '#f0fdf4' : '#eff6ff'};

  svg {
    font-size: 22px;
    color: ${({ $variant }) => $variant === 'sales' ? '#16a34a' : '#2563eb'};
  }
`;

const SummaryInfo = styled.div`
  flex: 1;
`;

const SummaryLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
`;

const SummaryValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #111;
`;

const DetailSection = styled.div`
  padding: 20px 24px;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCard = styled.div`
  background: #fafafa;
  border-radius: 14px;
  padding: 16px;
`;

const DetailTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111;
  margin-bottom: 14px;

  svg {
    font-size: 18px;
    color: #666;
  }
`;

const DetailList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;

  .positive {
    color: #16a34a;
  }

  .negative {
    color: #dc2626;
  }

  &.total {
    font-weight: 600;
    color: #111;
    font-size: 14px;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: #e5e5e5;
  margin: 4px 0;
`;

const Footer = styled.div`
  padding: 20px 24px;
  border-top: 1px solid #f0f0f0;
`;

const CloseRegisterButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #b91c1c;
    transform: translateY(-1px);
  }

  svg {
    font-size: 20px;
  }
`;
