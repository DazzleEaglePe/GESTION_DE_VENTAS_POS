import styled from "styled-components";
import { useCierreCajaStore } from "../../../../store/CierreCajaStore";
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
    totalEfectivoTotalCaja,
  } = useMovCajaStore();
  const { dataempresa } = useEmpresaStore();
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
          <LoadingSpinner>
            <Icon icon="lucide:loader-2" />
          </LoadingSpinner>
          <LoadingText>Cargando resumen de caja...</LoadingText>
        </LoadingContainer>
      </Overlay>
    );
  }

  if (isError) {
    return (
      <Overlay>
        <ErrorContainer>
          <ErrorIcon>
            <Icon icon="lucide:alert-circle" />
          </ErrorIcon>
          <ErrorTitle>Error al cargar</ErrorTitle>
          <ErrorMessage>{error.message}</ErrorMessage>
          <RetryButton onClick={() => setStateCierraCaja(false)}>
            Cerrar
          </RetryButton>
        </ErrorContainer>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={() => setStateCierraCaja(false)}>
      <Container onClick={(e) => e.stopPropagation()}>
        {/* Header minimalista */}
        <Header>
          <HeaderTop>
            <BackButton onClick={() => setStateCierraCaja(false)}>
              <Icon icon="lucide:arrow-left" />
            </BackButton>
            <HeaderBadge>
              <Icon icon="lucide:clock" />
              {fechaInicioFormateada}
            </HeaderBadge>
          </HeaderTop>
          
          <HeaderContent>
            <HeaderTitle>Resumen de Caja</HeaderTitle>
            <HeaderSubtitle>Revisa los movimientos antes de cerrar</HeaderSubtitle>
          </HeaderContent>
        </Header>

        {/* Cards de resumen */}
        <SummarySection>
          <SummaryCard $variant="primary">
            <SummaryCardIcon>
              <Icon icon="lucide:wallet" />
            </SummaryCardIcon>
            <SummaryCardContent>
              <SummaryCardLabel>Efectivo en Caja</SummaryCardLabel>
              <SummaryCardValue>
                {FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}
              </SummaryCardValue>
            </SummaryCardContent>
          </SummaryCard>

          <SummaryCard $variant="secondary">
            <SummaryCardIcon $variant="secondary">
              <Icon icon="lucide:receipt" />
            </SummaryCardIcon>
            <SummaryCardContent>
              <SummaryCardLabel>Ventas Totales</SummaryCardLabel>
              <SummaryCardValue>
                {FormatearNumeroDinero(totalVentasMetodoPago, dataempresa?.currency, dataempresa?.iso)}
              </SummaryCardValue>
            </SummaryCardContent>
          </SummaryCard>
        </SummarySection>

        {/* Detalle de movimientos */}
        <DetailSection>
          <DetailBlock>
            <DetailHeader>
              <DetailHeaderIcon>
                <Icon icon="lucide:banknote" />
              </DetailHeaderIcon>
              <DetailHeaderTitle>Desglose de Efectivo</DetailHeaderTitle>
            </DetailHeader>
            
            <DetailList>
              <DetailRow>
                <DetailRowLabel>
                  <Icon icon="lucide:log-in" />
                  Fondo inicial
                </DetailRowLabel>
                <DetailRowValue>
                  {FormatearNumeroDinero(totalAperturaCaja, dataempresa?.currency, dataempresa?.iso)}
                </DetailRowValue>
              </DetailRow>
              
              <DetailRow>
                <DetailRowLabel>
                  <Icon icon="lucide:shopping-bag" />
                  Ventas en efectivo
                </DetailRowLabel>
                <DetailRowValue>
                  {FormatearNumeroDinero(totalVentasEfectivo, dataempresa?.currency, dataempresa?.iso)}
                </DetailRowValue>
              </DetailRow>
              
              <DetailRow $positive>
                <DetailRowLabel>
                  <Icon icon="lucide:plus-circle" />
                  Ingresos varios
                </DetailRowLabel>
                <DetailRowValue $positive>
                  +{FormatearNumeroDinero(totalIngresosVariosCaja, dataempresa?.currency, dataempresa?.iso)}
                </DetailRowValue>
              </DetailRow>
              
              <DetailRow $negative>
                <DetailRowLabel>
                  <Icon icon="lucide:minus-circle" />
                  Salidas / Gastos
                </DetailRowLabel>
                <DetailRowValue $negative>
                  -{FormatearNumeroDinero(totalGastosVariosCaja, dataempresa?.currency, dataempresa?.iso)}
                </DetailRowValue>
              </DetailRow>
            </DetailList>
            
            <DetailTotal>
              <span>Total Efectivo</span>
              <strong>{FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}</strong>
            </DetailTotal>
          </DetailBlock>

          <DetailBlock>
            <DetailHeader>
              <DetailHeaderIcon>
                <Icon icon="lucide:credit-card" />
              </DetailHeaderIcon>
              <DetailHeaderTitle>Ventas por Método</DetailHeaderTitle>
            </DetailHeader>
            
            <DetailList>
              {dataventasmetodopago?.map((item, index) => (
                <DetailRow key={index}>
                  <DetailRowLabel>
                    <Icon icon={
                      item?.metodo_pago?.toLowerCase().includes('efectivo') ? 'lucide:banknote' :
                      item?.metodo_pago?.toLowerCase().includes('tarjeta') ? 'lucide:credit-card' :
                      item?.metodo_pago?.toLowerCase().includes('yape') ? 'lucide:smartphone' :
                      item?.metodo_pago?.toLowerCase().includes('plin') ? 'lucide:smartphone' :
                      'lucide:wallet'
                    } />
                    {item?.metodo_pago}
                  </DetailRowLabel>
                  <DetailRowValue>
                    {FormatearNumeroDinero(item?.monto, dataempresa?.currency, dataempresa?.iso)}
                  </DetailRowValue>
                </DetailRow>
              ))}
            </DetailList>
            
            <DetailTotal>
              <span>Total Ventas</span>
              <strong>{FormatearNumeroDinero(totalVentasMetodoPago, dataempresa?.currency, dataempresa?.iso)}</strong>
            </DetailTotal>
          </DetailBlock>
        </DetailSection>

        {/* Footer con acción */}
        <Footer>
          <FooterInfo>
            <Icon icon="lucide:info" />
            Se realizará un conteo de efectivo físico
          </FooterInfo>
          <CloseRegisterButton onClick={() => setStateConteoCaja(true)}>
            <Icon icon="lucide:lock" />
            <span>Cerrar Caja</span>
          </CloseRegisterButton>
        </Footer>

        {stateConteoCaja && <PantallaConteoCaja />}
      </Container>
    </Overlay>
  );
}

