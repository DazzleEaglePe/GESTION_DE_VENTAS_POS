import styled from "styled-components";
import { useDetalleVentasStore, useEmpresaStore } from "../../..";
import { useQuery } from "@tanstack/react-query";
import { BarLoader } from "react-spinners";
import { useDashboardStore } from "../../../store/DashboardStore";
import { TablaProductosTop10 } from "../../organismos/tablas/TablaProductosTop10";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Lottieanimacion } from "../../atomos/Lottieanimacion";
import animacionvacio from "../../../assets/vacioanimacion.json";

export const CardProductosTopMonto = () => {
  const { dataempresa } = useEmpresaStore();
  const { mostrartop10productosmasvendidosxmonto } = useDetalleVentasStore();
  const { fechaInicio, fechaFin } = useDashboardStore();
  
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "mostrar top10 productos masvendidosxmonto",
      {
        _id_empresa: dataempresa?.id,
        _fecha_inicio: fechaInicio,
        _fecha_fin: fechaFin,
      },
    ],
    queryFn: () =>
      mostrartop10productosmasvendidosxmonto({
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
          <Icon icon="lucide:bar-chart-3" />
        </HeaderIcon>
        <HeaderText>
          <Title>Top 10 Productos</Title>
          <Subtitle>Por monto vendido</Subtitle>
        </HeaderText>
      </Header>
      <Content>
        {data && data.length > 0 ? (
          <TablaProductosTop10 data={data} />
        ) : (
          <EmptyState>
            <Lottieanimacion animacion={animacionvacio} alto="120" ancho="120" />
            <EmptyText>Sin datos en este período</EmptyText>
          </EmptyState>
        )}
      </Content>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

const ErrorText = styled.span`
  color: #dc2626;
  font-size: 14px;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dcfce7;
  color: #16a34a;
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

const Content = styled.div`
  flex: 1;
  overflow: hidden;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 8px;
`;

const EmptyText = styled.span`
  font-size: 13px;
  color: #6b7280;
`;
