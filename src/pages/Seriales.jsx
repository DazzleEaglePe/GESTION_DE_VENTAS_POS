import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useSerialesStore } from "../store/SerialesStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useAlmacenesStore } from "../store/AlmacenesStore";
import { Spinner1 } from "../index";

export function Seriales() {
  const { dataempresa } = useEmpresaStore();
  const { dataalmacenes } = useAlmacenesStore();
  const {
    dataSeriales,
    productosConSeriales,
    estadisticas,
    serialBuscado,
    estadosSerial,
    obtenerProductosConSeriales,
    obtenerTodosSerialesProducto,
    registrarSerialIngreso,
    registrarSerialesLote,
    buscarSerial,
    actualizarEstadoSerial,
    obtenerEstadisticasSeriales,
    parsearSerialesTexto,
    obtenerColorEstado,
  } = useSerialesStore();

  const [tab, setTab] = useState("productos"); // productos | buscar | estadisticas
  const [modalRegistro, setModalRegistro] = useState(false);
  const [modalVerSeriales, setModalVerSeriales] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [buscador, setBuscador] = useState("");
  const [serialBusqueda, setSerialBusqueda] = useState("");
  const [nuevoSerial, setNuevoSerial] = useState({
    numero_serie: "",
    id_almacen: "",
    notas: "",
  });
  const [serialesLote, setSerialesLote] = useState("");
  const [modoLote, setModoLote] = useState(false);

  // Cargar productos con seriales
  const { isLoading } = useQuery({
    queryKey: ["productos-seriales", dataempresa?.id],
    queryFn: () => obtenerProductosConSeriales({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  // Cargar estadísticas
  useQuery({
    queryKey: ["estadisticas-seriales", dataempresa?.id],
    queryFn: () => obtenerEstadisticasSeriales({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id && tab === "estadisticas",
    refetchOnWindowFocus: false,
  });

  // Filtrar productos
  const productosFiltrados = buscador
    ? productosConSeriales.filter((p) =>
        p.descripcion.toLowerCase().includes(buscador.toLowerCase())
      )
    : productosConSeriales;

  const handleVerSeriales = async (producto) => {
    setProductoActual(producto);
    await obtenerTodosSerialesProducto({ id_producto: producto.id });
    setModalVerSeriales(true);
  };

  const handleAbrirRegistro = (producto) => {
    setProductoActual(producto);
    setNuevoSerial({ numero_serie: "", id_almacen: "", notas: "" });
    setSerialesLote("");
    setModoLote(false);
    setModalRegistro(true);
  };

  const handleRegistrarSerial = async () => {
    if (modoLote) {
      const seriales = parsearSerialesTexto(serialesLote);
      if (seriales.length === 0) return;

      const resultado = await registrarSerialesLote({
        id_producto: productoActual.id,
        id_almacen: parseInt(nuevoSerial.id_almacen),
        seriales: seriales.map((s) => ({
          numero_serie: s,
          notas: nuevoSerial.notas,
        })),
      });

      if (resultado.exito) {
        setModalRegistro(false);
        obtenerProductosConSeriales({ id_empresa: dataempresa?.id });
      }
    } else {
      if (!nuevoSerial.numero_serie || !nuevoSerial.id_almacen) return;

      const resultado = await registrarSerialIngreso({
        id_producto: productoActual.id,
        id_almacen: parseInt(nuevoSerial.id_almacen),
        numero_serie: nuevoSerial.numero_serie,
        notas: nuevoSerial.notas,
      });

      if (resultado.exito) {
        setModalRegistro(false);
        obtenerProductosConSeriales({ id_empresa: dataempresa?.id });
      }
    }
  };

  const handleBuscarSerial = async () => {
    if (!serialBusqueda.trim()) return;
    await buscarSerial({
      numero_serie: serialBusqueda,
      id_empresa: dataempresa?.id,
    });
  };

  const handleCambiarEstado = async (serial, nuevoEstado) => {
    await actualizarEstadoSerial({
      id_serial: serial.id,
      estado: nuevoEstado,
    });
    if (productoActual) {
      await obtenerTodosSerialesProducto({ id_producto: productoActual.id });
    }
  };

  if (isLoading) return <Spinner1 />;

  return (
    <Container>
      {/* Modal Registrar Serial */}
      {modalRegistro && productoActual && (
        <ModalOverlay onClick={() => setModalRegistro(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h2>Registrar Serial</h2>
                <ProductoName>{productoActual.descripcion}</ProductoName>
              </div>
              <CloseButton onClick={() => setModalRegistro(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {/* Toggle modo */}
              <ModoToggle>
                <ModoOption
                  $active={!modoLote}
                  onClick={() => setModoLote(false)}
                >
                  <Icon icon="lucide:hash" />
                  Individual
                </ModoOption>
                <ModoOption $active={modoLote} onClick={() => setModoLote(true)}>
                  <Icon icon="lucide:list" />
                  Lote
                </ModoOption>
              </ModoToggle>

              <FormGroup>
                <Label>Almacén de Ingreso</Label>
                <Select
                  value={nuevoSerial.id_almacen}
                  onChange={(e) =>
                    setNuevoSerial({ ...nuevoSerial, id_almacen: e.target.value })
                  }
                >
                  <option value="">Seleccionar almacén...</option>
                  {dataalmacenes?.map((alm) => (
                    <option key={alm.id} value={alm.id}>
                      {alm.nombre}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              {modoLote ? (
                <FormGroup>
                  <Label>Números de Serie (uno por línea)</Label>
                  <TextArea
                    rows={6}
                    placeholder="SN001&#10;SN002&#10;SN003&#10;..."
                    value={serialesLote}
                    onChange={(e) => setSerialesLote(e.target.value)}
                  />
                  <HelpText>
                    {parsearSerialesTexto(serialesLote).length} seriales
                    detectados
                  </HelpText>
                </FormGroup>
              ) : (
                <FormGroup>
                  <Label>Número de Serie</Label>
                  <Input
                    type="text"
                    placeholder="Ej: SN-2024-001234"
                    value={nuevoSerial.numero_serie}
                    onChange={(e) =>
                      setNuevoSerial({
                        ...nuevoSerial,
                        numero_serie: e.target.value,
                      })
                    }
                  />
                </FormGroup>
              )}

              <FormGroup>
                <Label>Notas (opcional)</Label>
                <Input
                  type="text"
                  placeholder="Observaciones del ingreso"
                  value={nuevoSerial.notas}
                  onChange={(e) =>
                    setNuevoSerial({ ...nuevoSerial, notas: e.target.value })
                  }
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <Button
                $variant="secondary"
                onClick={() => setModalRegistro(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleRegistrarSerial}>
                <Icon icon="lucide:save" />
                {modoLote ? "Registrar Lote" : "Registrar Serial"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal Ver Seriales */}
      {modalVerSeriales && productoActual && (
        <ModalOverlay onClick={() => setModalVerSeriales(false)}>
          <ModalContentLarge onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h2>Seriales del Producto</h2>
                <ProductoName>{productoActual.descripcion}</ProductoName>
              </div>
              <CloseButton onClick={() => setModalVerSeriales(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {/* Filtros por estado */}
              <EstadosFiltros>
                {estadosSerial.map((estado) => (
                  <EstadoChip key={estado.valor} $color={estado.color}>
                    {estado.etiqueta}:{" "}
                    {dataSeriales.filter((s) => s.estado === estado.valor).length}
                  </EstadoChip>
                ))}
              </EstadosFiltros>

              {/* Lista de seriales */}
              <SerialesTable>
                <thead>
                  <tr>
                    <th>Nº Serie</th>
                    <th>Estado</th>
                    <th>Almacén</th>
                    <th>Fecha Ingreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSeriales.map((serial) => (
                    <tr key={serial.id}>
                      <td>
                        <SerialCode>{serial.numero_serie}</SerialCode>
                      </td>
                      <td>
                        <EstadoBadge $color={obtenerColorEstado(serial.estado)}>
                          {serial.estado}
                        </EstadoBadge>
                      </td>
                      <td>{serial.almacenes?.nombre || "-"}</td>
                      <td>
                        {new Date(serial.fecha_ingreso).toLocaleDateString()}
                      </td>
                      <td>
                        {serial.estado === "disponible" && (
                          <SmallSelect
                            onChange={(e) =>
                              handleCambiarEstado(serial, e.target.value)
                            }
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Cambiar...
                            </option>
                            <option value="defectuoso">Marcar Defectuoso</option>
                            <option value="en_garantia">En Garantía</option>
                          </SmallSelect>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SerialesTable>

              {dataSeriales.length === 0 && (
                <EmptySeriales>
                  <Icon icon="lucide:barcode" />
                  No hay seriales registrados para este producto
                </EmptySeriales>
              )}
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => handleAbrirRegistro(productoActual)}>
                <Icon icon="lucide:plus" />
                Agregar Serial
              </Button>
            </ModalFooter>
          </ModalContentLarge>
        </ModalOverlay>
      )}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:barcode" />
          </IconWrapper>
          <div>
            <Title>Control de Seriales</Title>
            <Subtitle>Seguimiento de números de serie por producto</Subtitle>
          </div>
        </HeaderLeft>
      </Header>

      {/* Tabs */}
      <TabsContainer>
        <Tab $active={tab === "productos"} onClick={() => setTab("productos")}>
          <Icon icon="lucide:package" />
          Productos ({productosConSeriales.length})
        </Tab>
        <Tab $active={tab === "buscar"} onClick={() => setTab("buscar")}>
          <Icon icon="lucide:search" />
          Buscar Serial
        </Tab>
        <Tab
          $active={tab === "estadisticas"}
          onClick={() => setTab("estadisticas")}
        >
          <Icon icon="lucide:bar-chart-2" />
          Estadísticas
        </Tab>
      </TabsContainer>

      {/* Content */}
      <Content>
        {tab === "productos" && (
          <>
            <SearchBar>
              <SearchWrapper>
                <SearchIcon>
                  <Icon icon="lucide:search" />
                </SearchIcon>
                <SearchInput
                  type="text"
                  placeholder="Buscar producto..."
                  value={buscador}
                  onChange={(e) => setBuscador(e.target.value)}
                />
              </SearchWrapper>
            </SearchBar>

            {productosFiltrados.length > 0 ? (
              <ProductosGrid>
                {productosFiltrados.map((producto) => (
                  <ProductoCard key={producto.id}>
                    <ProductoIcon>
                      <Icon icon="lucide:cpu" />
                    </ProductoIcon>
                    <ProductoInfo>
                      <h3>{producto.descripcion}</h3>
                      <ProductoStats>
                        <StatItem>
                          <Icon icon="lucide:check-circle" />
                          {producto.seriales_disponibles || 0} disponibles
                        </StatItem>
                        <StatItem>
                          <Icon icon="lucide:archive" />
                          {producto.total_seriales || 0} total
                        </StatItem>
                      </ProductoStats>
                    </ProductoInfo>
                    <ProductoActions>
                      <ActionButton
                        onClick={() => handleVerSeriales(producto)}
                        title="Ver seriales"
                      >
                        <Icon icon="lucide:list" />
                      </ActionButton>
                      <ActionButton
                        $primary
                        onClick={() => handleAbrirRegistro(producto)}
                        title="Agregar serial"
                      >
                        <Icon icon="lucide:plus" />
                      </ActionButton>
                    </ProductoActions>
                  </ProductoCard>
                ))}
              </ProductosGrid>
            ) : (
              <EmptyState>
                <Icon icon="lucide:barcode" />
                <h3>No hay productos con control de seriales</h3>
                <p>
                  Activa "Maneja seriales" en los productos que requieran
                  seguimiento de números de serie.
                </p>
              </EmptyState>
            )}
          </>
        )}

        {tab === "buscar" && (
          <BuscarContainer>
            <BuscarHeader>
              <h3>Buscar Número de Serie</h3>
              <p>Encuentra información de un serial específico</p>
            </BuscarHeader>

            <BuscarForm>
              <Input
                type="text"
                placeholder="Ingresa el número de serie..."
                value={serialBusqueda}
                onChange={(e) => setSerialBusqueda(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleBuscarSerial()}
              />
              <Button onClick={handleBuscarSerial}>
                <Icon icon="lucide:search" />
                Buscar
              </Button>
            </BuscarForm>

            {serialBuscado && (
              <ResultadoBusqueda>
                {serialBuscado.encontrado ? (
                  <ResultadoCard>
                    <ResultadoHeader>
                      <Icon icon="lucide:check-circle" />
                      <h4>Serial Encontrado</h4>
                    </ResultadoHeader>
                    <ResultadoBody>
                      <ResultadoRow>
                        <span>Número de Serie:</span>
                        <strong>{serialBuscado.serial?.numero_serie}</strong>
                      </ResultadoRow>
                      <ResultadoRow>
                        <span>Producto:</span>
                        <strong>
                          {serialBuscado.serial?.productos?.descripcion}
                        </strong>
                      </ResultadoRow>
                      <ResultadoRow>
                        <span>Estado:</span>
                        <EstadoBadge
                          $color={obtenerColorEstado(
                            serialBuscado.serial?.estado
                          )}
                        >
                          {serialBuscado.serial?.estado}
                        </EstadoBadge>
                      </ResultadoRow>
                      <ResultadoRow>
                        <span>Almacén:</span>
                        <strong>
                          {serialBuscado.serial?.almacenes?.nombre || "N/A"}
                        </strong>
                      </ResultadoRow>
                      <ResultadoRow>
                        <span>Fecha Ingreso:</span>
                        <strong>
                          {new Date(
                            serialBuscado.serial?.fecha_ingreso
                          ).toLocaleDateString()}
                        </strong>
                      </ResultadoRow>
                      {serialBuscado.serial?.fecha_venta && (
                        <ResultadoRow>
                          <span>Fecha Venta:</span>
                          <strong>
                            {new Date(
                              serialBuscado.serial?.fecha_venta
                            ).toLocaleDateString()}
                          </strong>
                        </ResultadoRow>
                      )}
                    </ResultadoBody>
                  </ResultadoCard>
                ) : (
                  <NoResultado>
                    <Icon icon="lucide:search-x" />
                    <p>No se encontró el serial "{serialBusqueda}"</p>
                  </NoResultado>
                )}
              </ResultadoBusqueda>
            )}
          </BuscarContainer>
        )}

        {tab === "estadisticas" && (
          <EstadisticasContainer>
            {estadisticas ? (
              <EstadisticasGrid>
                <EstadisticaCard>
                  <EstadisticaIcon $color="#10b981">
                    <Icon icon="lucide:package-check" />
                  </EstadisticaIcon>
                  <div>
                    <h4>{estadisticas.total_disponibles || 0}</h4>
                    <p>Disponibles</p>
                  </div>
                </EstadisticaCard>
                <EstadisticaCard>
                  <EstadisticaIcon $color="#3b82f6">
                    <Icon icon="lucide:shopping-cart" />
                  </EstadisticaIcon>
                  <div>
                    <h4>{estadisticas.total_vendidos || 0}</h4>
                    <p>Vendidos</p>
                  </div>
                </EstadisticaCard>
                <EstadisticaCard>
                  <EstadisticaIcon $color="#f59e0b">
                    <Icon icon="lucide:shield-check" />
                  </EstadisticaIcon>
                  <div>
                    <h4>{estadisticas.en_garantia || 0}</h4>
                    <p>En Garantía</p>
                  </div>
                </EstadisticaCard>
                <EstadisticaCard>
                  <EstadisticaIcon $color="#ef4444">
                    <Icon icon="lucide:alert-triangle" />
                  </EstadisticaIcon>
                  <div>
                    <h4>{estadisticas.defectuosos || 0}</h4>
                    <p>Defectuosos</p>
                  </div>
                </EstadisticaCard>
              </EstadisticasGrid>
            ) : (
              <EmptyState>
                <Icon icon="lucide:loader" className="spin" />
                <p>Cargando estadísticas...</p>
              </EmptyState>
            )}
          </EstadisticasContainer>
        )}
      </Content>
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  min-height: calc(100vh - 50px);
  margin-top: 50px;
  padding: 30px;
  background: #f5f5f5;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  svg {
    font-size: 24px;
    color: #fff;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 4px 0 0 0;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #fff;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  flex-wrap: wrap;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) => (props.$active ? "#6366f1" : "transparent")};
  color: ${(props) => (props.$active ? "#fff" : "#64748b")};

  &:hover {
    background: ${(props) => (props.$active ? "#6366f1" : "#f1f5f9")};
  }
`;

const Content = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const SearchBar = styled.div`
  margin-bottom: 24px;
`;

const SearchWrapper = styled.div`
  position: relative;
  max-width: 400px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ProductosGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProductoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #6366f1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const ProductoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #eef2ff;
  border-radius: 10px;
  flex-shrink: 0;

  svg {
    font-size: 24px;
    color: #6366f1;
  }
`;

const ProductoInfo = styled.div`
  flex: 1;

  h3 {
    margin: 0 0 8px;
    color: #1a1a2e;
    font-size: 1rem;
  }
`;

const ProductoStats = styled.div`
  display: flex;
  gap: 16px;
`;

const StatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  font-size: 0.85rem;

  svg {
    font-size: 14px;
    color: #10b981;
  }
`;

const ProductoActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${(props) => (props.$primary ? "#6366f1" : "#f1f5f9")};
  color: ${(props) => (props.$primary ? "#fff" : "#64748b")};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$primary ? "#4f46e5" : "#e2e8f0")};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;

  svg {
    font-size: 64px;
    opacity: 0.3;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    color: #334155;
  }

  p {
    margin: 0;
    max-width: 400px;
    margin: 0 auto;
  }

  .spin {
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
`;

// Buscar Tab
const BuscarContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const BuscarHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;

  h3 {
    margin: 0 0 8px;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    color: #64748b;
  }
`;

const BuscarForm = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
`;

const ResultadoBusqueda = styled.div``;

const ResultadoCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const ResultadoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #ecfdf5;

  svg {
    font-size: 24px;
    color: #10b981;
  }

  h4 {
    margin: 0;
    color: #065f46;
  }
`;

const ResultadoBody = styled.div`
  padding: 20px;
`;

const ResultadoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }

  span {
    color: #64748b;
  }

  strong {
    color: #1a1a2e;
  }
`;

const NoResultado = styled.div`
  text-align: center;
  padding: 40px;
  background: #fef2f2;
  border-radius: 12px;

  svg {
    font-size: 48px;
    color: #ef4444;
    margin-bottom: 12px;
  }

  p {
    margin: 0;
    color: #b91c1c;
  }
`;

// Estadísticas Tab
const EstadisticasContainer = styled.div``;

const EstadisticasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const EstadisticaCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;

  h4 {
    margin: 0;
    font-size: 2rem;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
  }
`;

const EstadisticaIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: ${(props) => props.$color}20;
  border-radius: 12px;

  svg {
    font-size: 28px;
    color: ${(props) => props.$color};
  }
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: auto;
`;

const ModalContentLarge = styled(ModalContent)`
  max-width: 720px;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #1a1a2e;
  }
`;

const ProductoName = styled.p`
  margin: 8px 0 0;
  font-weight: 500;
  color: #334155;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #64748b;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    color: #1a1a2e;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
`;

const ModoToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 8px;
`;

const ModoOption = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) => (props.$active ? "#fff" : "transparent")};
  color: ${(props) => (props.$active ? "#6366f1" : "#64748b")};
  box-shadow: ${(props) =>
    props.$active ? "0 2px 8px rgba(0,0,0,0.08)" : "none"};
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #334155;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const HelpText = styled.p`
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: #64748b;
`;

const EstadosFiltros = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const EstadoChip = styled.span`
  padding: 6px 12px;
  background: ${(props) => props.$color}15;
  color: ${(props) => props.$color};
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const SerialesTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  th {
    background: #f8fafc;
    font-weight: 500;
    color: #64748b;
    font-size: 0.8rem;
    text-transform: uppercase;
  }
`;

const SerialCode = styled.code`
  padding: 4px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
`;

const EstadoBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background: ${(props) => props.$color}20;
  color: ${(props) => props.$color};
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
`;

const SmallSelect = styled.select`
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.8rem;
  background: #fff;
  cursor: pointer;
`;

const EmptySeriales = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #64748b;

  svg {
    font-size: 24px;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) => (props.$variant === "secondary" ? "#f1f5f9" : "#6366f1")};
  color: ${(props) => (props.$variant === "secondary" ? "#334155" : "#fff")};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;
