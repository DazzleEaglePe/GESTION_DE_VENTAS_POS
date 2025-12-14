import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useProductosCompuestosStore } from "../store/ProductosCompuestosStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useProductosStore } from "../store/ProductosStore";
import { Spinner1 } from "../index";

export function ProductosCompuestos() {
  const { dataempresa } = useEmpresaStore();
  const { dataproductos } = useProductosStore();
  const {
    productosCompuestos,
    obtenerProductosCompuestos,
    obtenerComponentesProducto,
    crearProductoCompuesto,
    agregarComponente,
    calcularTotales,
    setProductoSeleccionado,
    TIPOS_COMPUESTO,
  } = useProductosCompuestosStore();

  const [modalConfig, setModalConfig] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [componentes, setComponentes] = useState([]);
  const [buscador, setBuscador] = useState("");
  const [buscadorComponente, setBuscadorComponente] = useState("");
  const [nuevoCompuesto, setNuevoCompuesto] = useState({
    descripcion: "",
    tipo: "kit",
    precio_venta: 0,
    codigobarras: "",
  });

  // Cargar productos compuestos
  const { isLoading } = useQuery({
    queryKey: ["productos-compuestos", dataempresa?.id],
    queryFn: () => obtenerProductosCompuestos({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  // Productos simples (no compuestos)
  const productosSimples = dataproductos?.filter((p) => !p.es_compuesto) || [];

  // Filtrar productos
  const productosFiltrados = buscador
    ? productosCompuestos.filter((p) =>
        p.descripcion.toLowerCase().includes(buscador.toLowerCase())
      )
    : productosCompuestos;

  // Filtrar productos para agregar como componente
  const componentesFiltrados = buscadorComponente
    ? productosSimples.filter((p) =>
        p.descripcion.toLowerCase().includes(buscadorComponente.toLowerCase())
      )
    : productosSimples.slice(0, 10);

  const handleVerComponentes = async (producto) => {
    setProductoActual(producto);
    setProductoSeleccionado(producto);
    const data = await obtenerComponentesProducto({ id_producto: producto.id });
    setComponentes(data || []);
    setModalConfig(true);
  };

  const handleAgregarComponente = (producto) => {
    // Verificar si ya existe
    if (componentes.some((c) => c.id_producto_componente === producto.id)) {
      return;
    }

    setComponentes([
      ...componentes,
      {
        id: `temp-${Date.now()}`,
        id_producto_componente: producto.id,
        producto_componente: producto,
        cantidad: 1,
        isNew: true,
      },
    ]);
    setBuscadorComponente("");
  };

  const handleCambiarCantidad = (idx, cantidad) => {
    const nuevos = [...componentes];
    nuevos[idx].cantidad = parseInt(cantidad) || 1;
    setComponentes(nuevos);
  };

  const handleEliminarComponente = (idx) => {
    setComponentes(componentes.filter((_, i) => i !== idx));
  };

  const handleGuardarComponentes = async () => {
    for (const comp of componentes) {
      if (comp.isNew) {
        await agregarComponente({
          id_producto_compuesto: productoActual.id,
          id_producto_componente: comp.id_producto_componente,
          cantidad: comp.cantidad,
        });
      }
    }
    setModalConfig(false);
    setComponentes([]);
    obtenerProductosCompuestos({ id_empresa: dataempresa?.id });
  };

  const handleCrearCompuesto = async () => {
    if (!nuevoCompuesto.descripcion) return;

    const resultado = await crearProductoCompuesto({
      id_empresa: dataempresa?.id,
      ...nuevoCompuesto,
      componentes: componentes.map((c) => ({
        id_producto_componente: c.id_producto_componente,
        cantidad: c.cantidad,
      })),
    });

    if (resultado.exito) {
      setModalNuevo(false);
      setNuevoCompuesto({
        descripcion: "",
        tipo: "kit",
        precio_venta: 0,
        codigobarras: "",
      });
      setComponentes([]);
      obtenerProductosCompuestos({ id_empresa: dataempresa?.id });
    }
  };

  const totales = calcularTotales(componentes);

  if (isLoading) return <Spinner1 />;

  return (
    <Container>
      {/* Modal Configurar Componentes */}
      {modalConfig && productoActual && (
        <ModalOverlay onClick={() => setModalConfig(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h2>Componentes del Producto</h2>
                <ProductoName>{productoActual.descripcion}</ProductoName>
              </div>
              <CloseButton onClick={() => setModalConfig(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {/* Buscar y agregar componente */}
              <Section>
                <SectionTitle>Agregar Componente</SectionTitle>
                <SearchWrapper>
                  <SearchIcon>
                    <Icon icon="lucide:search" />
                  </SearchIcon>
                  <SearchInput
                    type="text"
                    placeholder="Buscar producto..."
                    value={buscadorComponente}
                    onChange={(e) => setBuscadorComponente(e.target.value)}
                  />
                </SearchWrapper>
                {buscadorComponente && (
                  <ProductosSugeridos>
                    {componentesFiltrados.map((p) => (
                      <ProductoSugerido
                        key={p.id}
                        onClick={() => handleAgregarComponente(p)}
                      >
                        <span>{p.descripcion}</span>
                        <span>S/ {p.precio_venta?.toFixed(2)}</span>
                      </ProductoSugerido>
                    ))}
                  </ProductosSugeridos>
                )}
              </Section>

              {/* Lista de componentes */}
              <Section>
                <SectionTitle>
                  Componentes ({componentes.length})
                </SectionTitle>
                {componentes.length > 0 ? (
                  <ComponentesList>
                    {componentes.map((comp, idx) => (
                      <ComponenteItem key={comp.id}>
                        <ComponenteInfo>
                          <h4>
                            {comp.producto_componente?.descripcion ||
                              comp.productos?.descripcion}
                          </h4>
                          <p>
                            S/{" "}
                            {(
                              comp.producto_componente?.precio_venta ||
                              comp.productos?.precio_venta ||
                              0
                            ).toFixed(2)}{" "}
                            c/u
                          </p>
                        </ComponenteInfo>
                        <CantidadInput
                          type="number"
                          min="1"
                          value={comp.cantidad}
                          onChange={(e) =>
                            handleCambiarCantidad(idx, e.target.value)
                          }
                        />
                        <DeleteButton onClick={() => handleEliminarComponente(idx)}>
                          <Icon icon="lucide:trash-2" />
                        </DeleteButton>
                      </ComponenteItem>
                    ))}
                  </ComponentesList>
                ) : (
                  <EmptyComponentes>
                    <Icon icon="lucide:package" />
                    No hay componentes agregados
                  </EmptyComponentes>
                )}
              </Section>

              {/* Totales */}
              {componentes.length > 0 && (
                <TotalesCard>
                  <TotalRow>
                    <span>Costo Total Componentes:</span>
                    <strong>S/ {totales.costoTotal.toFixed(2)}</strong>
                  </TotalRow>
                  <TotalRow>
                    <span>Total Unidades:</span>
                    <strong>{totales.cantidadTotal}</strong>
                  </TotalRow>
                </TotalesCard>
              )}
            </ModalBody>
            <ModalFooter>
              <Button $variant="secondary" onClick={() => setModalConfig(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGuardarComponentes}>
                <Icon icon="lucide:save" />
                Guardar Cambios
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal Nuevo Producto Compuesto */}
      {modalNuevo && (
        <ModalOverlay onClick={() => setModalNuevo(false)}>
          <ModalContentLarge onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h2>Nuevo Producto Compuesto</h2>
                <p>Crea un kit, combo o paquete</p>
              </div>
              <CloseButton onClick={() => setModalNuevo(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {/* Datos básicos */}
              <Section>
                <SectionTitle>Información del Producto</SectionTitle>
                <FormGrid>
                  <FormGroup>
                    <Label>Nombre del Producto</Label>
                    <Input
                      type="text"
                      placeholder="Ej: Kit Escolar Básico"
                      value={nuevoCompuesto.descripcion}
                      onChange={(e) =>
                        setNuevoCompuesto({
                          ...nuevoCompuesto,
                          descripcion: e.target.value,
                        })
                      }
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Tipo</Label>
                    <Select
                      value={nuevoCompuesto.tipo}
                      onChange={(e) =>
                        setNuevoCompuesto({
                          ...nuevoCompuesto,
                          tipo: e.target.value,
                        })
                      }
                    >
                      {TIPOS_COMPUESTO.map((tipo) => (
                        <option key={tipo.valor} value={tipo.valor}>
                          {tipo.etiqueta}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Código de Barras</Label>
                    <Input
                      type="text"
                      placeholder="Opcional"
                      value={nuevoCompuesto.codigobarras}
                      onChange={(e) =>
                        setNuevoCompuesto({
                          ...nuevoCompuesto,
                          codigobarras: e.target.value,
                        })
                      }
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Precio de Venta</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={nuevoCompuesto.precio_venta || ""}
                      onChange={(e) =>
                        setNuevoCompuesto({
                          ...nuevoCompuesto,
                          precio_venta: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </FormGroup>
                </FormGrid>
              </Section>

              {/* Agregar componentes */}
              <Section>
                <SectionTitle>Componentes</SectionTitle>
                <SearchWrapper>
                  <SearchIcon>
                    <Icon icon="lucide:search" />
                  </SearchIcon>
                  <SearchInput
                    type="text"
                    placeholder="Buscar producto para agregar..."
                    value={buscadorComponente}
                    onChange={(e) => setBuscadorComponente(e.target.value)}
                  />
                </SearchWrapper>
                {buscadorComponente && (
                  <ProductosSugeridos>
                    {componentesFiltrados.map((p) => (
                      <ProductoSugerido
                        key={p.id}
                        onClick={() => handleAgregarComponente(p)}
                      >
                        <span>{p.descripcion}</span>
                        <span>S/ {p.precio_venta?.toFixed(2)}</span>
                      </ProductoSugerido>
                    ))}
                  </ProductosSugeridos>
                )}

                {componentes.length > 0 && (
                  <ComponentesList style={{ marginTop: 16 }}>
                    {componentes.map((comp, idx) => (
                      <ComponenteItem key={comp.id}>
                        <ComponenteInfo>
                          <h4>{comp.producto_componente?.descripcion}</h4>
                          <p>
                            S/ {comp.producto_componente?.precio_venta?.toFixed(2)} c/u
                          </p>
                        </ComponenteInfo>
                        <CantidadInput
                          type="number"
                          min="1"
                          value={comp.cantidad}
                          onChange={(e) =>
                            handleCambiarCantidad(idx, e.target.value)
                          }
                        />
                        <DeleteButton onClick={() => handleEliminarComponente(idx)}>
                          <Icon icon="lucide:trash-2" />
                        </DeleteButton>
                      </ComponenteItem>
                    ))}
                  </ComponentesList>
                )}

                {/* Totales */}
                {componentes.length > 0 && (
                  <TotalesCard style={{ marginTop: 16 }}>
                    <TotalRow>
                      <span>Costo Total:</span>
                      <strong>S/ {totales.costoTotal.toFixed(2)}</strong>
                    </TotalRow>
                    <TotalRow $highlight>
                      <span>Margen:</span>
                      <strong>
                        S/{" "}
                        {(nuevoCompuesto.precio_venta - totales.costoTotal).toFixed(2)}{" "}
                        (
                        {totales.costoTotal > 0
                          ? (
                              ((nuevoCompuesto.precio_venta - totales.costoTotal) /
                                totales.costoTotal) *
                              100
                            ).toFixed(1)
                          : 0}
                        %)
                      </strong>
                    </TotalRow>
                  </TotalesCard>
                )}
              </Section>
            </ModalBody>
            <ModalFooter>
              <Button $variant="secondary" onClick={() => setModalNuevo(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCrearCompuesto}
                disabled={!nuevoCompuesto.descripcion || componentes.length === 0}
              >
                <Icon icon="lucide:plus" />
                Crear Producto Compuesto
              </Button>
            </ModalFooter>
          </ModalContentLarge>
        </ModalOverlay>
      )}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:boxes" />
          </IconWrapper>
          <div>
            <Title>Productos Compuestos</Title>
            <Subtitle>Kits, combos y paquetes de productos</Subtitle>
          </div>
        </HeaderLeft>
        <HeaderActions>
          <SearchWrapper>
            <SearchIcon>
              <Icon icon="lucide:search" />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Buscar..."
              value={buscador}
              onChange={(e) => setBuscador(e.target.value)}
            />
          </SearchWrapper>
          <Button onClick={() => setModalNuevo(true)}>
            <Icon icon="lucide:plus" />
            Nuevo Compuesto
          </Button>
        </HeaderActions>
      </Header>

      {/* Tipos */}
      <TiposCards>
        {TIPOS_COMPUESTO.map((tipo) => {
          const cantidad = productosCompuestos.filter(
            (p) => p.tipo_compuesto === tipo.valor
          ).length;
          return (
            <TipoCard key={tipo.valor}>
              <TipoIcon $color={tipo.color}>
                <Icon icon={tipo.icono} />
              </TipoIcon>
              <div>
                <h4>{cantidad}</h4>
                <p>{tipo.etiqueta}</p>
              </div>
            </TipoCard>
          );
        })}
      </TiposCards>

      {/* Content */}
      <Content>
        {productosFiltrados.length > 0 ? (
          <ProductosGrid>
            {productosFiltrados.map((producto) => {
              const tipo = TIPOS_COMPUESTO.find(
                (t) => t.valor === producto.tipo_compuesto
              );
              return (
                <ProductoCard key={producto.id}>
                  <ProductoIcon $color={tipo?.color || "#6b7280"}>
                    <Icon icon={tipo?.icono || "lucide:package"} />
                  </ProductoIcon>
                  <ProductoInfo>
                    <TipoBadge $color={tipo?.color || "#6b7280"}>
                      {tipo?.etiqueta || "Compuesto"}
                    </TipoBadge>
                    <h3>{producto.descripcion}</h3>
                    <ProductoDetalles>
                      <span>
                        <Icon icon="lucide:tag" />
                        S/ {producto.precio_venta?.toFixed(2)}
                      </span>
                      <span>
                        <Icon icon="lucide:layers" />
                        {producto.total_componentes || 0} componentes
                      </span>
                    </ProductoDetalles>
                  </ProductoInfo>
                  <ProductoActions>
                    <ActionButton onClick={() => handleVerComponentes(producto)}>
                      <Icon icon="lucide:settings-2" />
                    </ActionButton>
                  </ProductoActions>
                </ProductoCard>
              );
            })}
          </ProductosGrid>
        ) : (
          <EmptyState>
            <Icon icon="lucide:boxes" />
            <h3>No hay productos compuestos</h3>
            <p>
              Crea kits, combos o paquetes agrupando varios productos en uno solo.
            </p>
            <Button onClick={() => setModalNuevo(true)} style={{ marginTop: 20 }}>
              <Icon icon="lucide:plus" />
              Crear Producto Compuesto
            </Button>
          </EmptyState>
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
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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

const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 280px;
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
  padding: 10px 16px 10px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
`;

const TiposCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const TipoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  h4 {
    margin: 0;
    font-size: 1.5rem;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
  }
`;

const TipoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: ${(props) => props.$color}15;
  border-radius: 10px;

  svg {
    font-size: 22px;
    color: ${(props) => props.$color};
  }
`;

const Content = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const ProductosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const ProductoCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #f59e0b;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const ProductoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${(props) => props.$color}15;
  border-radius: 10px;
  flex-shrink: 0;

  svg {
    font-size: 24px;
    color: ${(props) => props.$color};
  }
`;

const ProductoInfo = styled.div`
  flex: 1;

  h3 {
    margin: 4px 0 8px;
    color: #1a1a2e;
    font-size: 1rem;
  }
`;

const TipoBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: ${(props) => props.$color}15;
  color: ${(props) => props.$color};
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const ProductoDetalles = styled.div`
  display: flex;
  gap: 16px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #64748b;
    font-size: 0.85rem;

    svg {
      font-size: 14px;
    }
  }
`;

const ProductoActions = styled.div`
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #fef3c7;
  color: #d97706;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f59e0b;
    color: #fff;
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
  max-width: 560px;
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

  p {
    margin: 4px 0 0;
    font-size: 0.875rem;
    color: #64748b;
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

const Section = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #334155;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const FormGroup = styled.div``;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const ProductosSugeridos = styled.div`
  margin-top: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
`;

const ProductoSugerido = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #fef3c7;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #e2e8f0;
  }

  span:first-child {
    color: #1a1a2e;
  }

  span:last-child {
    color: #64748b;
    font-size: 0.85rem;
  }
`;

const ComponentesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ComponenteItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
`;

const ComponenteInfo = styled.div`
  flex: 1;

  h4 {
    margin: 0 0 2px;
    font-size: 0.9rem;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
  }
`;

const CantidadInput = styled.input`
  width: 70px;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const DeleteButton = styled.button`
  padding: 8px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #fef2f2;
    color: #ef4444;
  }
`;

const EmptyComponentes = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
`;

const TotalesCard = styled.div`
  padding: 16px;
  background: #fef3c7;
  border-radius: 10px;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  color: ${(props) => (props.$highlight ? "#059669" : "#92400e")};

  span {
    font-size: 0.9rem;
  }

  strong {
    font-size: 1rem;
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
  background: ${(props) => (props.$variant === "secondary" ? "#f1f5f9" : "#f59e0b")};
  color: ${(props) => (props.$variant === "secondary" ? "#334155" : "#fff")};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
