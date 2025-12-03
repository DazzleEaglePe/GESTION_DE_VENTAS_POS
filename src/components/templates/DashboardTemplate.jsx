import styled from "styled-components";
import { Device } from "../../styles/breakpoints";
import { DashboardHeader } from "../organismos/DashboardDesign/DashboardHeader";
import { ChartVentas } from "../organismos/DashboardDesign/ChartVentas";
import { ChartProductosTop5 } from "../organismos/DashboardDesign/ChartProductosTop5";
import { CardMovimientosCajaLive } from "../organismos/DashboardDesign/CardMovimientosCajaLive";
import { CardProductosTopMonto } from "../organismos/DashboardDesign/CardProductosTopMonto";
import { useReportesStore } from "../../store/ReportesStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { Icon } from "@iconify/react/dist/iconify.js";
import { FormatearNumeroDinero } from "../../utils/Conversiones";

export const DashboardTemplate = () => {
  const { totalventas, porcentajeCambio, totalCantidadDetalleVentas, totalGanancias } = useReportesStore();
  const { dataempresa } = useEmpresaStore();
  
  const isPositive = porcentajeCambio > 0;
  const isNeutral = porcentajeCambio === 0;
  
  return (
    <Container>
      <DashboardHeader />
      
      <BentoGrid>
        {/* Hero - Ventas Totales */}
        <BentoCard className="hero">
          <HeroInner>
            <HeroTop>
              <HeroIcon>
                <Icon icon="lucide:wallet" width="20" height="20" />
              </HeroIcon>
              <HeroLabel>Ventas totales</HeroLabel>
            </HeroTop>
            <HeroValue>
              {FormatearNumeroDinero(totalventas || 0, dataempresa?.currency, dataempresa?.iso)}
            </HeroValue>
            <HeroBadge $isPositive={isPositive} $isNeutral={isNeutral}>
              <Icon 
                icon={isNeutral ? "lucide:minus" : isPositive ? "lucide:trending-up" : "lucide:trending-down"} 
                width="14" 
              />
              <span>{Math.abs(porcentajeCambio)}% vs anterior</span>
            </HeroBadge>
          </HeroInner>
        </BentoCard>

        {/* KPI - Productos */}
        <BentoCard className="kpi">
          <KPIInner>
            <KPITop>
              <KPIIcon className="blue">
                <Icon icon="lucide:package" width="18" height="18" />
              </KPIIcon>
              <KPILabel>Productos vendidos</KPILabel>
            </KPITop>
            <KPIValue>{totalCantidadDetalleVentas || 0}</KPIValue>
            <KPISubtext>unidades</KPISubtext>
          </KPIInner>
        </BentoCard>

        {/* KPI - Ganancias */}
        <BentoCard className="kpi">
          <KPIInner>
            <KPITop>
              <KPIIcon className="green">
                <Icon icon="lucide:trending-up" width="18" height="18" />
              </KPIIcon>
              <KPILabel>Ganancias</KPILabel>
            </KPITop>
            <KPIValue className="green">
              {FormatearNumeroDinero(totalGanancias || 0, dataempresa?.currency, dataempresa?.iso)}
            </KPIValue>
            <KPISubtext>margen neto</KPISubtext>
          </KPIInner>
        </BentoCard>

        {/* Chart Ventas */}
        <BentoCard className="chart-main">
          <ChartVentas />
        </BentoCard>

        {/* Top 5 Productos */}
        <BentoCard className="chart-side">
          <ChartProductosTop5 />
        </BentoCard>

        {/* Movimientos Caja */}
        <BentoCard className="table">
          <CardMovimientosCajaLive />
        </BentoCard>

        {/* Productos Top */}
        <BentoCard className="table">
          <CardProductosTopMonto />
        </BentoCard>
      </BentoGrid>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  max-width: 1400px;
  margin: auto;
  gap: 20px;
  padding: 24px;`;

const BentoGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
  
  @media ${Device.tablet} {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media ${Device.desktop} {
    grid-template-columns: repeat(4, 1fr);
    
    .hero { grid-column: span 2; }
    .kpi { grid-column: span 1; }
    .chart-main { grid-column: span 3; }
    .chart-side { grid-column: span 1; }
    .table { grid-column: span 2; }
  }
`;

const BentoCard = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s ease;
  
  &:hover {
    border-color: #ddd;
  }
  
  &.hero {
    border-left: 3px solid #6366f1;
  }
  
  &.kpi {
    padding: 20px;
  }
  
  &.chart-main {
    min-height: 300px;
  }
  
  &.chart-side {
    min-height: 380px;
  }
`;

/* Hero Card - Minimalista */
const HeroInner = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const HeroTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HeroIcon = styled.div`
  width: 36px;
  height: 36px;
  background: #f5f5f7;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
`;

const HeroLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const HeroValue = styled.span`
  font-size: 32px;
  font-weight: 600;
  color: #111;
  letter-spacing: -0.5px;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => 
    props.$isNeutral ? '#888' :
    props.$isPositive ? '#16a34a' : '#dc2626'
  };
`;

/* KPI Cards - Minimalista */
const KPIInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const KPITop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const KPIIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.blue {
    background: #eff6ff;
    color: #3b82f6;
  }
  
  &.green {
    background: #f0fdf4;
    color: #22c55e;
  }
`;

const KPILabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #888;
`;

const KPIValue = styled.span`
  font-size: 26px;
  font-weight: 600;
  color: #111;
  letter-spacing: -0.3px;
  
  &.green {
    color: #16a34a;
  }
`;

const KPISubtext = styled.span`
  font-size: 11px;
  color: #aaa;
`;
