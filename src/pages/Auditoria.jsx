import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useAuditoriaStore } from "../store/AuditoriaStore";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useMemo } from "react";

// Mapeo de tablas a nombres legibles
const tablaNombres = {
  productos: "Productos",
  categorias: "Categorías",
  clientes_proveedores: "Clientes/Proveedores",
  metodos_pago: "Métodos de Pago",
  sucursales: "Sucursales",
  caja: "Cajas",
  almacen: "Almacenes",
  usuarios: "Usuarios",
  ventas: "Ventas",
  detalle_venta: "Detalle de Ventas",
  stock: "Stock",
  movimiento_stock: "Movimientos de Stock",
  cierres_caja: "Cierres de Caja",
  movimientos_caja: "Movimientos de Caja",
};

// Mapeo de operaciones a nombres legibles
const operacionNombres = {
  INSERT: "Creación",
  UPDATE: "Actualización",
  DELETE: "Eliminación",
  SOFT_DELETE: "Eliminación",
  RESTORE: "Restauración",
  LOGIN: "Inicio de sesión",
  LOGOUT: "Cierre de sesión",
  VENTA: "Venta",
  CIERRE_CAJA: "Cierre de caja",
  APERTURA_CAJA: "Apertura de caja",
  MOVIMIENTO_CAJA: "Movimiento de caja",
};

