import styled from "styled-components";
import { Device } from "../../../styles/breakpoints";
import { DateRangeFilter } from "./DateRangeFilter";

export const DashboardHeader = () => {
  return (
    <Container>
      <TextContainer>
        <Title>Dashboard</Title>
        <Subtitle>Resumen de tu negocio</Subtitle>
      </TextContainer>
      <ActionsContainer>
        <DateRangeFilter />
      </ActionsContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  
  @media ${Device.desktop} {
    flex-direction: row;
    align-items: center;
  }
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #111;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const ActionsContainer = styled.div`
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
`;
