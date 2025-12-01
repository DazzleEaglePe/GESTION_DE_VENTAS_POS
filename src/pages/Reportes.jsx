import { useState } from "react";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useSucursalesStore } from "../store/SucursalesStore";
import { useReportStore } from "../store/ReportStore";
import { FormatearNumeroDinero } from "../utils/Conversiones";
import * as XLSX from "xlsx";
import { BarLoader } from "react-spinners";

export function Reportes() {
  const { dataempresa } = useEmpresaStore();
  const { dataSucursales, mostrarSucursales } = useSucursalesStore();
  const { reportVentasPorSucursal, reportStockBajoMinimo } = useReportStore();
  
  // Cargar sucursales al montar el componente
  const { isLoading: isLoadingSucursales } = useQuery({
    queryKey: ["mostrar sucursales reportes", dataempresa?.id],
    queryFn: () => mostrarSucursales({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa,
  });
  
  // Estados
  const [reporteActivo, setReporteActivo] = useState("ventas");
  const [sucursalSelect, setSucursalSelect] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);

  // Query para reporte de ventas
  const { data: dataVentas, isLoading: loadingVentas, refetch: refetchVentas } = useQuery({
    queryKey: ["reporte-ventas", sucursalSelect, fechaInicio, fechaFin],
    queryFn: () => reportVentasPorSucursal({
      sucursal_id: parseInt(sucursalSelect),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    }),
    enabled: !!sucursalSelect && reporteActivo === "ventas",
  });

  // Query para stock bajo
  const { data: dataStockBajo, isLoading: loadingStock } = useQuery({
    queryKey: ["reporte-stock-bajo", sucursalSelect],
    queryFn: () => reportStockBajoMinimo({
      sucursal_id: parseInt(sucursalSelect),
      almacen_id: null
    }),
    enabled: !!sucursalSelect && reporteActivo === "stock",
  });

  // Calcular totales de ventas
  const totales = dataVentas?.reduce((acc, venta) => ({
    cantidad: acc.cantidad + 1,
    monto: acc.monto + (parseFloat(venta.monto_total) || 0),
    productos: acc.productos + (parseInt(venta.cantidad_productos) || 0)
  }), { cantidad: 0, monto: 0, productos: 0 }) || { cantidad: 0, monto: 0, productos: 0 };

  // Exportar a Excel con formato mejorado
  const exportarExcel = () => {
    const datosRaw = reporteActivo === "ventas" ? dataVentas : dataStockBajo;
    if (!datosRaw?.length) return;

    // Formatear datos para Excel
    let datos;
    if (reporteActivo === "ventas") {
      datos = datosRaw.map(v => ({
        'ID Venta': v.id_venta,
        'Fecha': new Date(v.fecha).toLocaleString('es-PE', { 
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        'Cajero': v.cajero || '-',
        'Cliente ID': v.id_cliente,
        'Productos': v.cantidad_productos ?? 0,
        'Subtotal': parseFloat(v.subtotal) || 0,
        'Impuestos': parseFloat(v.total_impuestos) || 0,
        'Total': parseFloat(v.monto_total) || 0,
        'Pagó Con': v.pago_con || '-',
        'Saldo': parseFloat(v.saldo) || 0,
        'Estado': v.estado || 'completada'
      }));
    } else {
      datos = datosRaw.map(s => ({
        'Código': s.codigo_articulo || '-',
        'Producto': s.descripcion_articulo,
        'Sucursal': s.sucursal_nombre || '-',
        'Almacén': s.almacen_nombre || '-',
        'Stock Actual': parseFloat(s.stock) || 0,
        'Stock Mínimo': parseFloat(s.stock_minimo) || 0,
        'Faltante': parseFloat(s.faltante) || (parseFloat(s.stock_minimo) - parseFloat(s.stock)) || 0,
        'Precio Costo': parseFloat(s.precio_costo) || 0,
        'Valor Total': parseFloat(s.total) || 0
      }));
    }

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reporteActivo === "ventas" ? "Ventas" : "Stock Bajo");
    XLSX.writeFile(wb, `reporte_${reporteActivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const reportes = [
    { id: "ventas", nombre: "Ventas", icono: "lucide:trending-up", color: "#16a34a" },
    { id: "stock", nombre: "Stock Bajo", icono: "lucide:alert-triangle", color: "#dc2626" },
  ];

  // Mostrar loading mientras cargan las sucursales
  if (isLoadingSucursales) {
    return (
      <LoadingContainer>
        <BarLoader color="#6366f1" />
        <span>Cargando reportes...</span>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      {/* Header */}
      <PageHeader>
        <div>
          <PageTitle>Reportes</PageTitle>
          <PageSubtitle>Genera y analiza informes de tu negocio</PageSubtitle>
        </div>
      </PageHeader>

      {/* Tabs de reportes */}
      <TabsContainer>
        {reportes.map((rep) => (
          <TabButton
            key={rep.id}
            $active={reporteActivo === rep.id}
            $color={rep.color}
            onClick={() => setReporteActivo(rep.id)}
          >
            <Icon icon={rep.icono} />
            <span>{rep.nombre}</span>
          </TabButton>
        ))}
      </TabsContainer>

      {/* Filtros */}
      <FiltersCard>
        <FilterGroup>
          <FilterLabel>Sucursal</FilterLabel>
          <FilterSelect
            value={sucursalSelect}
            onChange={(e) => setSucursalSelect(e.target.value)}
          >
            <option value="">Seleccionar sucursal</option>
            {dataSucursales?.map((suc) => (
              <option key={suc.id} value={suc.id}>{suc.nombre}</option>
            ))}
          </FilterSelect>
        </FilterGroup>

        {reporteActivo === "ventas" && (
          <>
            <FilterGroup>
              <FilterLabel>Desde</FilterLabel>
              <FilterInput
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </FilterGroup>
            <FilterGroup>
              <FilterLabel>Hasta</FilterLabel>
              <FilterInput
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </FilterGroup>
          </>
        )}

        <FilterActions>
          <ActionButton onClick={() => refetchVentas?.()} disabled={!sucursalSelect}>
            <Icon icon="lucide:search" />
            Generar
          </ActionButton>
          <ActionButton 
            $secondary 
            onClick={exportarExcel}
            disabled={!(reporteActivo === "ventas" ? dataVentas?.length : dataStockBajo?.length)}
          >
            <Icon icon="lucide:download" />
            Exportar
          </ActionButton>
        </FilterActions>
      </FiltersCard>

      {/* Contenido según reporte activo */}
      {reporteActivo === "ventas" && (
        <>
          {/* KPIs de Ventas */}
          {dataVentas?.length > 0 && (
            <KPIGrid>
              <KPICard>
                <KPIIcon $color="#16a34a">
                  <Icon icon="lucide:receipt" />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>{totales.cantidad}</KPIValue>
                  <KPILabel>Ventas realizadas</KPILabel>
                </KPIContent>
              </KPICard>
              <KPICard>
                <KPIIcon $color="#2563eb">
                  <Icon icon="lucide:banknote" />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>
                    {FormatearNumeroDinero(totales.monto, dataempresa?.currency, dataempresa?.iso)}
                  </KPIValue>
                  <KPILabel>Total vendido</KPILabel>
                </KPIContent>
              </KPICard>
              <KPICard>
                <KPIIcon $color="#8b5cf6">
                  <Icon icon="lucide:package" />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>{totales.productos}</KPIValue>
                  <KPILabel>Productos vendidos</KPILabel>
                </KPIContent>
              </KPICard>
              <KPICard>
                <KPIIcon $color="#f59e0b">
                  <Icon icon="lucide:calculator" />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>
                    {FormatearNumeroDinero(totales.cantidad > 0 ? totales.monto / totales.cantidad : 0, dataempresa?.currency, dataempresa?.iso)}
                  </KPIValue>
                  <KPILabel>Ticket promedio</KPILabel>
                </KPIContent>
              </KPICard>
            </KPIGrid>
          )}

          {/* Tabla de Ventas */}
          <TableCard>
            <TableHeader>
              <TableTitle>
                <Icon icon="lucide:list" />
                Detalle de Ventas
              </TableTitle>
              <TableCount>{dataVentas?.length || 0} registros</TableCount>
            </TableHeader>

            {loadingVentas ? (
              <LoadingState>
                <Icon icon="lucide:loader-2" className="spin" />
                <span>Cargando reporte...</span>
              </LoadingState>
            ) : !sucursalSelect ? (
              <EmptyState>
                <Icon icon="lucide:building-2" />
                <span>Selecciona una sucursal para generar el reporte</span>
              </EmptyState>
            ) : !dataVentas?.length ? (
              <EmptyState>
                <Icon icon="lucide:inbox" />
                <span>No hay ventas en el período seleccionado</span>
              </EmptyState>
            ) : (
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Cajero</th>
                      <th>Productos</th>
                      <th>Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataVentas?.map((venta) => (
                      <tr key={venta.id_venta}>
                        <td>#{venta.id_venta}</td>
                        <td>{new Date(venta.fecha).toLocaleString('es-PE', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td>{venta.cajero || '-'}</td>
                        <td>{venta.cantidad_productos ?? 0}</td>
                        <td className="monto">
                          {FormatearNumeroDinero(venta.monto_total, dataempresa?.currency, dataempresa?.iso)}
                        </td>
                        <td>
                          <StatusBadge $status={venta.estado}>
                            {venta.estado || 'completada'}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </TableCard>
        </>
      )}

      {reporteActivo === "stock" && (
        <TableCard>
          <TableHeader>
            <TableTitle>
              <Icon icon="lucide:alert-triangle" />
              Productos con Stock Bajo
            </TableTitle>
            <TableCount $alert>{dataStockBajo?.length || 0} alertas</TableCount>
          </TableHeader>

          {loadingStock ? (
            <LoadingState>
              <Icon icon="lucide:loader-2" className="spin" />
              <span>Cargando reporte...</span>
            </LoadingState>
          ) : !sucursalSelect ? (
            <EmptyState>
              <Icon icon="lucide:building-2" />
              <span>Selecciona una sucursal para ver alertas de stock</span>
            </EmptyState>
          ) : !dataStockBajo?.length ? (
            <EmptyState $success>
              <Icon icon="lucide:check-circle" />
              <span>¡Excelente! No hay productos con stock bajo</span>
            </EmptyState>
          ) : (
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Sucursal</th>
                    <th>Almacén</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Faltante</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dataStockBajo?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.codigo_articulo || '-'}</td>
                      <td>{item.descripcion_articulo}</td>
                      <td>{item.sucursal_nombre || '-'}</td>
                      <td>{item.almacen_nombre || '-'}</td>
                      <td className="stock-bajo">{item.stock}</td>
                      <td>{item.stock_minimo}</td>
                      <td className="faltante">-{item.faltante ?? (item.stock_minimo - item.stock)}</td>
                      <td>
                        {FormatearNumeroDinero(item.total, dataempresa?.currency, dataempresa?.iso)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          )}
        </TableCard>
      )}
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  padding: 24px;
  background: #f5f5f5;

  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const PageHeader = styled.div`
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #111;
  margin: 0 0 4px;

  @media (min-width: 768px) {
    font-size: 28px;
  }
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ $active }) => $active ? '#fff' : 'transparent'};
  border: 1.5px solid ${({ $active, $color }) => $active ? $color : '#e5e5e5'};
  border-radius: 10px;
  color: ${({ $active, $color }) => $active ? $color : '#666'};
  font-size: 14px;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: #fff;
    border-color: ${({ $color }) => $color};
  }
`;

const FiltersCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 150px;
`;

const FilterLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #666;
`;

const FilterSelect = styled.select`
  padding: 10px 14px;
  border: 1.5px solid #e5e5e5;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
  background: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #111;
  }
