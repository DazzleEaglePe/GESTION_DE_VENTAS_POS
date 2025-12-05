import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useCategoriasStore } from "../store/CategoriasStore";
import { useHistorialPreciosStore } from "../store/HistorialPreciosStore";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useMemo } from "react";

// Mapeo de tipos de cambio
const tipoCambioNombres = {
  manual: "Manual",
  promocion: "Promoción",
  ajuste_costo: "Ajuste de costo",
  inflacion: "Inflación",
  oferta: "Oferta",
  otro: "Otro",
};

export function HistorialPrecios() {
  const { dataempresa } = useEmpresaStore();
  const { datacategorias } = useCategoriasStore();
  const { consultarHistorialEmpresa, obtenerEstadisticas } = useHistorialPreciosStore();

  // Filtros locales
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Query para historial
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["historial-precios", dataempresa?.id],
    queryFn: () => consultarHistorialEmpresa(dataempresa?.id, true),
    enabled: !!dataempresa?.id,
  });

  // Query para estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ["estadisticas-precios", dataempresa?.id],
    queryFn: () => obtenerEstadisticas(dataempresa?.id),
    enabled: !!dataempresa?.id,
  });

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.filter((item) => {
      const matchCategoria = filtroCategoria === "todas" || 
        String(item.id_categoria) === filtroCategoria ||
        (filtroCategoria === "sin_categoria" && !item.nombre_categoria);
      const matchTipo = filtroTipo === "todos" || item.tipo_cambio === filtroTipo;
      const matchBusqueda = !busqueda || 
        item.nombre_producto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.codigo_barras?.toLowerCase().includes(busqueda.toLowerCase());
      
      return matchCategoria && matchTipo && matchBusqueda;
    });
  }, [data, filtroCategoria, filtroTipo, busqueda]);

  // Obtener tipos únicos para filtros
  const tiposUnicos = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map((item) => item.tipo_cambio))];
  }, [data]);

  // Formatear precio
  const formatearPrecio = (precio) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(precio || 0);
  };

  // Formatear fecha relativa
  const formatearFechaRelativa = (fecha) => {
    const ahora = new Date();
    const fechaEvento = new Date(fecha);
    const diffMs = ahora - fechaEvento;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Hace un momento";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras}h`;
    if (diffDias < 7) return `Hace ${diffDias} días`;
    
    return fechaEvento.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <Icon icon="lucide:loader-2" className="spin" />
          <span>Cargando historial de precios...</span>
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <Icon icon="lucide:alert-circle" />
          <span>Error al cargar: {error.message}</span>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header */}
      <Header>
        <HeaderIcon>
          <Icon icon="lucide:history" />
        </HeaderIcon>
        <HeaderContent>
          <h1>Historial de Precios</h1>
          <p>Seguimiento de todos los cambios de precios en tus productos</p>
        </HeaderContent>
        <HeaderStats>
          <StatBadge>
            <Icon icon="lucide:git-commit" />
            {data?.length || 0} cambios
          </StatBadge>
        </HeaderStats>
      </Header>

      {/* Estadísticas */}
      {estadisticas && (
        <StatsGrid>
          <StatCard>
            <StatIcon $color="#3b82f6">
              <Icon icon="lucide:git-commit" />
            </StatIcon>
            <StatInfo>
              <StatValue>{estadisticas.total_cambios || 0}</StatValue>
              <StatLabel>Total de cambios</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#ef4444">
              <Icon icon="lucide:trending-up" />
            </StatIcon>
            <StatInfo>
              <StatValue>{estadisticas.cambios_incremento || 0}</StatValue>
              <StatLabel>Incrementos</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#22c55e">
              <Icon icon="lucide:trending-down" />
            </StatIcon>
            <StatInfo>
              <StatValue>{estadisticas.cambios_decremento || 0}</StatValue>
              <StatLabel>Decrementos</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#f59e0b">
              <Icon icon="lucide:percent" />
            </StatIcon>
            <StatInfo>
              <StatValue>{estadisticas.promedio_variacion_venta || 0}%</StatValue>
              <StatLabel>Variación promedio</StatLabel>
            </StatInfo>
          </StatCard>
        </StatsGrid>
      )}

      {/* Filtros */}
      <FiltersBar>
        <SearchBox>
          <Icon icon="lucide:search" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </SearchBox>

        <FilterGroup>
          <FilterSelect
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="todas">Todas las categorías</option>
            {datacategorias?.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.nombre}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos los tipos</option>
            {tiposUnicos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipoCambioNombres[tipo] || tipo}
              </option>
            ))}
          </FilterSelect>
        </FilterGroup>
      </FiltersBar>

      {/* Lista de cambios */}
      {filteredData.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <Icon icon="lucide:history" />
          </EmptyIcon>
          <EmptyTitle>No hay cambios de precios</EmptyTitle>
          <EmptyText>
            Los cambios de precios en tus productos aparecerán aquí
          </EmptyText>
        </EmptyState>
      ) : (
        <PriceChangeList>
          {filteredData.map((item) => (
            <PriceChangeItem key={item.id}>
              <ChangeIcon $tendencia={item.variacion_venta > 0 ? "up" : item.variacion_venta < 0 ? "down" : "neutral"}>
                <Icon icon={item.variacion_venta > 0 ? "lucide:trending-up" : item.variacion_venta < 0 ? "lucide:trending-down" : "lucide:minus"} />
              </ChangeIcon>
              <ChangeContent>
                <ChangeHeader>
                  <ProductInfo>
                    <ProductName>{item.nombre_producto}</ProductName>
                    {item.codigo_barras && (
                      <ProductCode>{item.codigo_barras}</ProductCode>
                    )}
                  </ProductInfo>
                  <ChangeTime>
                    {formatearFechaRelativa(item.fecha_cambio)}
                  </ChangeTime>
                </ChangeHeader>
                <PriceChangeInfo>
                  <PriceBlock>
                    <PriceLabel>Anterior</PriceLabel>
                    <PriceValue $old>{formatearPrecio(item.precio_venta_anterior)}</PriceValue>
                  </PriceBlock>
                  <ArrowIcon>
                    <Icon icon="lucide:arrow-right" />
                  </ArrowIcon>
                  <PriceBlock>
                    <PriceLabel>Nuevo</PriceLabel>
                    <PriceValue>{formatearPrecio(item.precio_venta_nuevo)}</PriceValue>
                  </PriceBlock>
                  <VariacionBadge $tendencia={item.variacion_venta > 0 ? "up" : item.variacion_venta < 0 ? "down" : "neutral"}>
                    <Icon icon={item.variacion_venta > 0 ? "lucide:arrow-up" : item.variacion_venta < 0 ? "lucide:arrow-down" : "lucide:minus"} width="14" />
                    {Math.abs(item.variacion_venta || 0).toFixed(2)}%
                  </VariacionBadge>
                </PriceChangeInfo>
                <ChangeMeta>
                  {item.nombre_categoria && (
                    <MetaBadge>
                      <Icon icon="lucide:folder" width="12" />
                      {item.nombre_categoria}
                    </MetaBadge>
                  )}
                  <MetaBadge $tipo={item.tipo_cambio}>
                    {tipoCambioNombres[item.tipo_cambio] || item.tipo_cambio}
                  </MetaBadge>
                  {item.nombre_usuario && (
                    <MetaBadge>
                      <Icon icon="lucide:user" width="12" />
                      {item.nombre_usuario}
                    </MetaBadge>
                  )}
                </ChangeMeta>
              </ChangeContent>
            </PriceChangeItem>
          ))}
        </PriceChangeList>
      )}

      {/* Contador de resultados */}
      {filteredData.length > 0 && (
        <ResultsCount>
          Mostrando {filteredData.length} de {data.length} cambios
        </ResultsCount>
      )}
    </Container>
  );
}

