import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import styled, { keyframes } from "styled-components";
import { Icon } from "@iconify/react";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { useMultipreciosStore } from "../store/MultipreciosStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { Spinner1 } from "../index";
import { ObtenerProductosConMultiprecios } from "../supabase/crudMultiprecios";

export function Multiprecios() {
  const queryClient = useQueryClient();
  const { dataempresa } = useEmpresaStore();
  const {
    plantillasPrecios,
    obtenerMultipreciosProducto,
    insertarMultiprecio,
    editarMultiprecio,
    eliminarMultiprecio,
    calcularDescuento,
  } = useMultipreciosStore();

  const [modalConfig, setModalConfig] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [precios, setPrecios] = useState([]);
  const [preciosOriginales, setPreciosOriginales] = useState([]);
  const [preciosEliminados, setPreciosEliminados] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const [nuevoNivel, setNuevoNivel] = useState({
    nombre: "",
    cantidad_minima: 1,
    cantidad_maxima: null,
    precio_venta: 0,
  });
  const [busqueda, setBusqueda] = useState("");

  // Query para obtener productos con multiprecios
  const { data: productosConMultiprecios = [], isLoading } = useQuery({
    queryKey: ["productos-multiprecios", dataempresa?.id],
    queryFn: () => ObtenerProductosConMultiprecios({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  // Filtrar productos
  const productosFiltrados = busqueda
    ? productosConMultiprecios.filter((p) =>
        (p.nombre || p.descripcion || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigo_barras || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : productosConMultiprecios;

  const handleSeleccionarProducto = async (producto) => {
    setProductoActual(producto);
    setPrecios([]);
    setPreciosOriginales([]);
    setPreciosEliminados([]);
    setModalConfig(true);
    setCargandoPrecios(true);
    
    const data = await obtenerMultipreciosProducto({ id_producto: producto.id });
    const preciosActivos = (data || []).filter(p => p.activo !== false);
    setPrecios(preciosActivos);
    setPreciosOriginales(preciosActivos);
    setCargandoPrecios(false);
  };

  const handleAgregarNivel = () => {
    if (!nuevoNivel.nombre.trim()) {
      toast.error("Ingresa un nombre para el nivel");
      return;
    }
    if (!nuevoNivel.precio_venta || nuevoNivel.precio_venta <= 0) {
      toast.error("Ingresa un precio válido");
      return;
    }
    
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
    toast.success("Nivel agregado");
  };

  const handleAplicarPlantilla = (plantilla) => {
    if (!productoActual) return;
    
    const precioBase = productoActual.precio_venta;
    const nuevosPrecios = plantilla.niveles.map((nivel, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      nombre: nivel.nombre,
      cantidad_minima: nivel.cantidad_minima,
      cantidad_maxima: nivel.cantidad_maxima,
      precio_venta: parseFloat((precioBase * (1 - nivel.descuento / 100)).toFixed(2)),
      isNew: true,
    }));
    
    // Marcar precios actuales para eliminar
    setPreciosEliminados([...preciosEliminados, ...precios.filter(p => !p.isNew)]);
    setPrecios(nuevosPrecios);
    toast.success(`Plantilla "${plantilla.nombre}" aplicada`);
  };

  const handleGuardarPrecios = async () => {
    setGuardando(true);
    let exitosos = 0;
    let errores = 0;

    try {
      // 1. Eliminar precios que fueron removidos
      for (const precio of preciosEliminados) {
        if (precio.id && !String(precio.id).startsWith('temp-')) {
          const resultado = await eliminarMultiprecio({ id: precio.id });
          if (!resultado.exito) errores++;
        }
      }

      // 2. Procesar precios actuales
      for (const precio of precios) {
        if (precio.isNew) {
          // Insertar nuevos
          const resultado = await insertarMultiprecio({
            id_producto: productoActual.id,
            id_empresa: dataempresa?.id,
            nombre: precio.nombre,
            cantidad_minima: precio.cantidad_minima,
            cantidad_maxima: precio.cantidad_maxima,
            precio_venta: precio.precio_venta,
          });
          if (resultado.exito) exitosos++;
          else errores++;
        } else if (precio.isModified) {
          // Actualizar modificados
          const resultado = await editarMultiprecio({
            id: precio.id,
            nombre: precio.nombre,
            cantidad_minima: precio.cantidad_minima,
            cantidad_maxima: precio.cantidad_maxima,
            precio_venta: precio.precio_venta,
          });
          if (resultado.exito) exitosos++;
          else errores++;
        }
      }

      if (errores === 0) {
        toast.success("Configuración guardada correctamente");
      } else {
        toast.warning(`Guardado con ${errores} errores`);
      }
      
      setModalConfig(false);
      setPreciosEliminados([]);
      queryClient.invalidateQueries(["productos-multiprecios"]);
    } catch (error) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarNivel = async (precio, idx) => {
    if (precio.isNew) {
      // Si es nuevo, solo quitar de la lista
      setPrecios(precios.filter((_, i) => i !== idx));
    } else {
      // Si existe en BD, confirmar y marcar para eliminar
      const result = await Swal.fire({
        title: "¿Eliminar nivel de precio?",
        html: `<p style="color: #6b7280;">Se eliminará <strong style="color: #111827;">${precio.nombre}</strong></p>`,
        icon: "warning",
        iconColor: "#111827",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        customClass: {
          popup: 'swal2-popup-neutral',
          title: 'swal2-title-neutral',
          confirmButton: 'swal2-confirm-danger-neutral',
          cancelButton: 'swal2-cancel-neutral',
        },
        buttonsStyling: false,
      });

      if (result.isConfirmed) {
        setPreciosEliminados([...preciosEliminados, precio]);
        setPrecios(precios.filter((_, i) => i !== idx));
        toast.success("Nivel marcado para eliminar");
      }
    }
  };

  const handleModificarPrecio = (idx, campo, valor) => {
    const nuevosPrecios = [...precios];
    nuevosPrecios[idx] = {
      ...nuevosPrecios[idx],
      [campo]: valor,
      isModified: !nuevosPrecios[idx].isNew,
    };
    setPrecios(nuevosPrecios);
  };

  if (isLoading) return <Spinner1 />;

  return (
    <Container>
      <Toaster position="top-center" richColors />

      {/* Modal Configuración de Precios */}
      {modalConfig && productoActual && (
        <ModalOverlay onClick={() => !guardando && setModalConfig(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <ModalTitle>Configurar Multi-Precios</ModalTitle>
                <ModalSubtitle>{productoActual.nombre || productoActual.descripcion}</ModalSubtitle>
                <PrecioBase>Precio base: S/ {productoActual.precio_venta?.toFixed(2)}</PrecioBase>
              </div>
              <CloseButton onClick={() => !guardando && setModalConfig(false)} disabled={guardando}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>

            {cargandoPrecios && <ProgressBar />}

            <ModalBody>
              {cargandoPrecios ? (
                <LoadingPlaceholder>
                  <Icon icon="lucide:loader-2" className="spin" />
                  <span>Cargando precios...</span>
                </LoadingPlaceholder>
              ) : (
                <>
                  {/* Plantillas rápidas */}
                  <Section>
                    <SectionTitle>
                      <Icon icon="lucide:zap" />
                      Plantillas Rápidas
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
                      Niveles de Precio ({precios.length})
                    </SectionTitle>
                    
                    {precios.length > 0 ? (
                      <PreciosList>
                        {precios.map((precio, idx) => (
                          <PrecioItem key={precio.id} $isNew={precio.isNew} $isModified={precio.isModified}>
                            <PrecioInfo>
                              <PrecioInputGroup>
                                <SmallInput
                                  type="text"
                                  value={precio.nombre}
                                  onChange={(e) => handleModificarPrecio(idx, 'nombre', e.target.value)}
                                  placeholder="Nombre"
                                />
                              </PrecioInputGroup>
                              <PrecioCantidad>
                                <SmallInput
                                  type="number"
                                  value={precio.cantidad_minima}
                                  onChange={(e) => handleModificarPrecio(idx, 'cantidad_minima', parseInt(e.target.value) || 1)}
                                  style={{ width: 60 }}
                                />
                                <span>-</span>
                                <SmallInput
                                  type="number"
                                  value={precio.cantidad_maxima || ""}
                                  onChange={(e) => handleModificarPrecio(idx, 'cantidad_maxima', e.target.value ? parseInt(e.target.value) : null)}
                                  placeholder="∞"
                                  style={{ width: 60 }}
                                />
                                <span>uds</span>
                              </PrecioCantidad>
                            </PrecioInfo>
                            <PrecioValor>
                              <PrecioInputWrapper>
                                <span>S/</span>
                                <SmallInput
                                  type="number"
                                  step="0.01"
                                  value={precio.precio_venta}
                                  onChange={(e) => handleModificarPrecio(idx, 'precio_venta', parseFloat(e.target.value) || 0)}
                                  style={{ width: 80 }}
                                />
                              </PrecioInputWrapper>
                              <DescuentoBadge>
                                -{calcularDescuento(productoActual.precio_venta, precio.precio_venta).toFixed(0)}%
                              </DescuentoBadge>
                            </PrecioValor>
                            <DeleteButton onClick={() => handleEliminarNivel(precio, idx)}>
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
                      <BtnSecondary type="button" onClick={handleAgregarNivel}>
                        <Icon icon="lucide:plus" />
                        Agregar Nivel
                      </BtnSecondary>
                    </NuevoNivelForm>
                  </Section>
                </>
              )}
            </ModalBody>

            <ModalFooter>
              <BtnSecondary onClick={() => setModalConfig(false)} disabled={guardando}>
                Cancelar
              </BtnSecondary>
              <BtnPrimary onClick={handleGuardarPrecios} disabled={guardando || cargandoPrecios}>
                {guardando ? (
                  <>
                    <Icon icon="lucide:loader-2" className="spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:save" />
                    Guardar Configuración
                  </>
                )}
              </BtnPrimary>
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
          <HeaderInfo>
            <Title>Multi-Precios</Title>
            <Subtitle>
              {productosConMultiprecios.length} productos con precios escalonados
            </Subtitle>
          </HeaderInfo>
        </HeaderLeft>
        <HeaderRight>
          <SearchWrapper>
            <SearchIcon>
              <Icon icon="lucide:search" />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </SearchWrapper>
        </HeaderRight>
      </Header>

      {/* Content */}
      <ContentCard>
        {productosFiltrados.length > 0 ? (
          <ProductosList>
            {productosFiltrados.map((producto) => (
              <ProductoCard key={producto.id}>
                <ProductoIcon>
                  <Icon icon="lucide:package" />
                </ProductoIcon>
                <ProductoInfo>
                  <ProductoNombre>{producto.nombre || producto.descripcion}</ProductoNombre>
                  <ProductoDetalles>
                    <span>SKU: {producto.codigo_barras || "N/A"}</span>
                    <span>Precio: S/ {producto.precio_venta?.toFixed(2)}</span>
                  </ProductoDetalles>
                </ProductoInfo>
                <BtnSecondary onClick={() => handleSeleccionarProducto(producto)}>
                  <Icon icon="lucide:settings" />
                  Configurar
                </BtnSecondary>
              </ProductoCard>
            ))}
          </ProductosList>
        ) : (
          <EmptyState>
            <Icon icon="lucide:package-x" />
            <h3>No hay productos con multi-precio</h3>
            <p>
              Para usar esta función, activa "Maneja multi-precios" en los
              productos desde el módulo de Productos.
            </p>
          </EmptyState>
        )}
      </ContentCard>
    </Container>
  );
}

// Animations
const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
`;

// Styled Components
const Container = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: #f9fafb;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 24px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #111827;
  border-radius: 12px;
  
  svg {
    font-size: 24px;
    color: #fff;
  }
`;

const HeaderInfo = styled.div``;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
`;

const Subtitle = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
`;

const SearchWrapper = styled.div`
  position: relative;
  width: 280px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 18px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.15s;

  &:focus {
    outline: none;
    border-color: #111827;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1);
  }
`;

const ContentCard = styled.div`
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 24px;
`;

const ProductosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProductoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.15s;

  &:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }
`;

const ProductoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #f3f4f6;
  border-radius: 10px;

  svg {
    font-size: 20px;
    color: #6b7280;
  }
`;

const ProductoInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProductoNombre = styled.h3`
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
`;

const ProductoDetalles = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;

  svg {
    font-size: 48px;
    color: #d1d5db;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 500;
    color: #374151;
  }

  p {
    margin: 0 auto;
    max-width: 360px;
    font-size: 13px;
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
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const ModalSubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const PrecioBase = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 3px;
  background: #e5e7eb;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 25%;
    height: 100%;
    background: #111827;
    animation: ${progressAnimation} 1s ease-in-out infinite;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const LoadingPlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  color: #6b7280;
  font-size: 13px;

  svg {
    font-size: 18px;
  }

  .spin {
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
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
  font-size: 13px;
  font-weight: 600;
  color: #374151;

  svg {
    font-size: 16px;
    color: #6b7280;
  }
`;

const PlantillasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
`;

const PlantillaCard = styled.div`
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #111827;
    background: #f9fafb;
  }

  h4 {
    margin: 0 0 4px;
    font-size: 13px;
    font-weight: 500;
    color: #111827;
  }

  p {
    margin: 0;
    font-size: 11px;
    color: #6b7280;
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
  gap: 12px;
  padding: 12px;
  background: ${props => props.$isNew ? '#f0fdf4' : props.$isModified ? '#fef3c7' : '#f9fafb'};
  border: 1px solid ${props => props.$isNew ? '#bbf7d0' : props.$isModified ? '#fcd34d' : '#e5e7eb'};
  border-radius: 8px;
`;

const PrecioInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PrecioInputGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const PrecioCantidad = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
`;

const SmallInput = styled.input`
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.15s;

  &:focus {
    outline: none;
    border-color: #111827;
  }
`;

const PrecioValor = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PrecioInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #111827;
`;

const DescuentoBadge = styled.span`
  padding: 3px 8px;
  background: #111827;
  color: #fff;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;

  svg { font-size: 14px; }

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
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 13px;

  svg { font-size: 16px; }
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
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.15s;

  &:focus {
    outline: none;
    border-color: #111827;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1);
  }
`;

const BtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 16px; }

  .spin {
    animation: ${spinAnimation} 1s linear infinite;
  }

  &:hover:not(:disabled) {
    background: #1f2937;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const BtnSecondary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  background: #fff;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 16px; }

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