`;

const FilterInput = styled.input`
  padding: 10px 14px;
  border: 1.5px solid #e5e5e5;
  border-radius: 10px;
  font-size: 14px;
  color: #333;

  &:focus {
    outline: none;
    border-color: #111;
  }
`;

const FilterActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: ${({ $secondary }) => $secondary ? '#fff' : '#111'};
  color: ${({ $secondary }) => $secondary ? '#333' : '#fff'};
  border: 1.5px solid ${({ $secondary }) => $secondary ? '#e5e5e5' : '#111'};
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 16px;
  }
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const KPICard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
`;

const KPIIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${({ $color }) => `${$color}15`};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 24px;
    color: ${({ $color }) => $color};
  }
`;

const KPIContent = styled.div`
  flex: 1;
`;

const KPIValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #111;

  @media (min-width: 768px) {
    font-size: 24px;
  }
`;

const KPILabel = styled.div`
  font-size: 13px;
  color: #666;
`;

const TableCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
`;

const TableTitle = styled.h3`
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

const TableCount = styled.span`
  font-size: 13px;
  padding: 4px 12px;
  background: ${({ $alert }) => $alert ? '#fef2f2' : '#f5f5f5'};
  color: ${({ $alert }) => $alert ? '#dc2626' : '#666'};
  border-radius: 20px;
  font-weight: 500;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 14px 20px;
    text-align: left;
    font-size: 14px;
  }

  th {
    background: #f9f9f9;
    font-weight: 600;
    color: #666;
    border-bottom: 1px solid #f0f0f0;
  }

  td {
    color: #333;
    border-bottom: 1px solid #f5f5f5;
  }

  tbody tr:hover {
    background: #f9f9f9;
  }

  .monto {
    font-weight: 600;
    color: #16a34a;
  }

  .stock-bajo {
    color: #dc2626;
    font-weight: 600;
  }

  .faltante {
    color: #dc2626;
    font-weight: 500;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  padding: 4px 10px;
  background: ${({ $status }) => 
    $status === 'anulada' ? '#fef2f2' : '#dcfce7'};
  color: ${({ $status }) => 
    $status === 'anulada' ? '#dc2626' : '#16a34a'};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: ${({ $success }) => $success ? '#16a34a' : '#999'};

  svg {
    font-size: 48px;
    opacity: 0.5;
  }

  span {
    font-size: 14px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  min-height: 400px;
  color: ${({ theme }) => theme.text || '#666'};

  span {
    font-size: 14px;
  }
`;