export function Auditoria() {
  const { dataempresa } = useEmpresaStore();
  const { consultarAuditoria, obtenerResumen } = useAuditoriaStore();
  const [filtroTabla, setFiltroTabla] = useState("todas");
  const [filtroOperacion, setFiltroOperacion] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  // Query para obtener auditoría
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["auditoria", dataempresa?.id],
    queryFn: () => consultarAuditoria({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // Query para obtener resumen
  const { data: resumen } = useQuery({
    queryKey: ["resumen-auditoria", dataempresa?.id],
    queryFn: () => obtenerResumen({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
  });

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.filter((item) => {
      const matchTabla = filtroTabla === "todas" || item.tabla === filtroTabla;
      const matchOperacion = filtroOperacion === "todas" || item.operacion === filtroOperacion;
      const matchBusqueda = !busqueda || 
        item.accion_detalle?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.nombre_usuario?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.tabla?.toLowerCase().includes(busqueda.toLowerCase());
      
      return matchTabla && matchOperacion && matchBusqueda;
    });
  }, [data, filtroTabla, filtroOperacion, busqueda]);

  // Obtener tablas y operaciones únicas para filtros
  const tablasUnicas = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map((item) => item.tabla))];
  }, [data]);

  const operacionesUnicas = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map((item) => item.operacion))];
  }, [data]);

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
          <span>Cargando registro de actividad...</span>
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
          <Icon icon="lucide:activity" />
        </HeaderIcon>
        <HeaderContent>
          <h1>Registro de Actividad</h1>
          <p>Historial de todas las operaciones realizadas en el sistema</p>
        </HeaderContent>
      </Header>

      {/* Resumen de estadísticas */}
      {resumen && (
        <StatsGrid>
          <StatCard>
            <StatIcon $color="#3b82f6">
              <Icon icon="lucide:activity" />
            </StatIcon>
            <StatInfo>
              <StatValue>{resumen.total_operaciones || 0}</StatValue>
              <StatLabel>Total de operaciones</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#10b981">
              <Icon icon="lucide:plus-circle" />
            </StatIcon>
            <StatInfo>
              <StatValue>{resumen.inserciones || 0}</StatValue>
              <StatLabel>Creaciones</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#f59e0b">
              <Icon icon="lucide:edit" />
            </StatIcon>
            <StatInfo>
              <StatValue>{resumen.actualizaciones || 0}</StatValue>
              <StatLabel>Actualizaciones</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#ef4444">
              <Icon icon="lucide:trash-2" />
            </StatIcon>
            <StatInfo>
              <StatValue>{resumen.eliminaciones || 0}</StatValue>
              <StatLabel>Eliminaciones</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#22c55e">
              <Icon icon="lucide:shopping-cart" />
            </StatIcon>
            <StatInfo>
              <StatValue>{resumen.ventas || 0}</StatValue>
              <StatLabel>Ventas</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIcon $color="#8b5cf6">
              <Icon icon="lucide:users" />
            </StatIcon>
            <StatInfo>
              <StatValue>{resumen.usuarios_activos || 0}</StatValue>
              <StatLabel>Usuarios activos</StatLabel>
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
            placeholder="Buscar en el registro..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </SearchBox>
        
        <FilterGroup>
          <FilterSelect
            value={filtroTabla}
            onChange={(e) => setFiltroTabla(e.target.value)}
          >
            <option value="todas">Todas las tablas</option>
            {tablasUnicas.map((tabla) => (
              <option key={tabla} value={tabla}>
                {tablaNombres[tabla] || tabla}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={filtroOperacion}
            onChange={(e) => setFiltroOperacion(e.target.value)}
          >
            <option value="todas">Todas las operaciones</option>
            {operacionesUnicas.map((op) => (
              <option key={op} value={op}>
                {operacionNombres[op] || op}
              </option>
            ))}
          </FilterSelect>
        </FilterGroup>
      </FiltersBar>

      {/* Lista de actividad */}
      {filteredData.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <Icon icon="lucide:activity" />
          </EmptyIcon>
          <EmptyTitle>No hay actividad registrada</EmptyTitle>
          <EmptyText>
            Las operaciones realizadas en el sistema aparecerán aquí
          </EmptyText>
        </EmptyState>
      ) : (
        <ActivityList>
          {filteredData.map((item) => (
            <ActivityItem key={item.id}>
              <ActivityIcon $color={item.color}>
                <Icon icon={item.icono || "lucide:activity"} />
              </ActivityIcon>
              <ActivityContent>
                <ActivityHeader>
                  <ActivityTitle>
                    {item.accion_detalle || `${operacionNombres[item.operacion] || item.operacion} en ${tablaNombres[item.tabla] || item.tabla}`}
                  </ActivityTitle>
                  <ActivityTime>
                    {formatearFechaRelativa(item.fecha_hora)}
                  </ActivityTime>
                </ActivityHeader>
                <ActivityMeta>
                  <MetaBadge>
                    <Icon icon="lucide:database" width="12" />
                    {tablaNombres[item.tabla] || item.tabla}
                  </MetaBadge>
                  <MetaBadge $variant={item.operacion}>
                    {operacionNombres[item.operacion] || item.operacion}
                  </MetaBadge>
                  {item.nombre_usuario && (
                    <MetaBadge>
                      <Icon icon="lucide:user" width="12" />
                      {item.nombre_usuario}
                    </MetaBadge>
                  )}
                  {item.registro_id && (
                    <MetaBadge>
                      ID: {item.registro_id}
                    </MetaBadge>
                  )}
                </ActivityMeta>
                {item.campos_modificados && item.campos_modificados.length > 0 && (
                  <CamposModificados>
                    <small>Campos modificados: {item.campos_modificados.join(", ")}</small>
                  </CamposModificados>
                )}
              </ActivityContent>
            </ActivityItem>
          ))}
        </ActivityList>
      )}

      {/* Contador de resultados */}
      {filteredData.length > 0 && (
        <ResultsCount>
          Mostrando {filteredData.length} de {data.length} registros
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
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
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
    background: none;
    font-size: 0.875rem;
    color: #334155;
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
  color: #334155;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ActivityItem = styled.div`
  display: flex;
  gap: 16px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const ActivityIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${(props) => props.$color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    font-size: 20px;
    color: ${(props) => props.$color};
  }
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
`;

const ActivityTitle = styled.div`
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1e293b;
`;

const ActivityTime = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
`;

const ActivityMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${(props) => {
    switch (props.$variant) {
      case "INSERT":
        return "#dcfce7";
      case "UPDATE":
        return "#dbeafe";
      case "DELETE":
      case "SOFT_DELETE":
        return "#fee2e2";
      case "RESTORE":
        return "#ede9fe";
      default:
        return "#f1f5f9";
    }
  }};
  color: ${(props) => {
    switch (props.$variant) {
      case "INSERT":
        return "#166534";
      case "UPDATE":
        return "#1e40af";
      case "DELETE":
      case "SOFT_DELETE":
        return "#dc2626";
      case "RESTORE":
        return "#7c3aed";
      default:
        return "#475569";
    }
  }};

  svg {
    font-size: 12px;
  }
`;

const CamposModificados = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  
  small {
    font-size: 0.75rem;
    color: #64748b;
  }
`;

const ResultsCount = styled.div`
  text-align: center;
  padding: 16px;
  font-size: 0.875rem;
  color: #64748b;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 16px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  svg {
    font-size: 40px;
    color: #94a3b8;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1.25rem;
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

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;

  svg {
    font-size: 32px;
    color: #6366f1;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  span {
    font-size: 0.875rem;
    color: #64748b;
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  background: #fef2f2;
  border-radius: 12px;
  color: #dc2626;

  svg {
    font-size: 24px;
  }
`;
