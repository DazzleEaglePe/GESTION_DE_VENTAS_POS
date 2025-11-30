import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import ConfettiExplosion from "react-confetti-explosion";

import { useMovStockStore } from "../../store/MovStockStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { useProductosStore } from "../../store/ProductosStore";
import { useGlobalStore } from "../../store/GlobalStore";
import { useStockStore } from "../../store/StockStore";
import { TablaInventarios } from "../organismos/tablas/TablaInventarios";
import { RegistrarInventario } from "../organismos/formularios/RegistrarInventario";

export function InventarioTemplate() {
  const [isExploding, setIsExploding] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { mostrarMovStock } = useMovStockStore();
  const { dataempresa } = useEmpresaStore();
  const { buscarProductos, buscador, setBuscador, selectProductos, productosItemSelect, resetProductosItemSelect } = useProductosStore();
  const { setStateClose, setAccion, stateClose } = useGlobalStore();
  const { mostrarStockTotalXProducto } = useStockStore();

  // Limpiar producto seleccionado al montar el componente
  useEffect(() => {
    resetProductosItemSelect();
    setBusqueda("");
    setBuscador("");
  }, []);

  // Buscar productos
  const { data: dataproductos } = useQuery({
    queryKey: ["buscar productos inventario", buscador],
    queryFn: () => buscarProductos({ id_empresa: dataempresa?.id, buscador: buscador }),
    enabled: !!dataempresa,
  });

  // Mostrar movimientos de stock
  const { data: dataMovimientos } = useQuery({
    queryKey: ["mostrar movimientos de stock", { id_empresa: dataempresa?.id, id_producto: productosItemSelect?.id }],
    queryFn: () => mostrarMovStock({ id_empresa: dataempresa?.id, id_producto: productosItemSelect?.id }),
    enabled: !!dataempresa && !!productosItemSelect?.id,
  });

  // Mostrar stock total del producto en todos los almacenes
  const { data: dataStockTotal } = useQuery({
    queryKey: ["mostrar stock total producto", productosItemSelect?.id],
    queryFn: () => mostrarStockTotalXProducto({ id_producto: productosItemSelect?.id }),
    enabled: !!productosItemSelect?.id,
  });

  // Calcular stock total sumando todos los almacenes
  const stockTotal = dataStockTotal?.reduce((total, item) => total + (item.stock || 0), 0) || 0;

  function nuevoRegistro() {
    if (!productosItemSelect?.id) {
      return;
    }
    setStateClose(true);
    setAccion("Nuevo");
  }

  function handleBusqueda(e) {
    setBusqueda(e.target.value);
    setBuscador(e.target.value);
  }

  function handleSelectProducto(producto) {
    selectProductos(producto);
    setBusqueda("");
    setBuscador("");
  }

  return (
    <Container>
      <Toaster position="top-center" richColors />
      {isExploding && <ConfettiExplosion />}

      {stateClose && <RegistrarInventario setIsExploding={setIsExploding} />}

      {/* Header */}
      <Header>
        <HeaderInfo>
          <TitleWrapper>
            <IconWrapper>
              <Icon icon="lucide:package-search" width="24" />
            </IconWrapper>
            <div>
              <Title>Inventario</Title>
              <Subtitle>Gestiona los movimientos de stock</Subtitle>
            </div>
          </TitleWrapper>
        </HeaderInfo>
        <AddButton onClick={nuevoRegistro} disabled={!productosItemSelect?.id}>
          <Icon icon="lucide:plus" />
          Nuevo movimiento
        </AddButton>
      </Header>

      {/* Content Card */}
      <Card>
        {/* Search & Filter Section */}
        <TopSection>
          <SearchContainer>
            <SearchWrapper>
              <SearchIcon>
                <Icon icon="lucide:search" width="18" />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={handleBusqueda}
              />
              {busqueda && (
                <ClearButton onClick={() => { setBusqueda(""); setBuscador(""); }}>
                  <Icon icon="lucide:x" width="16" />
                </ClearButton>
              )}
            </SearchWrapper>

            {/* Dropdown de resultados */}
            {busqueda && dataproductos && dataproductos.length > 0 && (
              <SearchDropdown>
                {dataproductos.map((producto) => (
                  <SearchItem 
                    key={producto.id} 
                    onClick={() => handleSelectProducto(producto)}
                    $selected={productosItemSelect?.id === producto.id}
                  >
                    <Icon icon="lucide:package" width="16" />
                    <span>{producto.nombre}</span>
                    {producto.codigo_barras && (
                      <small>{producto.codigo_barras}</small>
                    )}
                  </SearchItem>
                ))}
              </SearchDropdown>
            )}
          </SearchContainer>

          {/* Producto seleccionado */}
          {productosItemSelect?.nombre && (
            <SelectedProduct>
              <Icon icon="lucide:check-circle" width="18" />
              <span>Producto: <strong>{productosItemSelect.nombre}</strong></span>
              <ProductBadge>
                Stock: {stockTotal}
              </ProductBadge>
            </SelectedProduct>
          )}
        </TopSection>

        {/* Tabla */}
        {productosItemSelect?.id ? (
          <TablaInventarios data={dataMovimientos || []} />
        ) : (
          <EmptyState>
            <Icon icon="lucide:package-search" width="64" />
            <h3>Selecciona un producto</h3>
            <p>Busca y selecciona un producto para ver sus movimientos de inventario</p>
          </EmptyState>
        )}
      </Card>
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  min-height: calc(100vh - 80px);
  padding: 24px;
  background: #f5f5f5;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #111;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ disabled }) => disabled ? '#d1d5db' : '#111'};
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;

  &:hover {
    background: ${({ disabled }) => disabled ? '#d1d5db' : '#333'};
    transform: ${({ disabled }) => disabled ? 'none' : 'translateY(-1px)'};
  }
`;

const Card = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const TopSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`;

const SearchContainer = styled.div`
  position: relative;
  max-width: 400px;
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  color: #9ca3af;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  background: #f9fafb;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;

  &:hover {
    color: #6b7280;
  }
`;

const SearchDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  margin-top: 4px;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

const SearchItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  background: ${({ $selected }) => $selected ? '#f0f9ff' : 'transparent'};
  border-left: 3px solid ${({ $selected }) => $selected ? '#6366f1' : 'transparent'};

  &:hover {
    background: #f5f5f5;
  }

  span {
    flex: 1;
    font-size: 14px;
    color: #111;
  }

  small {
    font-size: 12px;
    color: #9ca3af;
  }

  svg {
    color: #9ca3af;
  }
`;

const SelectedProduct = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  color: #166534;
  font-size: 14px;

  svg {
    color: #22c55e;
  }

  strong {
    font-weight: 600;
  }
`;

const ProductBadge = styled.span`
  margin-left: auto;
  padding: 4px 10px;
  background: #dcfce7;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;

  svg {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    margin: 0;
    text-align: center;
  }
`;
