import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useTransferenciasStore } from "../store/TransferenciasStore";
import {
  ConsultarTransferencias,
  EstadisticasTransferencias,
  ObtenerDetalleTransferencia,
} from "../supabase/crudTransferencias";
import { MostrarAlmacenesXEmpresa } from "../supabase/crudAlmacenes";
import { MostrarProductosConStockEnAlmacen } from "../supabase/crudStock";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useMemo } from "react";
import Swal from "sweetalert2";
import { toast, Toaster } from "sonner";

// Mapeo de estados
const estadoNombres = {
  pendiente: "Pendiente",
  en_transito: "En tránsito",
  completada: "Completada",
  cancelada: "Cancelada",
  parcial: "Parcial",
};

export function Transferencias() {
  const { dataempresa } = useEmpresaStore();
  const { datausuarios } = useUsuariosStore();
  const {
    crearTransferencia,
    enviarTransferencia,
    recibirTransferencia,
    cancelarTransferencia,
  } = useTransferenciasStore();

  // Query para almacenes de la empresa (aplanando la estructura)
  const { data: sucursalesConAlmacenes = [] } = useQuery({
    queryKey: ["almacenes-empresa", dataempresa?.id],
    queryFn: () => MostrarAlmacenesXEmpresa({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
  });

  // Form para nueva transferencia (movido arriba para usar en query)
  const [formData, setFormData] = useState({
    id_almacen_origen: "",
    id_almacen_destino: "",
    notas: "",
    productos: [],
  });

  // Query para productos con stock en el almacén origen seleccionado
  const { data: productosConStock = [], isLoading: loadingProductos } = useQuery({
    queryKey: ["productos-stock-almacen", formData.id_almacen_origen],
    queryFn: () => MostrarProductosConStockEnAlmacen({ id_almacen: parseInt(formData.id_almacen_origen) }),
    enabled: !!formData.id_almacen_origen,
  });

  // Aplanar almacenes de todas las sucursales
  const almacenes = useMemo(() => {
    if (!sucursalesConAlmacenes || sucursalesConAlmacenes.length === 0) return [];
    
    return sucursalesConAlmacenes.flatMap((sucursal) =>
      (sucursal.almacen || []).map((alm) => ({
        ...alm,
        sucursal_nombre: sucursal.nombre,
      }))
    );
  }, [sucursalesConAlmacenes]);

  // Estado del modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [transferenciaDetalle, setTransferenciaDetalle] = useState(null);
  const [detalleProductos, setDetalleProductos] = useState([]);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Producto a agregar
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState(1);

  // Query para transferencias
  const { data: transferencias = [], isLoading, refetch } = useQuery({
    queryKey: ["transferencias", dataempresa?.id],
    queryFn: () => ConsultarTransferencias({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
  });

  // Query para estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ["estadisticas-transferencias", dataempresa?.id],
    queryFn: () => EstadisticasTransferencias({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
  });

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!transferencias || transferencias.length === 0) return [];

    return transferencias.filter((item) => {
      const matchEstado = filtroEstado === "todos" || item.estado === filtroEstado;
      const matchBusqueda =
        !busqueda ||
        item.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.nombre_almacen_origen?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.nombre_almacen_destino?.toLowerCase().includes(busqueda.toLowerCase());

      return matchEstado && matchBusqueda;
    });
  }, [transferencias, filtroEstado, busqueda]);

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Agregar producto al form
  const agregarProducto = () => {
    if (!productoSeleccionado || cantidadProducto <= 0) return;

    const producto = productosConStock?.find((p) => p.id === parseInt(productoSeleccionado));
    if (!producto) return;

    // Verificar si ya existe
    const existe = formData.productos.find((p) => p.id_producto === producto.id);
    if (existe) {
      toast.warning("Este producto ya está en la lista");
      return;
    }

    // Verificar que la cantidad no exceda el stock disponible
    if (parseFloat(cantidadProducto) > producto.stock_disponible) {
      toast.error(`Stock insuficiente. Disponible: ${producto.stock_disponible}`);
      return;
    }

    setFormData({
      ...formData,
      productos: [
        ...formData.productos,
        {
          id_producto: producto.id,
          nombre: producto.nombre,
          cantidad: parseFloat(cantidadProducto),
          stock_disponible: producto.stock_disponible,
        },
      ],
    });

    setProductoSeleccionado("");
    setCantidadProducto(1);
  };

  // Quitar producto del form
  const quitarProducto = (id_producto) => {
    setFormData({
      ...formData,
      productos: formData.productos.filter((p) => p.id_producto !== id_producto),
    });
  };

  // Crear transferencia
  const handleCrearTransferencia = async () => {
    if (!formData.id_almacen_origen || !formData.id_almacen_destino) {
      toast.warning("Selecciona almacén origen y destino");
      return;
    }

    if (formData.productos.length === 0) {
      toast.warning("Agrega al menos un producto");
      return;
    }

    try {
      const resultado = await crearTransferencia({
        id_almacen_origen: parseInt(formData.id_almacen_origen),
        id_almacen_destino: parseInt(formData.id_almacen_destino),
        id_usuario: datausuarios?.id,
        id_empresa: dataempresa?.id,
        productos: formData.productos.map((p) => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
        })),
        notas: formData.notas || null,
      });

      // Mapeo de respuesta del backend
      if (resultado?.exito === true) {
        const codigo = resultado.codigo || resultado.data?.codigo || "";
        toast.success(
          resultado.mensaje || `Transferencia ${codigo} creada correctamente`
        );
        setModalAbierto(false);
        setFormData({
          id_almacen_origen: "",
          id_almacen_destino: "",
          notas: "",
          productos: [],
        });
        refetch();
      } else if (resultado?.exito === false) {
        // Si hay productos sin stock, mostrar detalle en toast
        if (resultado.productos_sin_stock && resultado.productos_sin_stock.length > 0) {
          const productosDetalle = resultado.productos_sin_stock
            .map(p => `${p.producto}: disponible ${p.stock_disponible}, solicitado ${p.cantidad_solicitada}`)
            .join(" | ");
          
          toast.error(`${resultado.mensaje}: ${productosDetalle}`, { duration: 6000 });
        } else {
          toast.error(resultado.mensaje || "Error al crear la transferencia", { duration: 6000 });
        }
      } else {
        // Respuesta inesperada pero posiblemente exitosa (sin estructura estándar)
        toast.success("Transferencia creada correctamente");
        setModalAbierto(false);
        setFormData({
          id_almacen_origen: "",
          id_almacen_destino: "",
          notas: "",
          productos: [],
        });
        refetch();
      }
    } catch (error) {
      // Mapeo de errores del backend
      const mensajeError = error?.message || error?.response?.data?.mensaje || "Error inesperado al crear la transferencia";
      toast.error(mensajeError);
    }
  };

  // Ver detalle
  const handleVerDetalle = async (transferencia) => {
    try {
      const detalle = await ObtenerDetalleTransferencia({ id_transferencia: transferencia.id });
      setTransferenciaDetalle(transferencia);
      setDetalleProductos(detalle);
      setModalDetalle(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Enviar transferencia
  const handleEnviar = async (transferencia) => {
    const result = await Swal.fire({
      title: "¿Enviar transferencia?",
      html: `<p style="color: #6b7280; margin-bottom: 8px;">Se descontará el stock del almacén origen.</p><p style="font-weight: 600; color: #111827;">${transferencia.codigo}</p>`,
      icon: "question",
      iconColor: "#111827",
      showCancelButton: true,
      confirmButtonText: "Sí, enviar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: 'swal2-popup-neutral',
        title: 'swal2-title-neutral',
        confirmButton: 'swal2-confirm-neutral',
        cancelButton: 'swal2-cancel-neutral',
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      try {
        const resultado = await enviarTransferencia({
          id_transferencia: transferencia.id,
          id_usuario: datausuarios?.id,
        });

        // Mapeo de respuesta del backend
        if (resultado?.exito === true) {
          toast.success(resultado.mensaje || "Transferencia enviada correctamente");
          refetch();
        } else if (resultado?.exito === false) {
          toast.error(resultado.mensaje || "Error al enviar la transferencia");
        } else {
          toast.success("Transferencia enviada correctamente");
          refetch();
        }
      } catch (error) {
        const mensajeError = error?.message || "Error inesperado al enviar la transferencia";
        toast.error(mensajeError);
      }
    }
  };

  // Recibir transferencia
  const handleRecibir = async (transferencia) => {
    const result = await Swal.fire({
      title: "¿Confirmar recepción?",
      html: `<p style="color: #6b7280; margin-bottom: 8px;">Se agregará el stock al almacén destino.</p><p style="font-weight: 600; color: #111827;">${transferencia.codigo}</p>`,
      icon: "question",
      iconColor: "#111827",
      showCancelButton: true,
      confirmButtonText: "Sí, confirmar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: 'swal2-popup-neutral',
        title: 'swal2-title-neutral',
        confirmButton: 'swal2-confirm-neutral',
        cancelButton: 'swal2-cancel-neutral',
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      try {
        const resultado = await recibirTransferencia({
          id_transferencia: transferencia.id,
          id_usuario: datausuarios?.id,
        });

        // Mapeo de respuesta del backend
        if (resultado?.exito === true) {
          toast.success(resultado.mensaje || "Transferencia recibida correctamente");
          refetch();
        } else if (resultado?.exito === false) {
          toast.error(resultado.mensaje || "Error al recibir la transferencia");
        } else {
          toast.success("Transferencia recibida correctamente");
          refetch();
        }
      } catch (error) {
        const mensajeError = error?.message || "Error inesperado al recibir la transferencia";
        toast.error(mensajeError);
      }
    }
  };

  // Cancelar transferencia
  const handleCancelar = async (transferencia) => {
    const { value: motivo } = await Swal.fire({
      title: "Cancelar transferencia",
      input: "textarea",
      inputLabel: "Motivo de cancelación (opcional)",
      inputPlaceholder: "Escribe el motivo...",
      showCancelButton: true,
      confirmButtonText: "Cancelar transferencia",
      cancelButtonText: "Volver",
      customClass: {
        popup: 'swal2-popup-neutral',
        title: 'swal2-title-neutral',
        input: 'swal2-input-neutral',
        inputLabel: 'swal2-inputLabel-neutral',
        confirmButton: 'swal2-confirm-danger-neutral',
        cancelButton: 'swal2-cancel-neutral',
      },
      buttonsStyling: false,
    });

    if (motivo !== undefined) {
      try {
        const resultado = await cancelarTransferencia({
          id_transferencia: transferencia.id,
          id_usuario: datausuarios?.id,
          motivo: motivo || null,
        });

        // Mapeo de respuesta del backend
        if (resultado?.exito === true) {
          toast.success(resultado.mensaje || "Transferencia cancelada correctamente");
          refetch();
        } else if (resultado?.exito === false) {
          toast.error(resultado.mensaje || "Error al cancelar la transferencia");
        } else {
          toast.success("Transferencia cancelada correctamente");
          refetch();
        }
      } catch (error) {
        const mensajeError = error?.message || "Error inesperado al cancelar la transferencia";
        toast.error(mensajeError);
      }
    }
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <Icon icon="lucide:loader-2" className="spin" />
          <span>Cargando transferencias...</span>
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Toaster position="top-right" richColors />
      {/* Header */}
      <Header>
        <HeaderIcon>
          <Icon icon="lucide:arrow-left-right" />
        </HeaderIcon>
        <HeaderContent>
          <h1>Transferencias entre Almacenes</h1>
          <p>Gestiona el movimiento de productos entre tus almacenes</p>
        </HeaderContent>
        <HeaderActions>
          <NuevaBtn onClick={() => setModalAbierto(true)}>
            <Icon icon="lucide:plus" />
            Nueva Transferencia
          </NuevaBtn>
        </HeaderActions>
      </Header>

      {/* Estadísticas */}
      <StatsGrid>
        <StatCard>
          <StatIcon $color="#3b82f6">
            <Icon icon="lucide:package" />
          </StatIcon>
          <StatInfo>
            <StatValue>{estadisticas?.total_transferencias || 0}</StatValue>
            <StatLabel>Total</StatLabel>
          </StatInfo>
        </StatCard>
        <StatCard>
          <StatIcon $color="#f59e0b">
            <Icon icon="lucide:clock" />
          </StatIcon>
          <StatInfo>
            <StatValue>{estadisticas?.pendientes || 0}</StatValue>
            <StatLabel>Pendientes</StatLabel>
          </StatInfo>
        </StatCard>
        <StatCard>
          <StatIcon $color="#3b82f6">
            <Icon icon="lucide:truck" />
          </StatIcon>
          <StatInfo>
            <StatValue>{estadisticas?.en_transito || 0}</StatValue>
            <StatLabel>En tránsito</StatLabel>
          </StatInfo>
        </StatCard>
        <StatCard>
          <StatIcon $color="#22c55e">
            <Icon icon="lucide:check-circle" />
          </StatIcon>
          <StatInfo>
            <StatValue>{estadisticas?.completadas || 0}</StatValue>
            <StatLabel>Completadas</StatLabel>
          </StatInfo>
        </StatCard>
      </StatsGrid>

      {/* Filtros */}
      <FiltersBar>
        <SearchBox>
          <Icon icon="lucide:search" />
          <input
            type="text"
            placeholder="Buscar transferencia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </SearchBox>

        <FilterGroup>
          <FilterSelect
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            {Object.entries(estadoNombres).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
        </FilterGroup>
      </FiltersBar>

      {/* Lista de transferencias */}
      {filteredData.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <Icon icon="lucide:arrow-left-right" />
          </EmptyIcon>
          <EmptyTitle>No hay transferencias</EmptyTitle>
          <EmptyText>
            Crea una nueva transferencia para mover productos entre almacenes
          </EmptyText>
        </EmptyState>
      ) : (
        <TransferenciasList>
          {filteredData.map((item) => (
            <TransferenciaCard key={item.id}>
              <CardHeader>
                <CardCodigo>
                  <Icon icon="lucide:hash" />
                  {item.codigo}
                </CardCodigo>
                <EstadoBadge $color={item.color_estado}>
                  <Icon icon={item.icono_estado} width="14" />
                  {estadoNombres[item.estado]}
                </EstadoBadge>
              </CardHeader>

              <CardBody>
                <AlmacenesFlow>
                  <AlmacenBox>
                    <AlmacenLabel>Origen</AlmacenLabel>
                    <AlmacenNombre>{item.nombre_almacen_origen}</AlmacenNombre>
                    <AlmacenSucursal>{item.nombre_sucursal_origen}</AlmacenSucursal>
                  </AlmacenBox>
                  <FlowArrow>
                    <Icon icon="lucide:arrow-right" />
                  </FlowArrow>
                  <AlmacenBox>
                    <AlmacenLabel>Destino</AlmacenLabel>
                    <AlmacenNombre>{item.nombre_almacen_destino}</AlmacenNombre>
                    <AlmacenSucursal>{item.nombre_sucursal_destino}</AlmacenSucursal>
                  </AlmacenBox>
                </AlmacenesFlow>

                <CardMeta>
                  <MetaItem>
                    <Icon icon="lucide:box" width="14" />
                    {item.total_productos} productos
                  </MetaItem>
                  <MetaItem>
                    <Icon icon="lucide:layers" width="14" />
                    {item.total_items} unidades
                  </MetaItem>
                  <MetaItem>
                    <Icon icon="lucide:calendar" width="14" />
                    {formatearFecha(item.fecha_creacion)}
                  </MetaItem>
                </CardMeta>
              </CardBody>

              <CardFooter>
                <ActionBtn onClick={() => handleVerDetalle(item)}>
                  <Icon icon="lucide:eye" />
                  Ver detalle
                </ActionBtn>

                {item.estado === "pendiente" && (
                  <>
                    <ActionBtn $primary onClick={() => handleEnviar(item)}>
                      <Icon icon="lucide:send" />
                      Enviar
                    </ActionBtn>
                    <ActionBtn $danger onClick={() => handleCancelar(item)}>
                      <Icon icon="lucide:x" />
                      Cancelar
                    </ActionBtn>
                  </>
                )}

                {item.estado === "en_transito" && (
                  <>
                    <ActionBtn $success onClick={() => handleRecibir(item)}>
                      <Icon icon="lucide:check" />
                      Recibir
                    </ActionBtn>
                    <ActionBtn $danger onClick={() => handleCancelar(item)}>
                      <Icon icon="lucide:x" />
                      Cancelar
                    </ActionBtn>
                  </>
                )}
              </CardFooter>
            </TransferenciaCard>
          ))}
        </TransferenciasList>
      )}

      {/* Modal Nueva Transferencia */}
      {modalAbierto && (
        <ModalOverlay onClick={() => setModalAbierto(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalHeaderIcon>
                <Icon icon="lucide:arrow-left-right" />
              </ModalHeaderIcon>
              <ModalHeaderText>
                <h2>Nueva Transferencia</h2>
                <p>Mueve productos entre tus almacenes</p>
              </ModalHeaderText>
              <CloseBtn onClick={() => setModalAbierto(false)}>
                <Icon icon="lucide:x" />
              </CloseBtn>
            </ModalHeader>

            <ModalBody>
              {/* Sección Almacenes */}
              <SectionTitle>
                <Icon icon="lucide:warehouse" />
                <span>Seleccionar Almacenes</span>
              </SectionTitle>
              
              <AlmacenesSelector>
                <AlmacenSelectorBox>
                  <AlmacenSelectorLabel>
                    <Icon icon="lucide:log-out" />
                    Almacén Origen
                  </AlmacenSelectorLabel>
                  <FormSelect
                    value={formData.id_almacen_origen}
                    onChange={(e) => {
                      // Limpiar productos al cambiar almacén origen
                      setFormData({ 
                        ...formData, 
                        id_almacen_origen: e.target.value,
                        productos: [] 
                      });
                      setProductoSeleccionado("");
                    }}
                  >
                    <option value="">Seleccionar almacén...</option>
                    {almacenes?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} - {a.sucursal_nombre}
                      </option>
                    ))}
                  </FormSelect>
                </AlmacenSelectorBox>

                <TransferArrow>
                  <Icon icon="lucide:arrow-right" />
                </TransferArrow>

                <AlmacenSelectorBox>
                  <AlmacenSelectorLabel>
                    <Icon icon="lucide:log-in" />
                    Almacén Destino
                  </AlmacenSelectorLabel>
                  <FormSelect
                    value={formData.id_almacen_destino}
                    onChange={(e) =>
                      setFormData({ ...formData, id_almacen_destino: e.target.value })
                    }
                  >
                    <option value="">Seleccionar almacén...</option>
                    {almacenes
                      ?.filter((a) => a.id !== parseInt(formData.id_almacen_origen))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} - {a.sucursal_nombre}
                        </option>
                      ))}
                  </FormSelect>
                </AlmacenSelectorBox>
              </AlmacenesSelector>

              <Divider />

              {/* Sección Productos */}
              <SectionTitle>
                <Icon icon="lucide:package" />
                <span>Agregar Productos</span>
              </SectionTitle>

              <ProductoAddRow>
                <ProductoSelectWrapper>
                  <FormSelect
                    value={productoSeleccionado}
                    onChange={(e) => setProductoSeleccionado(e.target.value)}
                    disabled={!formData.id_almacen_origen}
                  >
                    <option value="">
                      {!formData.id_almacen_origen 
                        ? "Selecciona almacén origen primero..." 
                        : loadingProductos 
                          ? "Cargando productos..." 
                          : productosConStock.length === 0 
                            ? "Sin productos con stock" 
                            : "Buscar producto..."}
                    </option>
                    {productosConStock?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Stock: {p.stock_disponible})
                      </option>
                    ))}
                  </FormSelect>
                </ProductoSelectWrapper>
                <CantidadInput
                  type="number"
                  min="1"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(e.target.value)}
                  placeholder="Cantidad"
                />
                <AddProductoBtn type="button" onClick={agregarProducto}>
                  <Icon icon="lucide:plus" />
                  Agregar
                </AddProductoBtn>
              </ProductoAddRow>

              {formData.productos.length > 0 ? (
                <ProductosListContainer>
                  <ProductosListHeader>
                    <span>Producto</span>
                    <span>Cantidad</span>
                    <span></span>
                  </ProductosListHeader>
                  {formData.productos.map((p, index) => (
                    <ProductoItemRow key={p.id_producto}>
                      <ProductoItemInfo>
                        <ProductoItemNumber>{index + 1}</ProductoItemNumber>
                        <ProductoItemName>{p.nombre}</ProductoItemName>
                      </ProductoItemInfo>
                      <ProductoItemQty>{p.cantidad} unid.</ProductoItemQty>
                      <RemoveBtn onClick={() => quitarProducto(p.id_producto)}>
                        <Icon icon="lucide:trash-2" />
                      </RemoveBtn>
                    </ProductoItemRow>
                  ))}
                  <ProductosTotal>
                    <span>Total de productos:</span>
                    <strong>{formData.productos.length}</strong>
                  </ProductosTotal>
                </ProductosListContainer>
              ) : (
                <EmptyProductos>
                  <Icon icon="lucide:package-open" />
                  <span>No hay productos agregados</span>
                </EmptyProductos>
              )}

              <Divider />

              {/* Sección Notas */}
              <SectionTitle>
                <Icon icon="lucide:file-text" />
                <span>Notas (opcional)</span>
              </SectionTitle>
              
              <FormTextarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Escribe observaciones o comentarios adicionales sobre esta transferencia..."
                rows={3}
              />
            </ModalBody>

            <ModalFooter>
              <CancelBtn onClick={() => setModalAbierto(false)}>
                <Icon icon="lucide:x" />
                Cancelar
              </CancelBtn>
              <SubmitBtn onClick={handleCrearTransferencia} disabled={formData.productos.length === 0}>
                <Icon icon="lucide:send" />
                Crear Transferencia
              </SubmitBtn>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal Detalle */}
      {modalDetalle && transferenciaDetalle && (
        <ModalOverlay onClick={() => setModalDetalle(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalHeaderIcon>
                <Icon icon="lucide:file-search" />
              </ModalHeaderIcon>
              <ModalHeaderText>
                <h2>{transferenciaDetalle.codigo}</h2>
                <p>Detalle de transferencia</p>
              </ModalHeaderText>
              <CloseBtn onClick={() => setModalDetalle(false)}>
                <Icon icon="lucide:x" />
              </CloseBtn>
            </ModalHeader>

            <ModalBody>
              <SectionTitle>
                <Icon icon="lucide:info" />
                <span>Información General</span>
              </SectionTitle>
              
              <DetalleInfo>
                <DetalleRow>
                  <DetalleLabel>
                    <Icon icon="lucide:flag" />
                    Estado
                  </DetalleLabel>
                  <EstadoBadge $color={transferenciaDetalle.color_estado}>
                    {estadoNombres[transferenciaDetalle.estado]}
                  </EstadoBadge>
                </DetalleRow>
                <DetalleRow>
                  <DetalleLabel>
                    <Icon icon="lucide:log-out" />
                    Almacén Origen
                  </DetalleLabel>
                  <DetalleValue>{transferenciaDetalle.nombre_almacen_origen}</DetalleValue>
                </DetalleRow>
                <DetalleRow>
                  <DetalleLabel>
                    <Icon icon="lucide:log-in" />
                    Almacén Destino
                  </DetalleLabel>
                  <DetalleValue>{transferenciaDetalle.nombre_almacen_destino}</DetalleValue>
                </DetalleRow>
                <DetalleRow>
                  <DetalleLabel>
                    <Icon icon="lucide:calendar" />
                    Fecha de Creación
                  </DetalleLabel>
                  <DetalleValue>{formatearFecha(transferenciaDetalle.fecha_creacion)}</DetalleValue>
                </DetalleRow>
              </DetalleInfo>

              <Divider />

              <SectionTitle>
                <Icon icon="lucide:package" />
                <span>Productos Transferidos ({detalleProductos.length})</span>
              </SectionTitle>
              
              <DetalleProductosList>
                <DetalleProductosHeader>
                  <span>Producto</span>
                  <span>Enviado</span>
                  <span>Recibido</span>
                </DetalleProductosHeader>
                {detalleProductos.map((p, index) => (
                  <DetalleProductoItem key={p.id}>
                    <ProductoNombre>
                      <ProductoItemNumber>{index + 1}</ProductoItemNumber>
                      {p.nombre_producto}
                    </ProductoNombre>
                    <ProductoCantidades>
                      <CantidadBadge $type="enviado">{p.cantidad_enviada}</CantidadBadge>
                      <CantidadBadge $type="recibido">{p.cantidad_recibida}</CantidadBadge>
                    </ProductoCantidades>
                  </DetalleProductoItem>
                ))}
              </DetalleProductosList>
            </ModalBody>

            <ModalFooter>
              <CancelBtn onClick={() => setModalDetalle(false)}>
                <Icon icon="lucide:x" />
                Cerrar
              </CancelBtn>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
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
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 24px;
    color: #374151;
  }
`;

const HeaderContent = styled.div`
  flex: 1;

  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 4px 0 0 0;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const NuevaBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #1f2937;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
`;

const StatIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 20px;
    color: #6b7280;
  }
`;

const StatInfo = styled.div``;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 4px;
`;

const FiltersBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;

  svg {
    color: #9ca3af;
    font-size: 16px;
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.875rem;
    color: #111827;
    outline: none;

    &::placeholder {
      color: #9ca3af;
    }
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.875rem;
  color: #111827;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: #111827;
  }
`;

const TransferenciasList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
`;

const TransferenciaCard = styled.div`
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
`;

const CardCodigo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;

  svg {
    color: #9ca3af;
  }
`;

const EstadoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: ${(props) => 
    props.$color === "#22c55e" ? "#ecfdf5" : 
    props.$color === "#f59e0b" ? "#fffbeb" : 
    props.$color === "#3b82f6" ? "#eff6ff" : 
    props.$color === "#ef4444" ? "#fef2f2" : "#f3f4f6"};
  color: ${(props) => 
    props.$color === "#22c55e" ? "#059669" : 
    props.$color === "#f59e0b" ? "#d97706" : 
    props.$color === "#3b82f6" ? "#2563eb" : 
    props.$color === "#ef4444" ? "#dc2626" : "#374151"};
`;

const CardBody = styled.div`
  padding: 16px;
`;

const AlmacenesFlow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const AlmacenBox = styled.div`
  flex: 1;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #f3f4f6;
`;

const AlmacenLabel = styled.div`
  font-size: 0.65rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
`;

const AlmacenNombre = styled.div`
  font-weight: 600;
  font-size: 0.8rem;
  color: #111827;
`;

const AlmacenSucursal = styled.div`
  font-size: 0.7rem;
  color: #6b7280;
`;

const FlowArrow = styled.div`
  color: #d1d5db;
  svg {
    font-size: 18px;
  }
`;

const CardMeta = styled.div`
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: #6b7280;

  svg {
    font-size: 14px;
  }
`;

const CardFooter = styled.div`
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  background: ${(props) =>
    props.$primary
      ? "#111827"
      : props.$success
      ? "#059669"
      : props.$danger
      ? "#dc2626"
      : "#fff"};
  color: ${(props) =>
    props.$primary || props.$success || props.$danger ? "#fff" : "#374151"};
  border-color: ${(props) =>
    props.$primary || props.$success || props.$danger ? "transparent" : "#e5e7eb"};

  &:hover {
    opacity: 0.9;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;

  svg {
    font-size: 28px;
    color: #9ca3af;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 6px 0;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  max-width: 280px;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: #6b7280;
  font-size: 0.875rem;

  .spin {
    animation: spin 1s linear infinite;
    font-size: 28px;
    color: #374151;
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

// Modal styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
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
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 16px 16px 0 0;
  position: relative;
`;

const ModalHeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 20px;
    color: #374151;
  }
`;

const ModalHeaderText = styled.div`
  flex: 1;

  h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #111827;
  }

  p {
    margin: 2px 0 0 0;
    font-size: 0.8rem;
    color: #6b7280;
  }
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }

  svg {
    font-size: 18px;
  }
`;

const ModalBody = styled.div`
  padding: 16px 20px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  background: #f8fafc;
  border-radius: 0 0 16px 16px;
  border-top: 1px solid #e2e8f0;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  color: #374151;

  svg {
    font-size: 16px;
    color: #6b7280;
  }
`;

const AlmacenesSelector = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 4px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const AlmacenSelectorBox = styled.div`
  flex: 1;
`;

const AlmacenSelectorLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 6px;

  svg {
    font-size: 14px;
  }
`;

const TransferArrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #9ca3af;
  margin-bottom: 2px;
  flex-shrink: 0;

  svg {
    font-size: 18px;
  }

  @media (max-width: 600px) {
    align-self: center;
    transform: rotate(90deg);
    margin: 6px 0;
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.8rem;
  color: #111827;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #111827;
  }

  &:hover:not(:focus) {
    border-color: #d1d5db;
  }

  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 0.8rem;
  color: #111827;
  resize: none;
  transition: all 0.2s;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #111827;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px dashed #e2e8f0;
  margin: 16px 0;
`;

const ProductoAddRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;

  @media (max-width: 500px) {
    flex-wrap: wrap;
  }
`;

const ProductoSelectWrapper = styled.div`
  flex: 1;
  min-width: 150px;
`;

const CantidadInput = styled.input`
  width: 70px;
  padding: 10px 8px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 0.8rem;
  color: #111827;
  text-align: center;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #111827;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const AddProductoBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #1f2937;
  }

  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  svg {
    font-size: 16px;
  }
`;

const ProductosListContainer = styled.div`
  background: #f9fafb;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
`;

const ProductosListHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 70px 32px;
  gap: 8px;
  padding: 8px 12px;
  background: #f3f4f6;
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProductoItemRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 70px 32px;
  gap: 8px;
  padding: 10px 12px;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;

  &:last-of-type {
    border-bottom: none;
  }
`;

const ProductoItemInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ProductoItemNumber = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  min-width: 16px;
`;

const ProductoItemName = styled.span`
  font-size: 0.8rem;
  color: #111827;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProductoItemQty = styled.span`
  font-size: 0.8rem;
  color: #374151;
  font-weight: 500;
  text-align: center;
`;

const ProductosTotal = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f3f4f6;
  font-size: 0.8rem;
  color: #6b7280;

  strong {
    color: #111827;
    font-size: 0.9rem;
  }
`;

const EmptyProductos = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px dashed #d1d5db;
  color: #9ca3af;
  gap: 8px;

  svg {
    font-size: 24px;
  }

  span {
    font-size: 0.8rem;
  }
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #fef2f2;
  }

  svg {
    font-size: 14px;
  }
`;

const CancelBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    color: #374151;
  }

  svg {
    font-size: 16px;
  }
`;

const SubmitBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #111827;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #1f2937;
  }

  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  svg {
    font-size: 16px;
  }
`;

// Detail modal styles
const DetalleInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
`;

const DetalleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const DetalleLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;

  svg {
    font-size: 16px;
    color: #9ca3af;
  }
`;

const DetalleValue = styled.strong`
  font-size: 0.9rem;
  color: #111827;
  font-weight: 600;
`;

const DetalleProductosList = styled.div`
  background: #f9fafb;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
`;

const DetalleProductosHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  gap: 12px;
  padding: 12px 16px;
  background: #f3f4f6;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;

  span:first-child {
    text-align: left;
  }
`;

const DetalleProductoItem = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;

  &:last-of-type {
    border-bottom: none;
  }
`;

const ProductoNombre = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  color: #111827;
  font-size: 0.875rem;
`;

const ProductoCantidades = styled.div`
  display: contents;
`;

const CantidadBadge = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ $type }) => ($type === "enviado" ? "#f3f4f6" : "#ecfdf5")};
  color: ${({ $type }) => ($type === "enviado" ? "#374151" : "#059669")};
`;

export default Transferencias;
