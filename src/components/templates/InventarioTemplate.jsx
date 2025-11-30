import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import ConfettiExplosion from "react-confetti-explosion";
import * as XLSX from "xlsx";

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
  
  // Estados para filtros
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");

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

  // Filtrar movimientos según los filtros aplicados
  const datosFiltrados = useMemo(() => {
    if (!dataMovimientos) return [];
    
    return dataMovimientos.filter((mov) => {
      // Filtro por tipo de movimiento
      if (tipoFiltro !== "todos") {
        if (mov.tipo_movimiento?.toLowerCase() !== tipoFiltro) {
          return false;
        }
      }
      
      // Filtro por fecha desde
      if (fechaDesde) {
        const fechaMov = new Date(mov.fecha);
        const desde = new Date(fechaDesde);
        desde.setHours(0, 0, 0, 0);
        if (fechaMov < desde) {
          return false;
        }
      }
      
      // Filtro por fecha hasta
      if (fechaHasta) {
        const fechaMov = new Date(mov.fecha);
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (fechaMov > hasta) {
          return false;
        }
      }
      
      return true;
    });
  }, [dataMovimientos, tipoFiltro, fechaDesde, fechaHasta]);

  // Verificar si hay filtros activos
  const hayFiltrosActivos = fechaDesde || fechaHasta || tipoFiltro !== "todos";

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
    setTipoFiltro("todos");
  }

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

  function exportarExcel() {
    if (!datosFiltrados || datosFiltrados.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    // Formatear los datos para Excel (usa datos filtrados)
    const datosExcel = datosFiltrados.map((mov) => ({
      "Fecha": mov.fecha ? new Date(mov.fecha).toLocaleDateString("es-PE") : "-",
      "Sucursal": mov.almacen?.sucursales?.nombre || "-",
      "Almacén": mov.almacen?.nombre || "-",
      "Movimiento": mov.detalle || "-",
      "Origen": mov.origen || "-",
      "Tipo": mov.tipo_movimiento || "-",
      "Cantidad": mov.tipo_movimiento?.toLowerCase() === "ingreso" ? `+${mov.cantidad}` : `-${mov.cantidad}`,
    }));

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar ancho de columnas
    ws["!cols"] = [
      { wch: 12 }, // Fecha
      { wch: 18 }, // Sucursal
      { wch: 20 }, // Almacén
      { wch: 30 }, // Movimiento
      { wch: 12 }, // Origen
      { wch: 10 }, // Tipo
      { wch: 12 }, // Cantidad
    ];

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

    // Generar nombre del archivo
    const nombreProducto = productosItemSelect?.nombre?.replace(/[^a-zA-Z0-9]/g, "_") || "producto";
    const fecha = new Date().toISOString().split("T")[0];
    const nombreArchivo = `Inventario_${nombreProducto}_${fecha}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
    toast.success("Archivo Excel generado correctamente");
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
        <ButtonGroup>
          <ExportButton 
            onClick={exportarExcel} 
            disabled={!productosItemSelect?.id || !dataMovimientos?.length}
          >
            <Icon icon="lucide:download" />
            Exportar Excel
          </ExportButton>
          <AddButton onClick={nuevoRegistro} disabled={!productosItemSelect?.id}>
            <Icon icon="lucide:plus" />
            Nuevo movimiento
          </AddButton>
        </ButtonGroup>
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

        {/* Filtros - solo mostrar si hay producto seleccionado */}
        {productosItemSelect?.id && (
          <FiltersSection>
            <FilterGroup>
              <FilterLabel>
                <Icon icon="lucide:calendar" width="14" />
                Desde
              </FilterLabel>
              <FilterInput
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <Icon icon="lucide:calendar" width="14" />
                Hasta
              </FilterLabel>
              <FilterInput
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </FilterGroup>

            <FilterDivider />

            <FilterGroup>
              <FilterLabel>
                <Icon icon="lucide:filter" width="14" />
                Tipo
              </FilterLabel>
              <FilterSelect
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </FilterSelect>
            </FilterGroup>

            {hayFiltrosActivos && (
              <ClearFiltersButton onClick={limpiarFiltros}>
                <Icon icon="lucide:rotate-ccw" width="14" />
                Limpiar
              </ClearFiltersButton>
            )}

            <FilterResults>
              <strong>{datosFiltrados.length}</strong> de {dataMovimientos?.length || 0} registros
            </FilterResults>
          </FiltersSection>
        )}

        {/* Tabla */}
        {productosItemSelect?.id ? (
          <TablaInventarios data={datosFiltrados} />
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

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ disabled }) => disabled ? '#e5e7eb' : '#fff'};
  color: ${({ disabled }) => disabled ? '#9ca3af' : '#059669'};
  border: 2px solid ${({ disabled }) => disabled ? '#e5e7eb' : '#059669'};
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;

  &:hover {
    background: ${({ disabled }) => disabled ? '#e5e7eb' : '#059669'};
    color: ${({ disabled }) => disabled ? '#9ca3af' : '#fff'};
    transform: ${({ disabled }) => disabled ? 'none' : 'translateY(-1px)'};
  }
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

const FiltersSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #f3f4f6;
  transition: all 0.2s;

  &:focus-within {
    background: #fff;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
  }
`;

const FilterLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
  
  svg {
    color: #9ca3af;
  }
`;

const FilterInput = styled.input`
  padding: 6px 8px;
  border: none;
  font-size: 14px;
  background: transparent;
  min-width: 130px;
  color: #111;
  font-weight: 500;

  &:focus {
    outline: none;
  }

  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 1;
    }
  }
`;

const FilterSelect = styled.select`
  padding: 6px 8px;
  border: none;
  font-size: 14px;
  background: transparent;
  min-width: 100px;
  color: #111;
  font-weight: 500;
  cursor: pointer;

  &:focus {
    outline: none;
  }
`;

const FilterDivider = styled.div`
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
`;

const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }
`;

const FilterResults = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  padding: 8px 14px;
  background: #f0fdf4;
  border-radius: 20px;
  
  strong {
    color: #059669;
    font-weight: 600;
  }
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