// =====================
// STYLED COMPONENTS
// =====================

const Container = styled.div`
  min-height: calc(100vh - 50px);
  margin-top: 50px;
  padding: 30px;
  background: #f5f5f5;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 28px;
    color: #fff;
  }
`;

const HeaderContent = styled.div`
  flex: 1;

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 4px 0 0 0;
  }
`;

const HeaderStats = styled.div`
  display: flex;
  gap: 12px;
`;

const StatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;

  svg {
    font-size: 18px;
    color: #64748b;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: ${(props) => props.$color}15;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 22px;
    color: ${(props) => props.$color};
  }
`;

const StatInfo = styled.div``;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 4px;
`;

const FiltersBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;

  svg {
    color: #94a3b8;
    font-size: 18px;
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.875rem;
    color: #1e293b;
    outline: none;

    &::placeholder {
      color: #94a3b8;
    }
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 0.875rem;
  color: #1e293b;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: #3b82f6;
  }
`;

const PriceChangeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PriceChangeItem = styled.div`
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const ChangeIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  ${(props) => props.$tendencia === "up" && `
    background: #fef2f2;
    svg { color: #ef4444; }
  `}

  ${(props) => props.$tendencia === "down" && `
    background: #f0fdf4;
    svg { color: #22c55e; }
  `}

  ${(props) => props.$tendencia === "neutral" && `
    background: #f8fafc;
    svg { color: #94a3b8; }
  `}

  svg {
    font-size: 22px;
  }
`;

const ChangeContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ChangeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const ProductInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ProductName = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
`;

const ProductCode = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
`;

const ChangeTime = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;
  white-space: nowrap;
`;

const PriceChangeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 10px;
  }
`;

const PriceBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PriceLabel = styled.span`
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PriceValue = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${(props) => props.$old ? "#94a3b8" : "#1e293b"};
  ${(props) => props.$old && "text-decoration: line-through;"}
`;

const ArrowIcon = styled.div`
  color: #94a3b8;
  display: flex;
  align-items: center;

  svg {
    font-size: 18px;
  }
`;

const VariacionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-left: auto;

  ${(props) => props.$tendencia === "up" && `
    background: #fef2f2;
    color: #ef4444;
  `}

  ${(props) => props.$tendencia === "down" && `
    background: #f0fdf4;
    color: #22c55e;
  `}

  ${(props) => props.$tendencia === "neutral" && `
    background: #f8fafc;
    color: #94a3b8;
  `}
`;

const ChangeMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #64748b;

  svg {
    opacity: 0.7;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: #fff;
  border-radius: 16px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  svg {
    font-size: 36px;
    color: #cbd5e1;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  max-width: 300px;
`;

const ResultsCount = styled.div`
  text-align: center;
  padding: 16px;
  font-size: 0.8rem;
  color: #94a3b8;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
  color: #64748b;
  font-size: 0.875rem;

  .spin {
    animation: spin 1s linear infinite;
    font-size: 32px;
    color: #3b82f6;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 12px;
  color: #ef4444;

  svg {
    font-size: 32px;
  }
`;

export default HistorialPrecios;
