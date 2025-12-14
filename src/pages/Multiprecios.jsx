import { useState } from "react";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useMultipreciosStore } from "../store/MultipreciosStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useProductosStore } from "../store/ProductosStore";

export function Multiprecios() {
  const { dataempresa } = useEmpresaStore();
  const { dataproductos } = useProductosStore();
  const {
    plantillasPrecios,
    obtenerMultipreciosProducto,
    insertarMultiprecio,
    calcularDescuento,
    setProductoSeleccionado,
  } = useMultipreciosStore();

  const [modalConfig, setModalConfig] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [precios, setPrecios] = useState([]);
  const [nuevoNivel, setNuevoNivel] = useState({
    nombre: "",
    cantidad_minima: 1,
    cantidad_maxima: null,
    precio_venta: 0,
  });
  const [buscador, setBuscador] = useState("");

  // Productos que manejan multiprecios
  const productosConMultiprecios = dataproductos?.filter(
    (p) => p.maneja_multiprecios
  ) || [];

  // Filtrar productos
  const productosFiltrados = buscador
    ? productosConMultiprecios.filter((p) =>
        p.descripcion.toLowerCase().includes(buscador.toLowerCase())
      )
    : productosConMultiprecios;

  const handleSeleccionarProducto = async (producto) => {
    setProductoActual(producto);
    setProductoSeleccionado(producto);
    const data = await obtenerMultipreciosProducto({ id_producto: producto.id });
    setPrecios(data || []);
    setModalConfig(true);
  };

  const handleAgregarNivel = () => {
    if (!nuevoNivel.nombre || !nuevoNivel.precio_venta) return;
    
    setPrecios([
      ...precios,
      {
        ...nuevoNivel,
        id: `temp-${Date.now()}`,
        isNew: true,
      },
    ]);
    setNuevoNivel({
      nombre: "",
      cantidad_minima: 1,
      cantidad_maxima: null,
      precio_venta: 0,
    });
  };

  const handleAplicarPlantilla = (plantilla) => {
    if (!productoActual) return;
    
    const precioBase = productoActual.precio_venta;
    const nuevosPrecios = plantilla.niveles.map((nivel, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      nombre: nivel.nombre,
      cantidad_minima: nivel.cantidad_minima,
      cantidad_maxima: nivel.cantidad_maxima,
      precio_venta: precioBase * (1 - nivel.descuento / 100),
      isNew: true,
    }));
    
    setPrecios(nuevosPrecios);
  };

  const handleGuardarPrecios = async () => {
    // Eliminar precios que fueron removidos
    // Actualizar precios existentes
    // Insertar nuevos precios
    
    for (const precio of precios) {
      if (precio.isNew) {
        await insertarMultiprecio({
          id_producto: productoActual.id,
          nombre: precio.nombre,
          cantidad_minima: precio.cantidad_minima,
          cantidad_maxima: precio.cantidad_maxima,
          precio_venta: precio.precio_venta,
        });
      }
    }
    
    setModalConfig(false);
    setPrecios([]);
  };

  const handleEliminarNivel = (idx) => {
    const nuevosPrecios = precios.filter((_, i) => i !== idx);
    setPrecios(nuevosPrecios);
  };

  return (
    <Container>
      {/* Modal Configuración de Precios */}
      {modalConfig && productoActual && (
        <ModalOverlay onClick={() => setModalConfig(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h2>Configurar Precios</h2>
                <ProductoName>{productoActual.descripcion}</ProductoName>
                <PrecioBase>
                  Precio base: S/ {productoActual.precio_venta?.toFixed(2)}
                </PrecioBase>
              </div>
              <CloseButton onClick={() => setModalConfig(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              {/* Plantillas rápidas */}
              <Section>
                <SectionTitle>
                  <Icon icon="lucide:zap" />
                  Aplicar Plantilla
                </SectionTitle>
                <PlantillasGrid>
                  {plantillasPrecios.map((plantilla) => (
                    <PlantillaCard
                      key={plantilla.nombre}
                      onClick={() => handleAplicarPlantilla(plantilla)}
                    >
                      <h4>{plantilla.nombre}</h4>
                      <p>{plantilla.descripcion}</p>
                    </PlantillaCard>
                  ))}
                </PlantillasGrid>
              </Section>

              {/* Lista de niveles de precio */}
              <Section>
                <SectionTitle>
                  <Icon icon="lucide:layers" />
                  Niveles de Precio
                </SectionTitle>
                
                {precios.length > 0 ? (
                  <PreciosList>
                    {precios.map((precio, idx) => (
                      <PrecioItem key={precio.id}>
                        <PrecioInfo>
                          <PrecioNombre>{precio.nombre}</PrecioNombre>
                          <PrecioCantidad>
                            {precio.cantidad_minima} - {precio.cantidad_maxima || "∞"} unidades
                          </PrecioCantidad>
                        </PrecioInfo>
                        <PrecioValor>
                          <span>S/ {precio.precio_venta?.toFixed(2)}</span>
                          <DescuentoBadge>
                            -{calcularDescuento(productoActual.precio_venta, precio.precio_venta).toFixed(0)}%
                          </DescuentoBadge>
                        </PrecioValor>
                        <DeleteButton onClick={() => handleEliminarNivel(idx)}>
                          <Icon icon="lucide:trash-2" />
                        </DeleteButton>
                      </PrecioItem>
                    ))}
                  </PreciosList>
                ) : (
                  <EmptyPrecios>
                    <Icon icon="lucide:info" />
                    No hay niveles configurados. Usa una plantilla o agrega manualmente.
                  </EmptyPrecios>
                )}
              </Section>

              {/* Agregar nivel manual */}
              <Section>
                <SectionTitle>
                  <Icon icon="lucide:plus-circle" />
                  Agregar Nivel Manual
                </SectionTitle>
                <NuevoNivelForm>
                  <FormRow>
                    <FormGroup>
                      <Label>Nombre</Label>
                      <Input
                        type="text"
                        placeholder="Ej: Mayorista"
                        value={nuevoNivel.nombre}
                        onChange={(e) =>
                          setNuevoNivel({ ...nuevoNivel, nombre: e.target.value })
                        }
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>Precio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={nuevoNivel.precio_venta || ""}
                        onChange={(e) =>
                          setNuevoNivel({
                            ...nuevoNivel,
                            precio_venta: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>Cantidad Mínima</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={nuevoNivel.cantidad_minima}
                        onChange={(e) =>
                          setNuevoNivel({
                            ...nuevoNivel,
                            cantidad_minima: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>Cantidad Máxima</Label>
                      <Input
                        type="number"
                        placeholder="Sin límite"
                        value={nuevoNivel.cantidad_maxima || ""}
                        onChange={(e) =>
                          setNuevoNivel({
                            ...nuevoNivel,
                            cantidad_maxima: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      />
                    </FormGroup>
                  </FormRow>
                  <Button onClick={handleAgregarNivel}>
                    <Icon icon="lucide:plus" />
                    Agregar Nivel
                  </Button>
                </NuevoNivelForm>
              </Section>
            </ModalBody>

            <ModalFooter>
              <Button $variant="secondary" onClick={() => setModalConfig(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGuardarPrecios}>
                <Icon icon="lucide:save" />
                Guardar Configuración
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:badge-dollar-sign" />
          </IconWrapper>
          <div>
            <Title>Multi-Precios</Title>
            <Subtitle>
              Configura precios por volumen y tipo de cliente
            </Subtitle>
          </div>
        </HeaderLeft>
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
      </Header>

      {/* Info Cards */}
      <InfoCards>
        <InfoCard>
          <Icon icon="lucide:package" />
          <div>
            <h4>{productosConMultiprecios.length}</h4>
            <p>Productos con Multi-Precio</p>
          </div>
        </InfoCard>
        <InfoCard>
          <Icon icon="lucide:layers" />
          <div>
            <h4>{plantillasPrecios.length}</h4>
            <p>Plantillas Disponibles</p>
          </div>
        </InfoCard>
      </InfoCards>

      {/* Content */}
      <Content>
        {productosFiltrados.length > 0 ? (
          <ProductosGrid>
            {productosFiltrados.map((producto) => (
              <ProductoCard key={producto.id}>
                <ProductoIcon>
                  <Icon icon="lucide:package" />
                </ProductoIcon>
                <ProductoInfo>
                  <h3>{producto.descripcion}</h3>
                  <ProductoDetalles>
                    <span>
                      <Icon icon="lucide:barcode" />
                      {producto.codigobarras || "Sin código"}
                    </span>
                    <span>
                      <Icon icon="lucide:tag" />
                      S/ {producto.precio_venta?.toFixed(2)}
                    </span>
                  </ProductoDetalles>
                </ProductoInfo>
                <ProductoActions>
                  <ActionButton onClick={() => handleSeleccionarProducto(producto)}>
                    <Icon icon="lucide:settings-2" />
                    Configurar Precios
                  </ActionButton>
                </ProductoActions>
              </ProductoCard>
            ))}
          </ProductosGrid>
        ) : (
          <EmptyState>
            <Icon icon="lucide:package-x" />
            <h3>No hay productos con multi-precio</h3>
            <p>
              Para usar esta función, activa "Maneja multi-precios" en los
              productos que desees configurar con precios escalonados.
            </p>
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

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
  max-width: 300px;
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
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const InfoCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const InfoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  svg {
    font-size: 32px;
    color: #10b981;
  }

  h4 {
    margin: 0;
    font-size: 1.5rem;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: #64748b;
  }
`;

const Content = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
    border-color: #10b981;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const ProductoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #ecfdf5;
  border-radius: 10px;
  flex-shrink: 0;

  svg {
    font-size: 24px;
    color: #10b981;
  }
`;

const ProductoInfo = styled.div`
  flex: 1;

  h3 {
    margin: 0 0 4px;
    color: #1a1a2e;
    font-size: 1rem;
  }
`;

const ProductoDetalles = styled.div`
  display: flex;
  gap: 16px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #64748b;
    font-size: 0.875rem;

    svg {
      font-size: 14px;
    }
  }
`;

const ProductoActions = styled.div`
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #ecfdf5;
  color: #059669;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #10b981;
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
  max-width: 640px;
  max-height: 90vh;
  overflow: auto;
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
  margin: 8px 0 4px;
  font-weight: 500;
  color: #334155;
`;

const PrecioBase = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
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
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: #334155;

  svg {
    color: #10b981;
  }
`;

const PlantillasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
`;

const PlantillaCard = styled.div`
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #10b981;
    background: #ecfdf5;
  }

  h4 {
    margin: 0 0 4px;
    font-size: 0.9rem;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 0.75rem;
    color: #64748b;
  }
`;

const PreciosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PrecioItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
`;

const PrecioInfo = styled.div`
  flex: 1;
`;

const PrecioNombre = styled.div`
  font-weight: 500;
  color: #1a1a2e;
`;

const PrecioCantidad = styled.div`
  font-size: 0.8rem;
  color: #64748b;
`;

const PrecioValor = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    font-weight: 600;
    color: #059669;
  }
`;

const DescuentoBadge = styled.span`
  padding: 2px 8px;
  background: #fef3c7;
  color: #d97706;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
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

const EmptyPrecios = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.9rem;
`;

const NuevoNivelForm = styled.div``;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
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
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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
  background: ${(props) => (props.$variant === "secondary" ? "#f1f5f9" : "#10b981")};
  color: ${(props) => (props.$variant === "secondary" ? "#334155" : "#fff")};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;