// ============== ESTILOS ==============

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const Container = styled.div`
  background: #fff;
  border-radius: 24px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
`;

const LoadingContainer = styled.div`
  background: #fff;
  padding: 48px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 32px;
    color: #111;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.span`
  font-size: 14px;
  color: #666;
`;

const ErrorContainer = styled.div`
  background: #fff;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  max-width: 320px;
`;

const ErrorIcon = styled.div`
  width: 56px;
  height: 56px;
  background: #fef2f2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  svg {
    font-size: 28px;
    color: #dc2626;
  }
`;

const ErrorTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px;
`;

const ErrorMessage = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0 0 20px;
`;

const RetryButton = styled.button`
  padding: 10px 24px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
`;

/* Header */
const Header = styled.div`
  padding: 20px 24px;
  background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
  color: #fff;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const BackButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 18px;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const HeaderBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);

  svg {
    font-size: 14px;
  }
`;

const HeaderContent = styled.div``;

const HeaderTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
`;

const HeaderSubtitle = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
`;

/* Summary Cards */
const SummarySection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 20px 24px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${({ $variant }) => $variant === 'primary' ? '#111' : '#fff'};
  border-radius: 16px;
  ${({ $variant }) => $variant !== 'primary' && 'border: 1px solid #e5e5e5;'}
`;

const SummaryCardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $variant }) => $variant === 'secondary' ? '#f5f5f5' : 'rgba(255, 255, 255, 0.15)'};
  flex-shrink: 0;

  svg {
    font-size: 20px;
    color: ${({ $variant }) => $variant === 'secondary' ? '#666' : '#fff'};
  }
`;

const SummaryCardContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const SummaryCardLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ $variant }) => $variant === 'secondary' ? '#666' : 'rgba(255, 255, 255, 0.7)'};
  margin-bottom: 2px;
`;

const SummaryCardValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $variant }) => $variant === 'secondary' ? '#111' : '#fff'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/* Detail Section */
const DetailSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const DetailBlock = styled.div`
  background: #fafafa;
  border-radius: 16px;
  overflow: hidden;
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #f5f5f5;
`;

const DetailHeaderIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 16px;
    color: #666;
  }
`;

const DetailHeaderTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #111;
  margin: 0;
`;

const DetailList = styled.div`
  padding: 8px 0;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }
`;

const DetailRowLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #666;

  svg {
    font-size: 16px;
    color: #999;
  }
`;

const DetailRowValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ $positive, $negative }) => 
    $positive ? '#16a34a' : 
    $negative ? '#dc2626' : '#111'};
`;

const DetailTotal = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #f0f0f0;
  border-top: 1px solid #e5e5e5;

  span {
    font-size: 13px;
    color: #666;
  }

  strong {
    font-size: 16px;
    font-weight: 700;
    color: #111;
  }
`;

/* Footer */
const Footer = styled.div`
  padding: 16px 24px 24px;
  border-top: 1px solid #f0f0f0;
`;

const FooterInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;

  svg {
    font-size: 14px;
  }
`;

const CloseRegisterButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  font-size: 15px;
  font-weight: 600;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #b91c1c;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 20px;
  }
`;
