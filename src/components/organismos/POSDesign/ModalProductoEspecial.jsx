import { useState, useEffect } from "react";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import {
  VerificarCaracteristicasProducto,
  ObtenerPrecioSegunCantidad,
  ObtenerVariantesProducto,
  ObtenerSerialesDisponiblesParaVenta,
  ValidarStockComponentes,
  ObtenerNivelesMultiprecio,
} from "../../../utils/POSHelpers";
import { FormatearNumeroDinero } from "../../../utils/Conversiones";
import { useEmpresaStore } from "../../../store/EmpresaStore";

/**
 * Modal que se muestra cuando un producto tiene características especiales:
 * - Variantes (talla, color, etc.)
 * - Seriales (productos que requieren seleccionar número de serie)
 * - Multiprecios (muestra el precio según cantidad)
 * - Productos compuestos (valida stock de componentes)
 */
export function ModalProductoEspecial({
  producto,
  idAlmacen,
  cantidadInicial = 1,
  onConfirmar,
  onCancelar,
}) {
  const { dataempresa } = useEmpresaStore();
  const [loading, setLoading] = useState(true);
  const [caracteristicas, setCaracteristicas] = useState(null);
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const [precioInfo, setPrecioInfo] = useState(null);
  const [variantes, setVariantes] = useState([]);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
  const [seriales, setSeriales] = useState([]);
  const [serialSeleccionado, setSerialSeleccionado] = useState(null);
  const [stockComponentes, setStockComponentes] = useState(null);
  const [nivelesMultiprecio, setNivelesMultiprecio] = useState([]);
  const [error, setError] = useState(null);

  // Cargar información del producto
  useEffect(() => {
    cargarInformacion();
  }, [producto?.id]);

  // Actualizar precio cuando cambia la cantidad
  useEffect(() => {
    if (caracteristicas?.tieneMultiprecios && producto?.id) {
      actualizarPrecio();
    }
  }, [cantidad, caracteristicas?.tieneMultiprecios]);

  const cargarInformacion = async () => {
    if (!producto?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Obtener características del producto
      const caract = await VerificarCaracteristicasProducto(producto.id);
      setCaracteristicas(caract);

      // Si tiene variantes, cargarlas
      if (caract.tieneVariantes) {
        const vars = await ObtenerVariantesProducto(producto.id);
        setVariantes(vars);
      }

      // Si tiene seriales, cargar disponibles
      if (caract.tieneSeriales && idAlmacen) {
        const sers = await ObtenerSerialesDisponiblesParaVenta(producto.id, idAlmacen);
        setSeriales(sers);
        if (sers.length === 0) {
          setError("No hay seriales disponibles para este producto en el almacén seleccionado");
        }
      }

      // Si es compuesto, validar stock
      if (caract.esCompuesto && idAlmacen) {
        const stock = await ValidarStockComponentes(producto.id, idAlmacen, cantidad);
        setStockComponentes(stock);
        if (!stock.valido) {
          setError("Stock insuficiente en uno o más componentes del kit");
        }
      }

      // Si tiene multiprecios, cargar niveles
      if (caract.tieneMultiprecios) {
        const niveles = await ObtenerNivelesMultiprecio(producto.id);
        setNivelesMultiprecio(niveles);
        const precio = await ObtenerPrecioSegunCantidad(producto.id, cantidad);
        setPrecioInfo(precio);
      } else {
        setPrecioInfo({
          precio: caract.precio_base,
          nombre_nivel: "Precio Base",
          es_multiprecio: false,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const actualizarPrecio = async () => {
    try {
      const precio = await ObtenerPrecioSegunCantidad(producto.id, cantidad);
      setPrecioInfo(precio);

      // Si es compuesto, revalidar stock
      if (caracteristicas?.esCompuesto && idAlmacen) {
        const stock = await ValidarStockComponentes(producto.id, idAlmacen, cantidad);
        setStockComponentes(stock);
      }
    } catch (err) {
      console.error("Error al actualizar precio:", err);
    }
  };

  const handleConfirmar = () => {
    // Validaciones
    if (caracteristicas?.tieneVariantes && !varianteSeleccionada) {
      setError("Debes seleccionar una variante");
      return;
    }

    if (caracteristicas?.tieneSeriales && !serialSeleccionado) {
      setError("Debes seleccionar un número de serie");
      return;
    }

    if (stockComponentes && !stockComponentes.valido) {
      setError("Stock insuficiente en componentes");
      return;
    }

    onConfirmar({
      producto,
      cantidad,
      precio: precioInfo?.precio || producto.precio_venta,
      variante: varianteSeleccionada,
      serial: serialSeleccionado,
      infoMultiprecio: precioInfo,
    });
  };

  const puedeConfirmar = () => {
    if (loading) return false;
    if (caracteristicas?.tieneVariantes && !varianteSeleccionada) return false;
    if (caracteristicas?.tieneSeriales && !serialSeleccionado) return false;
    if (stockComponentes && !stockComponentes.valido) return false;
    return true;
  };

  if (loading) {
    return (
      <Overlay>
        <Modal>
          <LoadingContainer>
            <Icon icon="lucide:loader-2" className="spin" />
            <p>Cargando información del producto...</p>
          </LoadingContainer>
        </Modal>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={onCancelar}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderInfo>
            <ProductName>{producto?.descripcion || producto?.nombre}</ProductName>
            {caracteristicas && (
              <Tags>
                {caracteristicas.tieneVariantes && <Tag $color="#667eea">Variantes</Tag>}
                {caracteristicas.tieneMultiprecios && <Tag $color="#10b981">Multiprecios</Tag>}
                {caracteristicas.tieneSeriales && <Tag $color="#8b5cf6">Con Serial</Tag>}
                {caracteristicas.esCompuesto && <Tag $color="#f59e0b">Kit/Combo</Tag>}
              </Tags>
            )}
          </HeaderInfo>
          <CloseButton onClick={onCancelar}>
            <Icon icon="lucide:x" />
          </CloseButton>
        </Header>

        <Body>
          {error && (
            <ErrorMessage>
              <Icon icon="lucide:alert-triangle" />
              {error}
            </ErrorMessage>
          )}

          {/* Sección de Cantidad y Precio */}
          <Section>
            <SectionTitle>Cantidad y Precio</SectionTitle>
            <CantidadPrecioRow>
              <CantidadControl>
                <CantidadButton onClick={() => setCantidad(Math.max(1, cantidad - 1))}>
                  <Icon icon="lucide:minus" />
                </CantidadButton>
                <CantidadInput
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <CantidadButton onClick={() => setCantidad(cantidad + 1)}>
                  <Icon icon="lucide:plus" />
                </CantidadButton>
              </CantidadControl>

              <PrecioDisplay>
                <PrecioActual>
                  {FormatearNumeroDinero(precioInfo?.precio || 0, dataempresa?.currency, dataempresa?.iso)}
                </PrecioActual>
                {precioInfo?.es_multiprecio && (
                  <MultiprecioBadge>
                    <Icon icon="lucide:percent" />
                    {precioInfo.nombre_nivel} (-{precioInfo.descuento}%)
                  </MultiprecioBadge>
                )}
              </PrecioDisplay>
            </CantidadPrecioRow>

            {/* Mostrar niveles de multiprecio */}
            {nivelesMultiprecio.length > 0 && (
              <NivelesContainer>
                <small>Precios por volumen:</small>
                <NivelesGrid>
                  {nivelesMultiprecio.map((nivel) => (
                    <NivelCard
                      key={nivel.id}
                      $active={precioInfo?.precio === nivel.precio_venta}
                    >
                      <span className="nombre">{nivel.nombre}</span>
                      <span className="rango">
                        {nivel.cantidad_minima}
                        {nivel.cantidad_maxima ? `-${nivel.cantidad_maxima}` : "+"} uds
                      </span>
                      <span className="precio">
                        {FormatearNumeroDinero(nivel.precio_venta, dataempresa?.currency, dataempresa?.iso)}
                      </span>
                    </NivelCard>
                  ))}
                </NivelesGrid>
              </NivelesContainer>
            )}
          </Section>

          {/* Sección de Variantes */}
          {caracteristicas?.tieneVariantes && variantes.length > 0 && (
            <Section>
              <SectionTitle>Selecciona Variante</SectionTitle>
              <VariantesGrid>
                {variantes.map((variante) => (
                  <VarianteCard
                    key={variante.id}
                    $selected={varianteSeleccionada?.id === variante.id}
                    onClick={() => setVarianteSeleccionada(variante)}
                  >
                    <VarianteInfo>
                      <span className="sku">{variante.sku || `VAR-${variante.id}`}</span>
                      {variante.precio && (
                        <span className="precio">
                          {FormatearNumeroDinero(variante.precio, dataempresa?.currency, dataempresa?.iso)}
                        </span>
                      )}
                    </VarianteInfo>
                    {varianteSeleccionada?.id === variante.id && (
                      <Icon icon="lucide:check" className="check" />
                    )}
                  </VarianteCard>
                ))}
              </VariantesGrid>
            </Section>
          )}

          {/* Sección de Seriales */}
          {caracteristicas?.tieneSeriales && (
            <Section>
              <SectionTitle>
                Selecciona Número de Serie
                <small>({seriales.length} disponibles)</small>
              </SectionTitle>
              {seriales.length > 0 ? (
                <SerialesGrid>
                  {seriales.slice(0, 10).map((serial) => (
                    <SerialCard
                      key={serial.id}
                      $selected={serialSeleccionado?.id === serial.id}
                      onClick={() => setSerialSeleccionado(serial)}
                    >
                      <SerialCode>{serial.numero_serie}</SerialCode>
                      {serialSeleccionado?.id === serial.id && (
                        <Icon icon="lucide:check" className="check" />
                      )}
                    </SerialCard>
                  ))}
                </SerialesGrid>
              ) : (
                <EmptyMessage>
                  <Icon icon="lucide:alert-circle" />
                  No hay seriales disponibles
                </EmptyMessage>
              )}
            </Section>
          )}

          {/* Sección de Componentes (Kit) */}
          {caracteristicas?.esCompuesto && stockComponentes && (
            <Section>
              <SectionTitle>
                Componentes del Kit
                {stockComponentes.valido ? (
                  <StatusBadge $valid>
                    <Icon icon="lucide:check-circle" /> Stock OK
                  </StatusBadge>
                ) : (
                  <StatusBadge>
                    <Icon icon="lucide:alert-triangle" /> Stock Insuficiente
                  </StatusBadge>
                )}
              </SectionTitle>
              <ComponentesTable>
                <thead>
                  <tr>
                    <th>Componente</th>
                    <th>Necesario</th>
                    <th>Disponible</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockComponentes.componentes.map((comp) => (
                    <tr key={comp.id_componente}>
                      <td>{comp.nombre}</td>
                      <td>{comp.cantidad_necesaria}</td>
                      <td>{comp.stock_actual}</td>
                      <td>
                        {comp.suficiente ? (
                          <Icon icon="lucide:check" style={{ color: "#10b981" }} />
                        ) : (
                          <span style={{ color: "#ef4444" }}>
                            Faltan {comp.faltante}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ComponentesTable>
            </Section>
          )}
        </Body>

        <Footer>
          <TotalRow>
            <span>Total:</span>
            <TotalAmount>
              {FormatearNumeroDinero(
                (precioInfo?.precio || producto?.precio_venta || 0) * cantidad,
                dataempresa?.currency,
                dataempresa?.iso
              )}
            </TotalAmount>
          </TotalRow>
          <ButtonsRow>
            <CancelButton onClick={onCancelar}>Cancelar</CancelButton>
            <ConfirmButton onClick={handleConfirmar} disabled={!puedeConfirmar()}>
              <Icon icon="lucide:shopping-cart" />
              Agregar al Carrito
            </ConfirmButton>
          </ButtonsRow>
        </Footer>
      </Modal>
    </Overlay>
  );
}

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const ProductName = styled.h2`
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: #1a1a2e;
`;

const Tags = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  padding: 3px 10px;
  background: ${(props) => props.$color}15;
  color: ${(props) => props.$color};
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
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

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
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
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #334155;

  small {
    font-weight: 400;
    color: #94a3b8;
  }
`;

const CantidadPrecioRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
`;

const CantidadControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CantidadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: #334155;
  transition: all 0.2s;

  &:hover {
    background: #e2e8f0;
  }
`;

const CantidadInput = styled.input`
  width: 70px;
  height: 40px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  border: 2px solid #e2e8f0;
  border-radius: 10px;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const PrecioDisplay = styled.div`
  text-align: right;
`;

const PrecioActual = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
`;

const MultiprecioBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 0.8rem;
  color: #10b981;
  margin-top: 4px;
`;

const NivelesContainer = styled.div`
  margin-top: 16px;

  small {
    color: #64748b;
    font-size: 0.8rem;
  }
`;

const NivelesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 8px;
`;

const NivelCard = styled.div`
  padding: 10px;
  border: 2px solid ${(props) => (props.$active ? "#10b981" : "#e2e8f0")};
  border-radius: 8px;
  background: ${(props) => (props.$active ? "#ecfdf5" : "#fff")};
  text-align: center;

  .nombre {
    display: block;
    font-weight: 600;
    font-size: 0.8rem;
    color: #334155;
  }

  .rango {
    display: block;
    font-size: 0.7rem;
    color: #64748b;
  }

  .precio {
    display: block;
    font-weight: 700;
    color: ${(props) => (props.$active ? "#10b981" : "#1a1a2e")};
    margin-top: 4px;
  }
`;

const VariantesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
`;

const VarianteCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 2px solid ${(props) => (props.$selected ? "#667eea" : "#e2e8f0")};
  border-radius: 10px;
  background: ${(props) => (props.$selected ? "#eef2ff" : "#fff")};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
  }

  .check {
    color: #667eea;
  }
`;

const VarianteInfo = styled.div`
  .sku {
    display: block;
    font-weight: 600;
    color: #1a1a2e;
    font-size: 0.9rem;
  }

  .precio {
    display: block;
    color: #64748b;
    font-size: 0.8rem;
  }
`;

const SerialesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
`;

const SerialCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 2px solid ${(props) => (props.$selected ? "#8b5cf6" : "#e2e8f0")};
  border-radius: 8px;
  background: ${(props) => (props.$selected ? "#faf5ff" : "#fff")};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #8b5cf6;
  }

  .check {
    color: #8b5cf6;
  }
`;

const SerialCode = styled.code`
  font-family: monospace;
  font-size: 0.85rem;
  color: #334155;
`;

const ComponentesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th,
  td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  th {
    background: #f8fafc;
    font-weight: 500;
    color: #64748b;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${(props) => (props.$valid ? "#ecfdf5" : "#fef2f2")};
  color: ${(props) => (props.$valid ? "#10b981" : "#ef4444")};
`;

const EmptyMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  background: #fef2f2;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.9rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.9rem;
  margin-bottom: 16px;
`;

const Footer = styled.div`
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  span {
    font-size: 1rem;
    color: #64748b;
  }
`;

const TotalAmount = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 12px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 14px;
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #94a3b8;
    color: #334155;
  }
`;

const ConfirmButton = styled.button`
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #10b981;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #059669;
  }

  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #64748b;

  .spin {
    font-size: 32px;
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

  p {
    margin-top: 16px;
  }
`;
