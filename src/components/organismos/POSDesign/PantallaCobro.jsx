import { Icon } from "@iconify/react/dist/iconify.js";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { IngresoCobro } from "./IngresoCobro";
import { VisorTicketVenta } from "./VisorTicketVenta";
import { useVentasStore } from "../../../store/VentasStore";
import { useDetalleVentasStore } from "../../../store/DetalleVentasStore";
import { Switch } from "../../ui/toggles/Switch";
import { useImpresorasStore } from "../../../store/ImpresorasStore";
import { useEditarImpresorasMutation } from "../../../tanstack/ImpresorasStack";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { FormatearNumeroDinero } from "../../../utils/Conversiones";
import { useSidebarStore } from "../../../store/SidebarStore";

export function PantallaCobro() {
  const [stateVerticket, setStateVerticker] = useState(false);
  const { setStatePantallaCobro, tipocobro } = useVentasStore();
  const ingresoCobroRef = useRef();
  const { datadetalleventa, total } = useDetalleVentasStore();
  const { statePrintDirecto, setStatePrintDirecto } = useImpresorasStore();
  const { mutate, isPending } = useEditarImpresorasMutation();
  const { dataempresa } = useEmpresaStore();
  const { sidebarOpen } = useSidebarStore();

  // Manejar teclas
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (ingresoCobroRef.current) {
          ingresoCobroRef.current.mutateAsync();
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setStatePantallaCobro({
          data: datadetalleventa,
          tipocobro: tipocobro,
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [datadetalleventa, tipocobro]);

  const handleVolver = () => {
    setStatePantallaCobro({
      data: datadetalleventa,
      tipocobro: tipocobro,
    });
  };

  return (
    <Container $sidebarOpen={sidebarOpen}>
      {stateVerticket && (
        <VisorTicketVenta
          setState={() => setStateVerticker(!stateVerticket)}
        />
      )}

      {/* Header */}
      <PageHeader>
        <HeaderLeft>
          <VolverButton onClick={handleVolver}>
            <Icon icon="lucide:arrow-left" />
            <span>Volver al carrito</span>
            <KeyHint>ESC</KeyHint>
          </VolverButton>
        </HeaderLeft>
        <HeaderRight>
          <PrintToggle>
            <Icon icon="lucide:printer" />
            <span>Imprimir directo</span>
            <Switch
              state={statePrintDirecto}
              setState={() => {
                setStatePrintDirecto();
                mutate();
              }}
            />
          </PrintToggle>
        </HeaderRight>
      </PageHeader>

      {/* Contenido Principal - Grid de 2 columnas */}
      <ContentGrid>
        {/* Módulo 1: Resumen de la Orden */}
        <ResumenCard>
          <CardHeader>
            <CardTitle>
              <Icon icon="lucide:shopping-cart" />
              Resumen de Orden
            </CardTitle>
            <Badge>{datadetalleventa?.length || 0} items</Badge>
          </CardHeader>

          <ProductList>
            {datadetalleventa?.map((item, index) => (
              <ProductItem key={index}>
                <ProductInfo>
                  <ProductQty>{item.cantidad}x</ProductQty>
                  <ProductName>{item.descripcion}</ProductName>
                </ProductInfo>
                <ProductPrice>
                  {FormatearNumeroDinero(
                    item.precio_venta * item.cantidad,
                    dataempresa?.currency,
                    dataempresa?.iso
                  )}
                </ProductPrice>
              </ProductItem>
            ))}
          </ProductList>

          <Divider />

          <TotalSection>
            <TotalRow>
              <span>Subtotal</span>
              <span>{FormatearNumeroDinero(total, dataempresa?.currency, dataempresa?.iso)}</span>
            </TotalRow>
            <TotalRow $main>
              <span>Total a cobrar</span>
              <TotalAmount>
                {FormatearNumeroDinero(total, dataempresa?.currency, dataempresa?.iso)}
              </TotalAmount>
            </TotalRow>
          </TotalSection>

          <HintBox>
            <Icon icon="lucide:info" />
            <span>Para modificar productos, regresa al carrito</span>
          </HintBox>
        </ResumenCard>

        {/* Módulo 2: Formulario de Cobro */}
        <CobroCard>
          {isPending ? (
            <LoadingState>
              <Icon icon="lucide:loader-2" className="spin" />
              <span>Guardando cambios...</span>
            </LoadingState>
          ) : (
            <IngresoCobro ref={ingresoCobroRef} />
          )}
        </CobroCard>
      </ContentGrid>
    </Container>
  );
}

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  background: #f5f5f5;
  overflow-y: auto;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Dejar espacio para el sidebar en desktop */
  @media (min-width: 768px) {
    left: ${({ $sidebarOpen }) => $sidebarOpen ? '260px' : '80px'};
  }
`;

const PageHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 50;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 16px 32px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const VolverButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: #fff;
  border: 1.5px solid #e5e5e5;
  border-radius: 10px;
  color: #333;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: #f9f9f9;
    border-color: #ccc;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const KeyHint = styled.span`
  display: none;
  font-size: 11px;
  padding: 3px 6px;
  background: #f0f0f0;
  border-radius: 4px;
  color: #888;
  font-weight: 500;

  @media (min-width: 768px) {
    display: inline;
  }
`;

const PrintToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #666;
  padding: 8px 14px;
  background: #f9f9f9;
  border-radius: 10px;

  svg {
    font-size: 18px;
    color: #888;
  }

  @media (min-width: 768px) {
    background: transparent;
    padding: 0;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: 768px) {
    grid-template-columns: 340px 1fr;
    padding: 32px;
    gap: 24px;
  }
`;

/* Módulo 1: Resumen */
const ResumenCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: fit-content;
  order: 2;

  @media (min-width: 768px) {
    order: 1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0;

  svg {
    font-size: 20px;
    color: #666;
  }
`;

const Badge = styled.span`
  font-size: 12px;
  padding: 4px 10px;
  background: #f0f0f0;
  color: #666;
  border-radius: 20px;
  font-weight: 500;
`;

const ProductList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 4px;
  }
`;

const ProductItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 10px;
`;

const ProductInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`;

const ProductQty = styled.span`
  font-weight: 600;
  color: #111;
  font-size: 14px;
  min-width: 32px;
`;

const ProductName = styled.span`
  font-size: 14px;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProductPrice = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: #111;
  margin-left: 12px;
`;

const Divider = styled.div`
  height: 1px;
  background: #eee;
  margin: 20px 0;
`;

const TotalSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${({ $main }) => ($main ? "16px" : "14px")};
  color: ${({ $main }) => ($main ? "#111" : "#666")};
  font-weight: ${({ $main }) => ($main ? "600" : "400")};
`;

const TotalAmount = styled.span`
  font-size: 22px;
  font-weight: 700;
  color: #16a34a;
`;

const HintBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 10px;
  font-size: 13px;
  color: #0369a1;

  svg {
    font-size: 16px;
    flex-shrink: 0;
  }
`;

/* Módulo 2: Cobro */
const CobroCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  order: 1;

  @media (min-width: 768px) {
    order: 2;
    align-items: center;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #666;

  svg {
    font-size: 32px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
