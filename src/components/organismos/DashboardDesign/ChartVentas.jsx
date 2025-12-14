import styled from "styled-components";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { FormatearNumeroDinero } from "../../../utils/Conversiones";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  useMostrarVentasDashboardPeriodoAnteriorQuery,
  useMostrarVentasDashboardQuery,
  useMostrarCantidadDetalleVentaDashboardQuery,
  useGananciasDetalleVentaQuery
} from "../../../tanstack/ReportesStack";
import { useReportesStore } from "../../../store/ReportesStore";
import { BarLoader } from "react-spinners";

export const ChartVentas = () => {
  const { data, isLoading } = useMostrarVentasDashboardQuery();
  const { data: data2 } = useMostrarVentasDashboardPeriodoAnteriorQuery();
  const { data: data3 } = useMostrarCantidadDetalleVentaDashboardQuery();
  const { totalventas, porcentajeCambio } = useReportesStore();
  const { data: data4 } = useGananciasDetalleVentaQuery();
  const { dataempresa } = useEmpresaStore();

  const isPositive = porcentajeCambio > 0;
  const isNeutral = porcentajeCambio === 0;

  if (isLoading) {
    return (
      <Container>
        <LoadingWrapper>
          <BarLoader color="#6366f1" />
        </LoadingWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Title>Ventas totales</Title>
          <Subtitle>Evolución de ventas en el período</Subtitle>
        </HeaderLeft>
        <HeaderRight>
          <TotalValue>
            {FormatearNumeroDinero(totalventas || 0, dataempresa?.currency, dataempresa?.iso)}
          </TotalValue>
          <ChangeIndicator $isPositive={isPositive} $isNeutral={isNeutral}>
            <Icon
              width="16"
              height="16"
              icon={isNeutral ? "lucide:minus" : isPositive ? "lucide:trending-up" : "lucide:trending-down"}
            />
            <span>{Math.abs(porcentajeCambio)}%</span>
          </ChangeIndicator>
        </HeaderRight>
      </Header>
      
      <ChartWrapper>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeOpacity={0.1} vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="fecha"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              dy={10}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              strokeWidth={2}
              type="monotone"
              dataKey="total_ventas"
              stroke="#6366f1"
              fill="url(#colorVentas)"
              activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </Container>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  const { dataempresa } = useEmpresaStore();
  if (active && payload && payload.length) {
    return (
      <TooltipContainer>
        <TooltipDate>{label}</TooltipDate>
        <TooltipValue>
          {FormatearNumeroDinero(payload[0].value, dataempresa?.currency, dataempresa?.iso)}
        </TooltipValue>
      </TooltipContainer>
    );
  }
  return null;
};

const Container = styled.div`
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: #6b7280;
  margin: 0;
`;

const TotalValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #111;
`;

const ChangeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${props => 
    props.$isNeutral ? '#f3f4f6' : 
    props.$isPositive ? '#dcfce7' : '#fee2e2'
  };
  color: ${props => 
    props.$isNeutral ? '#6b7280' : 
    props.$isPositive ? '#16a34a' : '#dc2626'
  };
`;

const ChartWrapper = styled.div`
  flex: 1;
`;

const TooltipContainer = styled.div`
  background: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
`;

const TooltipDate = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
`;

const TooltipValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #111;
`;
