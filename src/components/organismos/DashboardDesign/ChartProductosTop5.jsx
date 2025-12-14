import styled from "styled-components";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useDetalleVentasStore } from "../../../store/DetalleVentasStore";
import { useQuery } from "@tanstack/react-query";
import { BarLoader } from "react-spinners";
import { useDashboardStore } from "../../../store/DashboardStore";
import { Lottieanimacion } from "../../atomos/Lottieanimacion";
import animacionvacio from "../../../assets/vacioanimacion.json";
import { Icon } from "@iconify/react/dist/iconify.js";

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export const ChartProductosTop5 = () => {
  const { dataempresa } = useEmpresaStore();
  const { fechaInicio, fechaFin } = useDashboardStore();
  const { mostrartop5productosmasvendidosxcantidad } = useDetalleVentasStore();
  
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "mostrar top5 productos mas vendidos xcantidad",
      {
        _id_empresa: dataempresa?.id,
        _fecha_inicio: fechaInicio,
        _fecha_fin: fechaFin,
      },
    ],
    queryFn: () =>
      mostrartop5productosmasvendidosxcantidad({
        _id_empresa: dataempresa?.id,
        _fecha_inicio: fechaInicio,
        _fecha_fin: fechaFin,
      }),
    enabled: !!dataempresa,
  });
  
  if (isLoading) {
    return (
      <Container>
        <LoadingWrapper>
          <BarLoader color="#6366f1" />
        </LoadingWrapper>
      </Container>
    );
  }
  
  if (error) return <Container><ErrorText>Error: {error.message}</ErrorText></Container>;
  
  return (
    <Container>
      <Header>
        <HeaderIcon>
          <Icon icon="lucide:trophy" />
        </HeaderIcon>
        <HeaderText>
          <Title>Top 5 Productos</Title>
          <Subtitle>Por cantidad vendida</Subtitle>
        </HeaderText>
      </Header>
      
      {data && data.length > 0 ? (
        <>
          <ProductList>
            {data?.map((item, index) => (
              <ProductRow key={index}>
                <RankBadge style={{ background: COLORS[index] }}>
                  {index + 1}
                </RankBadge>
                <ProductInfo>
                  <ProductName>{item.nombre_producto}</ProductName>
                  <ProductStats>
                    <StatValue>{item.total_vendido} uds</StatValue>
                    <StatPercent>{item.porcentaje}%</StatPercent>
                  </ProductStats>
                </ProductInfo>
              </ProductRow>
            ))}
          </ProductList>
          
          <ChartWrapper>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre_producto" hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="total_vendido"
                  radius={[0, 6, 6, 0]}
                  barSize={20}
                >
                  {data?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </>
      ) : (
        <EmptyState>
          <Lottieanimacion animacion={animacionvacio} alto="150" ancho="150" />
          <EmptyText>Sin datos en este período</EmptyText>
        </EmptyState>
      )}
    </Container>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <TooltipContainer>
        <TooltipLabel>{payload[0].payload.nombre_producto}</TooltipLabel>
        <TooltipValue>{payload[0].value} unidades</TooltipValue>
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

const ErrorText = styled.span`
  color: #dc2626;
  font-size: 14px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef3c7;
  color: #d97706;
  border-radius: 10px;
  font-size: 20px;
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
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

const ProductList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
`;

const ProductRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const RankBadge = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

const ProductInfo = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
`;

const ProductName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`;

const ProductStats = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #111;
`;

const StatPercent = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
`;

const ChartWrapper = styled.div`
  margin-top: auto;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;
`;

const EmptyText = styled.span`
  font-size: 13px;
  color: #6b7280;
`;

const TooltipContainer = styled.div`
  background: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
`;

const TooltipLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 2px;
`;

const TooltipValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #111;
`;
