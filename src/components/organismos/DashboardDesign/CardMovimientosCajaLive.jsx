import styled from "styled-components";
import { LiveIndicator } from "../../moleculas/LiveIndicator";
import { TablaMovimientosCajaLive } from "../../organismos/tablas/TablaMovimientosCajaLive";
import { useEmpresaStore } from "../../..";
import { useMovCajaStore } from "../../../store/MovCajaStore";
import { useQuery } from "@tanstack/react-query";
import { BarLoader } from "react-spinners";
import { useSupabaseSubscription } from "../../../hooks/useSupabaseSubscription";
import { Icon } from "@iconify/react/dist/iconify.js";

export const CardMovimientosCajaLive = () => {
  const { dataempresa } = useEmpresaStore();
  const { mostrarmovimientoscajalive } = useMovCajaStore();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["mostrar movimientos caja live"],
    queryFn: () => mostrarmovimientoscajalive({ _id_empresa: dataempresa?.id }),
    enabled: !!dataempresa,
  });
  
  useSupabaseSubscription({
    channelName: "public:movimientos_caja",
    options: { event: "*", schema: "public", table: "movimientos_caja" },
    queryKey: ["mostrar movimientos caja live"],
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
        <HeaderLeft>
          <HeaderIcon>
            <Icon icon="lucide:wallet" />
          </HeaderIcon>
          <HeaderText>
            <Title>Movimientos de caja</Title>
            <Subtitle>Últimas transacciones</Subtitle>
          </HeaderText>
        </HeaderLeft>
        <LiveIndicator />
      </Header>
      <TableWrapper>
        <TablaMovimientosCajaLive data={data} />
      </TableWrapper>
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
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #2563eb;
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

const TableWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;
