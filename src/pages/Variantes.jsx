import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useVariantesStore } from "../store/VariantesStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { Spinner1 } from "../index";
import { ObtenerProductosConVariantes } from "../supabase/crudVariantes";

export function Variantes() {
  const { dataempresa } = useEmpresaStore();
  const {
    dataAtributos,
    obtenerAtributos,
    crearAtributoConValores,
    obtenerVariantesProducto,
    crearVarianteProducto,
    generarCombinaciones,
    setProductoSeleccionado,
  } = useVariantesStore();

  const [modalAtributo, setModalAtributo] = useState(false);
  const [modalVariante, setModalVariante] = useState(false);
  const [nuevoAtributo, setNuevoAtributo] = useState({ nombre: "", valores: "" });
  const [productoVariante, setProductoVariante] = useState(null);
  const [atributosSeleccionados, setAtributosSeleccionados] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [tab, setTab] = useState("atributos"); // atributos | productos

  // Obtener atributos
  const { isLoading } = useQuery({
    queryKey: ["obtener-atributos", dataempresa?.id],
    queryFn: () => obtenerAtributos({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  // Obtener productos con variantes directamente de la BD
  const { data: productosConVariantes = [], isLoading: loadingProductos } = useQuery({
    queryKey: ["productos-con-variantes", dataempresa?.id],
    queryFn: () => ObtenerProductosConVariantes({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  const handleCrearAtributo = async () => {
    if (!nuevoAtributo.nombre || !nuevoAtributo.valores) return;
    
    const valores = nuevoAtributo.valores
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v);

    const resultado = await crearAtributoConValores({
      id_empresa: dataempresa?.id,
      nombre: nuevoAtributo.nombre,
      valores,
    });

    if (resultado.exito) {
      setNuevoAtributo({ nombre: "", valores: "" });
      setModalAtributo(false);
      obtenerAtributos({ id_empresa: dataempresa?.id });
    }
  };

  const handleSeleccionarProducto = async (producto) => {
    setProductoVariante(producto);
    setProductoSeleccionado(producto);
    await obtenerVariantesProducto({ id_producto: producto.id });
    setModalVariante(true);
  };

  const handleGenerarVariantes = () => {
    if (atributosSeleccionados.length === 0) return;
    
    const combinaciones = generarCombinaciones(atributosSeleccionados);
    setVariantes(
      combinaciones.map((comb) => ({
        combinacion: comb,
        sku: "",
        precio: productoVariante?.precio_venta || 0,
        stock: 0,
      }))
    );
  };

  const handleGuardarVariantes = async () => {
    for (const variante of variantes) {
      await crearVarianteProducto({
        id_producto: productoVariante.id,
        atributos: variante.combinacion.map((a) => ({ 
          id_atributo: a.id_atributo, 
          id_valor: a.id_valor 
        })),
        nombre_variante: variante.combinacion.map((c) => c.valor).join(" / "),
        precio_venta: variante.precio,
        codigo_barras: variante.sku,
        stock_inicial: variante.stock,
      });
    }
    setModalVariante(false);
    setVariantes([]);
    setAtributosSeleccionados([]);
  };

  if (isLoading || loadingProductos) return <Spinner1 />;

  return (
    <Container>
      {/* Modal Nuevo Atributo */}
      {modalAtributo && (
        <ModalOverlay onClick={() => setModalAtributo(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Nuevo Atributo</h2>
              <CloseButton onClick={() => setModalAtributo(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label>Nombre del Atributo</Label>
                <Input
                  type="text"
                  placeholder="Ej: Color, Talla, Material"
                  value={nuevoAtributo.nombre}
                  onChange={(e) =>
                    setNuevoAtributo({ ...nuevoAtributo, nombre: e.target.value })
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>Valores (separados por coma)</Label>
                <Input
                  type="text"
                  placeholder="Ej: Rojo, Azul, Verde"
                  value={nuevoAtributo.valores}
                  onChange={(e) =>
                    setNuevoAtributo({ ...nuevoAtributo, valores: e.target.value })
                  }
                />
                <HelpText>
                  Los valores serán las opciones disponibles para este atributo
                </HelpText>
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <Button $variant="secondary" onClick={() => setModalAtributo(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCrearAtributo}>
                <Icon icon="lucide:plus" />
                Crear Atributo
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal Crear Variantes */}
      {modalVariante && productoVariante && (
        <ModalOverlay onClick={() => setModalVariante(false)}>
          <ModalContentLarge onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h2>Crear Variantes</h2>
                <p>Producto: {productoVariante.nombre || productoVariante.descripcion}</p>
              </div>
              <CloseButton onClick={() => setModalVariante(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {/* Paso 1: Seleccionar atributos */}
              <Section>
                <SectionTitle>1. Selecciona los atributos</SectionTitle>
                <AtributosGrid>
                  {dataAtributos.map((attr) => (
                    <AtributoCard
                      key={attr.id}
                      $selected={atributosSeleccionados.some((a) => a.id === attr.id)}
                      onClick={() => {
                        if (atributosSeleccionados.some((a) => a.id === attr.id)) {
                          setAtributosSeleccionados(
                            atributosSeleccionados.filter((a) => a.id !== attr.id)
                          );
                        } else {
                          setAtributosSeleccionados([...atributosSeleccionados, attr]);
                        }
                      }}
                    >
                      <h4>{attr.nombre}</h4>
                      <ValoresTags>
                        {attr.atributo_valores?.map((v) => (
                          <Tag key={v.id}>{v.valor}</Tag>
                        ))}
                      </ValoresTags>
                    </AtributoCard>
                  ))}
                </AtributosGrid>
                <Button
                  onClick={handleGenerarVariantes}
                  disabled={atributosSeleccionados.length === 0}
                  style={{ marginTop: 16 }}
                >
                  <Icon icon="lucide:layers" />
                  Generar Combinaciones
                </Button>
              </Section>

              {/* Paso 2: Configurar variantes */}
              {variantes.length > 0 && (
                <Section>
                  <SectionTitle>2. Configura cada variante</SectionTitle>
                  <VariantesTable>
                    <thead>
                      <tr>
                        <th>Combinación</th>
                        <th>SKU</th>
                        <th>Precio</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantes.map((v, idx) => (
                        <tr key={idx}>
                          <td>
                            {v.combinacion.map((c) => c.valor).join(" / ")}
                          </td>
                          <td>
                            <SmallInput
                              type="text"
                              placeholder="SKU"
                              value={v.sku}
                              onChange={(e) => {
                                const newVariantes = [...variantes];
                                newVariantes[idx].sku = e.target.value;
                                setVariantes(newVariantes);
                              }}
                            />
                          </td>
                          <td>
                            <SmallInput
                              type="number"
                              value={v.precio}
                              onChange={(e) => {
                                const newVariantes = [...variantes];
                                newVariantes[idx].precio = parseFloat(e.target.value) || 0;
                                setVariantes(newVariantes);
                              }}
                            />
                          </td>
                          <td>
                            <SmallInput
                              type="number"
                              value={v.stock}
                              onChange={(e) => {
                                const newVariantes = [...variantes];
                                newVariantes[idx].stock = parseInt(e.target.value) || 0;
                                setVariantes(newVariantes);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </VariantesTable>
                </Section>
              )}
            </ModalBody>
            <ModalFooter>
              <Button $variant="secondary" onClick={() => setModalVariante(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGuardarVariantes} disabled={variantes.length === 0}>
                <Icon icon="lucide:save" />
                Guardar Variantes ({variantes.length})
              </Button>
            </ModalFooter>
          </ModalContentLarge>
        </ModalOverlay>
      )}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:layers" />
          </IconWrapper>
          <div>
            <Title>Variantes de Productos</Title>
            <Subtitle>Gestiona atributos y variaciones de productos</Subtitle>
          </div>
        </HeaderLeft>
      </Header>

      {/* Tabs */}
      <TabsContainer>
        <Tab $active={tab === "atributos"} onClick={() => setTab("atributos")}>
          <Icon icon="lucide:tag" />
          Atributos ({dataAtributos.length})
        </Tab>
        <Tab $active={tab === "productos"} onClick={() => setTab("productos")}>
          <Icon icon="lucide:package" />
          Productos con Variantes ({productosConVariantes.length})
        </Tab>
      </TabsContainer>

      {/* Content */}
      <Content>
        {tab === "atributos" ? (
          <>
            <ActionBar>
              <Button onClick={() => setModalAtributo(true)}>
                <Icon icon="lucide:plus" />
                Nuevo Atributo
              </Button>
            </ActionBar>
            <AtributosGrid>
              {dataAtributos.map((attr) => (
                <AtributoFullCard key={attr.id}>
                  <AtributoHeader>
                    <h3>{attr.nombre}</h3>
                    <Badge>{attr.atributo_valores?.length || 0} valores</Badge>
                  </AtributoHeader>
                  <ValoresList>
                    {attr.atributo_valores?.map((v) => (
                      <ValorItem key={v.id}>
                        {v.codigo_color ? (
                          <ColorDot $color={v.codigo_color} />
                        ) : null}
                        {v.valor}
                      </ValorItem>
                    ))}
                  </ValoresList>
                </AtributoFullCard>
              ))}
              {dataAtributos.length === 0 && (
                <EmptyState>
                  <Icon icon="lucide:tag" />
                  <h3>No hay atributos</h3>
                  <p>Crea atributos como Color, Talla, Material para tus productos</p>
                </EmptyState>
              )}
            </AtributosGrid>
          </>
        ) : (
          <>
            <ProductosGrid>
              {productosConVariantes.map((producto) => (
                <ProductoCard key={producto.id}>
                  <ProductoInfo>
                    <h3>{producto.nombre || producto.descripcion}</h3>
                    <p>SKU: {producto.codigo_barras || producto.codigobarras || "N/A"}</p>
                    <p>Precio: ${producto.precio_venta}</p>
                  </ProductoInfo>
                  <ProductoActions>
                    <Button
                      $variant="secondary"
                      onClick={() => handleSeleccionarProducto(producto)}
                    >
                      <Icon icon="lucide:settings" />
                      Gestionar Variantes
                    </Button>
                  </ProductoActions>
                </ProductoCard>
              ))}
              {productosConVariantes.length === 0 && (
                <EmptyState>
                  <Icon icon="lucide:package" />
                  <h3>No hay productos con variantes</h3>
                  <p>
                    Activa "Maneja variantes" en los productos que necesiten
                    diferentes presentaciones
                  </p>
                </EmptyState>
              )}
            </ProductosGrid>
          </>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: ${(props) => (props.$active ? "#667eea" : "transparent")};
  color: ${(props) => (props.$active ? "#fff" : "#64748b")};

  &:hover {
    background: ${(props) => (props.$active ? "#667eea" : "#f1f5f9")};
  }
`;

const Content = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const ActionBar = styled.div`
  margin-bottom: 24px;
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
  background: ${(props) => (props.$variant === "secondary" ? "#f1f5f9" : "#667eea")};
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

const AtributosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const AtributoCard = styled.div`
  padding: 16px;
  border: 2px solid ${(props) => (props.$selected ? "#667eea" : "#e2e8f0")};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) => (props.$selected ? "#f0f3ff" : "#fff")};

  &:hover {
    border-color: #667eea;
  }

  h4 {
    margin: 0 0 12px;
    color: #1a1a2e;
  }
`;

const AtributoFullCard = styled.div`
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
`;

const AtributoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    color: #1a1a2e;
  }
`;

const Badge = styled.span`
  padding: 4px 10px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 20px;
  font-size: 0.75rem;
`;

const ValoresTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Tag = styled.span`
  padding: 4px 10px;
  background: #e2e8f0;
  color: #334155;
  border-radius: 20px;
  font-size: 0.8rem;
`;

const ValoresList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ValorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 0.875rem;
`;

const ColorDot = styled.span`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${(props) => props.$color};
  border: 1px solid rgba(0, 0, 0, 0.1);
`;

const ProductosGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProductoCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const ProductoInfo = styled.div`
  h3 {
    margin: 0 0 4px;
    color: #1a1a2e;
    font-size: 1rem;
  }
  p {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
  }
`;

const ProductoActions = styled.div`
  display: flex;
  gap: 8px;
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #64748b;

  svg {
    font-size: 48px;
    opacity: 0.5;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    color: #334155;
  }

  p {
    margin: 0;
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
  max-width: 800px;
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
    color: #64748b;
    font-size: 0.875rem;
  }
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

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #334155;
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
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const SmallInput = styled(Input)`
  padding: 8px 12px;
  font-size: 0.875rem;
`;

const HelpText = styled.p`
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: #64748b;
`;

const Section = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 1rem;
  color: #334155;
`;

const VariantesTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 12px;
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

  td {
    font-size: 0.9rem;
  }
`;
