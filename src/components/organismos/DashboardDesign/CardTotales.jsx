import { Icon } from "@iconify/react/dist/iconify.js";
import styled from "styled-components";
import { FormatearNumeroDinero } from "../../../utils/Conversiones";
import { useEmpresaStore } from "../../../store/EmpresaStore";

export const CardTotales = ({ title, value, percentage }) => {
  const isPositive = percentage > 0;
  const isNeutral = percentage === 0;
  const { dataempresa } = useEmpresaStore();

  return (
    <Container>
      <Label>{title}</Label>
      <Value>
        {FormatearNumeroDinero(value || 0, dataempresa?.currency, dataempresa?.iso)}
      </Value>
      {percentage !== undefined && (
        <PercentageWrapper $isPositive={isPositive} $isNeutral={isNeutral}>
          <Icon 
            icon={isNeutral ? "lucide:minus" : isPositive ? "lucide:trending-up" : "lucide:trending-down"} 
            width="14" 
            height="14"
          />
          <span>{Math.abs(percentage)}% vs periodo anterior</span>
        </PercentageWrapper>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
`;

const Value = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: #111;
  line-height: 1.2;
`;

const PercentageWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
  color: ${props => 
    props.$isNeutral ? '#6b7280' : 
    props.$isPositive ? '#16a34a' : '#dc2626'
  };
  
  span {
    white-space: nowrap;
  }
`;
