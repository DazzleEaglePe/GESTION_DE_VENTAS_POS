import styled from "styled-components";
import {
  useProductosStore,
  useVentasStore,
  useUsuariosStore,
  useEmpresaStore,
  useAlmacenesStore,
  useDetalleVentasStore,
} from "../../../index";
import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";

import { useFormattedDate } from "../../../hooks/useFormattedDate";
import { useCierreCajaStore } from "../../../store/CierreCajaStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { useStockStore } from "../../../store/StockStore";
import { useMostrarVentaPendienteQuery } from "../../../tanstack/VentasStack";
import { Reloj } from "../Reloj";
import { ModalProductoEspecial } from "./ModalProductoEspecial";
import { 
  VerificarCaracteristicasProducto,
  ObtenerPrecioSegunCantidad,
  ReservarSerialParaVenta
} from "../../../utils/POSHelpers";
import { Device } from "../../../styles/breakpoints";

export function HeaderPos() {
  const [cantidadInput, setCantidadInput] = useState(1);
  const [stateListaproductos, setStateListaproductos] = useState(false);
  // Estados para modal de productos especiales
  const [showModalEspecial, setShowModalEspecial] = useState(false);
  const [productoEspecialPendiente, setProductoEspecialPendiente] = useState(null);
  // Estado para indicar carga al agregar producto
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  const { setBuscador, dataProductos, selectProductos, buscador } =
    useProductosStore();
  
  const { datausuarios } = useUsuariosStore();
  const { dataStockXAlmacenesYProducto, setStateModal } = useStockStore();

  const { idventa, insertarVentas, resetState } = useVentasStore();

  const { dataempresa } = useEmpresaStore();
  const { dataCierreCaja } = useCierreCajaStore();
  const { almacenSelectItem, dataAlmacenesXsucursal } =
    useAlmacenesStore();
  const { insertarDetalleVentas } = useDetalleVentasStore();
  const queryClient = useQueryClient();

  const buscadorRef = useRef(null);
  const fechaactual = useFormattedDate();

  function focusclick() {
    buscadorRef.current.focus();
    buscadorRef.current.value.trim() === ""
      ? setStateListaproductos(false)
      : setStateListaproductos(true);
  }
  function buscar(e) {
    setBuscador(e.target.value);
    let texto = e.target.value;
    if (texto.trim() === "" || stateLectora) {
      setStateListaproductos(false);
    } else {
      setStateListaproductos(true);
    }
  }

  // Función para verificar si producto tiene características especiales
  async function verificarProductoEspecial(producto) {
    try {
      const caracteristicas = await VerificarCaracteristicasProducto(producto.id);
      return caracteristicas.tieneVariantes || 
             caracteristicas.tieneMultiprecios || 
             caracteristicas.tieneSeriales || 
             caracteristicas.esCompuesto;
    } catch (error) {
      console.error("Error verificando características:", error);
      return false;
    }
  }

  // Función para manejar la selección de producto
  async function manejarSeleccionProducto(producto) {
    selectProductos(producto);
    setIsAddingProduct(true); // Iniciar loading
    
    try {
      // Verificar si tiene características especiales
      const esEspecial = await verificarProductoEspecial(producto);
      
      if (esEspecial) {
        // Mostrar modal para productos especiales
        setProductoEspecialPendiente(producto);
        setShowModalEspecial(true);
        setStateListaproductos(false);
        setBuscador("");
        setIsAddingProduct(false); // El modal manejará su propio loading
      } else {
        // Producto normal, aplicar multiprecio si existe
        await aplicarMultiprecioYAgregar();
        setIsAddingProduct(false);
      }
    } catch (error) {
      setIsAddingProduct(false);
      manejarErrorStock(error);
    }
  }

  // Función centralizada para manejar errores de stock
  async function manejarErrorStock(error) {
    const mensajeError = error.message || "Error desconocido";
    
    // Verificar si es un error de stock insuficiente
    if (mensajeError.includes("Stock insuficiente") || mensajeError.includes("STOCK_ERROR")) {
      // Extraer información del mensaje
      const match = mensajeError.match(/Disponible:\s*(\d+)/);
      const stockDisponible = match ? parseInt(match[1]) : 0;
      
      // Obtener el producto actual
      const productoActual = useProductosStore.getState().productosItemSelect;
      
      // Verificar si hay stock en OTROS almacenes
      const { mostrarStockXAlmacenesYProducto } = useStockStore.getState();
      
      try {
        const stockOtrosAlmacenes = await mostrarStockXAlmacenesYProducto({
          id_producto: productoActual.id
        });
        
        // Filtrar para excluir el almacén actual
        const almacenActualId = almacenSelectItem?.id || almacenSelectItem?.id_almacen || dataAlmacenesXsucursal?.[0]?.id;
        const almacenesConStock = stockOtrosAlmacenes?.filter(s => 
          (s.id_almacen || s.almacen?.id) !== almacenActualId && s.stock > 0
        ) || [];
        
        if (almacenesConStock.length > 0) {
          // HAY stock en otros almacenes - mostrar modal de selección
          Swal.fire({
            icon: "info",
            title: "Stock disponible en otros almacenes",
            html: `
              <div style="text-align: left; font-size: 14px;">
                <p style="margin-bottom: 12px;">El almacén actual no tiene stock suficiente para <strong>"${productoActual.nombre}"</strong>.</p>
                <p style="color: #10b981; font-size: 13px;">
                  ✓ Se encontró stock en <strong>${almacenesConStock.length}</strong> almacén(es) alternativo(s).
                </p>
              </div>
            `,
            confirmButtonColor: "#10b981",
            confirmButtonText: "Ver almacenes disponibles",
            showCancelButton: true,
            cancelButtonText: "Cancelar",
            cancelButtonColor: "#64748b",
          }).then((result) => {
            if (result.isConfirmed) {
              // Abrir modal de selección de almacén
              setStateModal(true);
            }
          });
          return;
        }
      } catch (err) {
        console.error("Error verificando stock en otros almacenes:", err);
      }
      
      // NO hay stock en ningún almacén - mostrar mensaje de error
      Swal.fire({
        icon: "warning",
        title: "Stock insuficiente",
        html: `
          <div style="text-align: left; font-size: 14px;">
            <p style="margin-bottom: 12px;">${mensajeError.replace("STOCK_ERROR: ", "")}</p>
            <p style="color: #666; font-size: 13px;">
              ${stockDisponible === 0 
                ? "Este producto no tiene stock disponible en ningún almacén." 
                : `Solo puede agregar hasta ${stockDisponible} unidad(es).`}
            </p>
          </div>
        `,
        confirmButtonColor: "#111",
        confirmButtonText: "Entendido",
      });
      return;
    }
    
    // Si la venta no existe, resetear el estado
    if (error.code === "VENTA_NO_EXISTE" || mensajeError.includes("no existe")) {
      resetState();
      toast.info("Se reinició la venta. Intente agregar el producto nuevamente.");
      return;
    }
    
    // Para otros errores, mostrar toast
    toast.error(`Error: ${mensajeError}`);
  }

  // Función para aplicar multiprecio y agregar al carrito
  async function aplicarMultiprecioYAgregar() {
    const productosItemSelect = useProductosStore.getState().productosItemSelect;
    
    // Intentar obtener precio por cantidad (multiprecio)
    try {
      const precioInfo = await ObtenerPrecioSegunCantidad(productosItemSelect.id, cantidadInput);
      if (precioInfo?.es_multiprecio) {
        // Actualizar el precio en el store temporalmente
        const productoConMultiprecio = {
          ...productosItemSelect,
          precio_venta: precioInfo.precio,
          _multiprecio_aplicado: true,
          _nivel_precio: precioInfo.nombre_nivel,
          _descuento_multiprecio: precioInfo.descuento
        };
        selectProductos(productoConMultiprecio);
      }
    } catch (error) {
      // Si falla, usar precio normal
      console.log("Usando precio normal:", error.message);
    }
    
    // Ahora llamar a la función de inserción
    await insertarventas();
  }

  // Callback cuando se confirma desde el modal de producto especial
  async function handleConfirmarProductoEspecial(datosProducto) {
    const { producto, cantidad, precio, variante, serial, infoMultiprecio } = datosProducto;
    
    // Actualizar cantidad
    setCantidadInput(cantidad);
    
    // Preparar producto con datos especiales
    const productoFinal = {
      ...producto,
      precio_venta: precio,
      _variante: variante,
      _serial: serial,
      _multiprecio_aplicado: infoMultiprecio?.es_multiprecio || false,
      _nivel_precio: infoMultiprecio?.nombre_nivel,
      _descuento_multiprecio: infoMultiprecio?.descuento
    };
    
    selectProductos(productoFinal);
    
    // Cerrar modal
    setShowModalEspecial(false);
    setProductoEspecialPendiente(null);
    
    // Insertar la venta con manejo de errores
    try {
      await insertarventasConDatosEspeciales(cantidad, precio, variante, serial);
    } catch (error) {
      manejarErrorStock(error);
      return;
    }
    // Insertar la venta con manejo de errores
    try {
      await insertarventasConDatosEspeciales(cantidad, precio, variante, serial);
    } catch (error) {
      manejarErrorStock(error);
      return;
    }
    
    setBuscador("");
    buscadorRef.current.focus();
    setCantidadInput(1);
  }

  // Insertar venta con datos especiales (variante, serial, multiprecio)
  async function insertarventasConDatosEspeciales(cantidad, precio, variante, serial) {
    let idVentaActual = idventa;
    
    if (idVentaActual === 0) {
      const pventas = {
        fecha: fechaactual,
        id_usuario: datausuarios?.id,
        id_sucursal: dataCierreCaja?.caja?.id_sucursal,
        id_empresa: dataempresa?.id,
        id_cierre_caja: dataCierreCaja?.id,
      };

      const result = await insertarVentas(pventas);
      if (result?.id > 0) {
        idVentaActual = result.id;
      } else {
        return;
      }
    }
    
    await insertarDVentasEspecial(idVentaActual, cantidad, precio, variante, serial);
    queryClient.invalidateQueries(["mostrar detalle venta"]);
  }

  // Insertar detalle con datos especiales
  async function insertarDVentasEspecial(idVentaParam, cantidad, precio, variante, serial) {
    const productosItemSelect = useProductosStore.getState().productosItemSelect;
    
    const almacenActual = almacenSelectItem?.id || almacenSelectItem?.id_almacen || dataAlmacenesXsucursal?.[0]?.id;
    
    if (!almacenActual) {
      toast.error("No hay almacén seleccionado. Por favor seleccione un almacén.");
      return;
    }
    
    const pDetalleVentas = {
      _id_venta: idVentaParam,
      _cantidad: parseFloat(cantidad) || 1,
      _precio_venta: precio || productosItemSelect.precio_venta,
      _descripcion: productosItemSelect.nombre,
      _id_producto: productosItemSelect.id,
      _precio_compra: productosItemSelect.precio_compra,
      _id_sucursal: dataCierreCaja?.caja?.id_sucursal,
      _id_almacen: almacenActual,
      // Datos especiales
      _id_variante: variante?.id || null,
      _id_serial: serial?.id || null,
    };
    
    await insertarDetalleVentas(pDetalleVentas);
    
    // Si tiene serial, marcarlo como vendido
    if (serial?.id) {
      try {
        await ReservarSerialParaVenta(serial.id, idVentaParam);
      } catch (error) {
        console.error("Error reservando serial:", error);
      }
    }
  }

  async function insertarventas() {
    if (idventa === 0) {
      const pventas = {
        fecha: fechaactual,
        id_usuario: datausuarios?.id,
        id_sucursal: dataCierreCaja?.caja?.id_sucursal,
        id_empresa: dataempresa?.id,
        id_cierre_caja: dataCierreCaja?.id,
      };

      const result = await insertarVentas(pventas);
      if (result?.id > 0) {
        await insertarDVentas(result?.id);
      }
    } else {
      await insertarDVentas(idventa);
    }
    setBuscador("");
    buscadorRef.current.focus();
    setCantidadInput(1);
  }
  async function insertarDVentas(idventa) {
    const productosItemSelect =
      useProductosStore.getState().productosItemSelect;
    
    // Obtener el almacén seleccionado o el primero disponible
    const almacenActual = almacenSelectItem?.id || almacenSelectItem?.id_almacen || dataAlmacenesXsucursal?.[0]?.id;
    
    if (!almacenActual) {
      toast.error("No hay almacén seleccionado. Por favor seleccione un almacén.");
      return;
    }
    
    const pDetalleVentas = {
      _id_venta: idventa,
      _cantidad: parseFloat(cantidadInput) || 1,
      _precio_venta: productosItemSelect.precio_venta,
      _descripcion: productosItemSelect.nombre,
      _id_producto: productosItemSelect.id,
      _precio_compra: productosItemSelect.precio_compra,
      _id_sucursal: dataCierreCaja?.caja?.id_sucursal,
      _id_almacen: almacenActual,
    };
    console.log("pDetalleVentas", pDetalleVentas);
    await insertarDetalleVentas(pDetalleVentas);
    
    // Invalidar la query para actualizar la lista de productos
    queryClient.invalidateQueries(["mostrar detalle venta"]);
  }
  const { mutate: mutationInsertarVentas } = useMutation({
    mutationKey: ["insertar ventas"],
    mutationFn: aplicarMultiprecioYAgregar,
    onError: (error) => {
      manejarErrorStock(error);
      manejarErrorStock(error);
      
      queryClient.invalidateQueries(["mostrar Stock XAlmacenes YProducto"]);
      if (dataStockXAlmacenesYProducto) {
        setStateModal(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mostrar detalle venta"]);
    },
  });
  //validar cantidad
  const ValidarCantidad = (e) => {
    const value = Math.max(0, parseFloat(e.target.value));
    setCantidadInput(value);
  };
  
  // Recuperar venta pendiente al cargar el POS
  const { data: ventaPendiente, isLoading: isLoadingVentaPendiente } = useMostrarVentaPendienteQuery();
  
  useEffect(() => {
    buscadorRef.current.focus();
  }, []);

  // Efecto para notificar cuando se recupera una venta pendiente
  useEffect(() => {
    if (ventaPendiente?.id && !isLoadingVentaPendiente) {
      const cantidadProductos = ventaPendiente.detalle_venta?.[0]?.count || 0;
      if (cantidadProductos > 0) {
        toast.info(`Se recuperó tu venta pendiente con ${cantidadProductos} producto(s)`, {
          duration: 3000,
        });
      }
    }
  }, [ventaPendiente, isLoadingVentaPendiente]);

  useEffect(() => {
    let timeout;
    const texto = buscador.trim();
    const isCodigoDeBarras = /^[0-9]{3,}$/.test(texto);
    if (isCodigoDeBarras) {
      setStateListaproductos(false);
      timeout = setTimeout(() => {
        const productoEncontrado = dataProductos?.find(
          (p) => p.codigo_barras === texto
        );
        if (productoEncontrado) {
          // Usar la nueva función que maneja productos especiales
          manejarSeleccionProducto(productoEncontrado);
        } else {
          toast.error("Producto no encontrado");
          setBuscador("");
        }
      }, 100);
    } else {
      if (texto.length > 1) {
        timeout = setTimeout(() => {
          setStateListaproductos(true);
        }, 200);
      } else {
        setStateListaproductos(false);
      }
    }
  }, [buscador]);

  return (
    <Header>
      {/* Barra de contexto - Sucursal y Caja */}
      <ContextBar>
        <ContextItem>
          <ContextIcon className="sucursal">
            <Icon icon="lucide:building-2" width="16" />
          </ContextIcon>
          <ContextInfo>
            <ContextLabel>Sucursal</ContextLabel>
            <ContextValue>{dataCierreCaja.caja?.sucursales?.nombre}</ContextValue>
          </ContextInfo>
        </ContextItem>
        
        <ContextDivider />
        
        <ContextItem>
          <ContextIcon className="caja">
            <Icon icon="lucide:monitor" width="16" />
          </ContextIcon>
          <ContextInfo>
            <ContextLabel>Caja</ContextLabel>
            <ContextValue>{dataCierreCaja.caja?.descripcion}</ContextValue>
          </ContextInfo>
        </ContextItem>
        
        <ContextDivider />
        
        <ContextItem>
          <ContextIcon className="almacen">
            <Icon icon="lucide:warehouse" width="16" />
          </ContextIcon>
          <ContextInfo>
            <ContextLabel>Almacén</ContextLabel>
            <ContextValue>
              {almacenSelectItem?.nombre || dataAlmacenesXsucursal?.[0]?.nombre || "Sin asignar"}
            </ContextValue>
          </ContextInfo>
        </ContextItem>
      </ContextBar>

      <MainHeader>
        <LeftSection>
          <UserInfo>
            <UserAvatar>
              <Icon icon="lucide:user" width="18" />
            </UserAvatar>
            <UserDetails>
              <UserName>{datausuarios?.nombres}</UserName>
              <UserRole>
                <Icon icon="lucide:shield-check" width="12" />
                {datausuarios?.roles?.nombre}
              </UserRole>
            </UserDetails>
          </UserInfo>
        </LeftSection>

        <CenterSection>
          <SearchSection>
            <SearchWrapper $isOpen={stateListaproductos} $isLoading={isAddingProduct}>
              {isAddingProduct && (
                <LoadingOverlay>
                  <LoadingSpinner>
                    <Icon icon="lucide:loader-2" />
                  </LoadingSpinner>
                  <LoadingText>Agregando producto...</LoadingText>
                </LoadingOverlay>
              )}
              <SearchIcon>
                <Icon icon="lucide:search" />
              </SearchIcon>
              <SearchInput
                value={buscador}
                ref={buscadorRef}
                onChange={buscar}
                type="search"
                placeholder="Buscar producto por nombre o código de barras..."
                disabled={isAddingProduct}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" && stateListaproductos) {
                    e.preventDefault();
                    document.querySelector("[tabindex='0'").focus();
                  }
                  if (e.key === "Escape") {
                    setStateListaproductos(false);
                    setBuscador("");
                  }
                  if (e.key === "Escape") {
                    setStateListaproductos(false);
                    setBuscador("");
                  }
                }}
              />
              {buscador && (
                <ClearSearchButton onClick={() => { setBuscador(""); setStateListaproductos(false); }}>
                  <Icon icon="lucide:x" />
                </ClearSearchButton>
              )}
              
              {/* Lista de resultados mejorada */}
              {stateListaproductos && dataProductos?.length > 0 && (
                <SearchResultsDropdown>
                  <ResultsHeader>
                    <ResultsCount>{dataProductos.length} producto(s) encontrado(s)</ResultsCount>
                    <CloseResults onClick={() => setStateListaproductos(false)}>
                      <Icon icon="lucide:x" />
                    </CloseResults>
                  </ResultsHeader>
                  <ResultsList>
                    {dataProductos.map((item, index) => (
                      <ProductResultItem
                        key={item.id || index}
                        onClick={() => {
                          manejarSeleccionProducto(item);
                          setStateListaproductos(false);
                          setBuscador("");
                        }}
                        tabIndex={index === 0 ? 0 : -1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            manejarSeleccionProducto(item);
                            setStateListaproductos(false);
                            setBuscador("");
                          }
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            const next = e.target.nextSibling;
                            if (next) next.focus();
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            const prev = e.target.previousSibling;
                            if (prev) prev.focus();
                            else buscadorRef.current?.focus();
                          }
                        }}
                      >
                        <ProductIcon>
                          <Icon icon="lucide:package" />
                        </ProductIcon>
                        <ProductInfo>
                          <ProductName>{item.nombre}</ProductName>
                          <ProductMeta>
                            {item.codigo_barras && (
                              <MetaTag>
                                <Icon icon="lucide:barcode" />
                                {item.codigo_barras}
                              </MetaTag>
                            )}
                            <MetaTag className="price">
                              <Icon icon="lucide:tag" />
                              S/ {Number(item.precio_venta || 0).toFixed(2)}
                            </MetaTag>
                          </ProductMeta>
                        </ProductInfo>
                        <AddIcon>
                          <Icon icon="lucide:plus-circle" />
                        </AddIcon>
                      </ProductResultItem>
                    ))}
                  </ResultsList>
                </SearchResultsDropdown>
              )}
              
              {/* Mensaje cuando no hay resultados */}
              {stateListaproductos && buscador && dataProductos?.length === 0 && (
                <SearchResultsDropdown>
                  <NoResultsMessage>
                    <Icon icon="lucide:search-x" />
                    <span>No se encontraron productos para "{buscador}"</span>
                  </NoResultsMessage>
                </SearchResultsDropdown>
              )}
              {buscador && (
                <ClearSearchButton onClick={() => { setBuscador(""); setStateListaproductos(false); }}>
                  <Icon icon="lucide:x" />
                </ClearSearchButton>
              )}
              
              {/* Lista de resultados mejorada */}
              {stateListaproductos && dataProductos?.length > 0 && (
                <SearchResultsDropdown>
                  <ResultsHeader>
                    <ResultsCount>{dataProductos.length} producto(s) encontrado(s)</ResultsCount>
                    <CloseResults onClick={() => setStateListaproductos(false)}>
                      <Icon icon="lucide:x" />
                    </CloseResults>
                  </ResultsHeader>
                  <ResultsList>
                    {dataProductos.map((item, index) => (
                      <ProductResultItem
                        key={item.id || index}
                        onClick={() => {
                          manejarSeleccionProducto(item);
                          setStateListaproductos(false);
                          setBuscador("");
                        }}
                        tabIndex={index === 0 ? 0 : -1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            manejarSeleccionProducto(item);
                            setStateListaproductos(false);
                            setBuscador("");
                          }
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            const next = e.target.nextSibling;
                            if (next) next.focus();
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            const prev = e.target.previousSibling;
                            if (prev) prev.focus();
                            else buscadorRef.current?.focus();
                          }
                        }}
                      >
                        <ProductIcon>
                          <Icon icon="lucide:package" />
                        </ProductIcon>
                        <ProductInfo>
                          <ProductName>{item.nombre}</ProductName>
                          <ProductMeta>
                            {item.codigo_barras && (
                              <MetaTag>
                                <Icon icon="lucide:barcode" />
                                {item.codigo_barras}
                              </MetaTag>
                            )}
                            <MetaTag className="price">
                              <Icon icon="lucide:tag" />
                              S/ {Number(item.precio_venta || 0).toFixed(2)}
                            </MetaTag>
                          </ProductMeta>
                        </ProductInfo>
                        <AddIcon>
                          <Icon icon="lucide:plus-circle" />
                        </AddIcon>
                      </ProductResultItem>
                    ))}
                  </ResultsList>
                </SearchResultsDropdown>
              )}
              
              {/* Mensaje cuando no hay resultados */}
              {stateListaproductos && buscador && dataProductos?.length === 0 && (
                <SearchResultsDropdown>
                  <NoResultsMessage>
                    <Icon icon="lucide:search-x" />
                    <span>No se encontraron productos para "{buscador}"</span>
                  </NoResultsMessage>
                </SearchResultsDropdown>
              )}
            </SearchWrapper>

            {/* Stepper de cantidad - después de buscar */}
            <QuantityStepper>
              <StepperButton 
                onClick={() => setCantidadInput(prev => Math.max(1, prev - 1))}
                disabled={cantidadInput <= 1}
              >
                <Icon icon="lucide:minus" />
              </StepperButton>
              <StepperValue>
                <input
                  type="number"
                  min="1"
                  value={cantidadInput}
                  onChange={ValidarCantidad}
                />
              </StepperValue>
              <StepperButton 
                onClick={() => setCantidadInput(prev => prev + 1)}
                className="plus"
              >
                <Icon icon="lucide:plus" />
              </StepperButton>
            </QuantityStepper>

            {/* Stepper de cantidad - después de buscar */}
            <QuantityStepper>
              <StepperButton 
                onClick={() => setCantidadInput(prev => Math.max(1, prev - 1))}
                disabled={cantidadInput <= 1}
              >
                <Icon icon="lucide:minus" />
              </StepperButton>
              <StepperValue>
                <input
                  type="number"
                  min="1"
                  value={cantidadInput}
                  onChange={ValidarCantidad}
                />
              </StepperValue>
              <StepperButton 
                onClick={() => setCantidadInput(prev => prev + 1)}
                className="plus"
              >
                <Icon icon="lucide:plus" />
              </StepperButton>
            </QuantityStepper>
          </SearchSection>
        </CenterSection>

        <RightSection>
          <ClockWrapper>
            <Reloj />
          </ClockWrapper>
        </RightSection>
      </MainHeader>

      {/* Modal para productos especiales (variantes, seriales, multiprecios, kits) */}
      {showModalEspecial && productoEspecialPendiente && (
        <ModalProductoEspecial
          producto={productoEspecialPendiente}
          idAlmacen={almacenSelectItem?.id || almacenSelectItem?.id_almacen || dataAlmacenesXsucursal?.[0]?.id}
          cantidadInicial={cantidadInput}
          onConfirmar={handleConfirmarProductoEspecial}
          onCancelar={() => {
            setShowModalEspecial(false);
            setProductoEspecialPendiente(null);
            buscadorRef.current.focus();
          }}
        />
      )}
    </Header>
  );
}

const Header = styled.div`
  grid-area: header;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/* Context Bar - Sucursal, Caja, Almacén */
const ContextBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const ContextItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

const ContextIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.sucursal {
    background: #eff6ff;
    color: #3b82f6;
  }
  
  &.caja {
    background: #f0fdf4;
    color: #22c55e;
  }
  
  &.almacen {
    background: #fef3c7;
    color: #d97706;
  }
`;

const ContextInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const ContextLabel = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const ContextValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #111;
`;

const ContextDivider = styled.div`
  width: 1px;
  height: 28px;
  background: #eee;
  flex-shrink: 0;
`;

/* Main Header */
const MainHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media ${Device.desktop} {
    gap: 24px;
  }
`;

const LeftSection = styled.div`
  flex-shrink: 0;
`;

const CenterSection = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
`;

const RightSection = styled.div`
  flex-shrink: 0;
  display: none;
  
  @media ${Device.desktop} {
    display: block;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  background: #f5f5f5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
`;

const UserDetails = styled.div`
  display: none;
  flex-direction: column;
  gap: 2px;
  
  @media ${Device.tablet} {
    display: flex;
  }
`;

const UserName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #111;
`;

const UserRole = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #888;

  svg {
    color: #22c55e;
  }
`;

const ClockWrapper = styled.div`
  text-align: right;
`;

const SearchSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  max-width: 650px;
`;

/* Stepper de cantidad - diseño profesional */
const QuantityStepper = styled.div`
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  height: 48px;
`;

const StepperButton = styled.button`
  width: 40px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: none;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    color: #374151;
  }

  &:active:not(:disabled) {
    background: #e5e7eb;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.plus {
    background: #10b981;
    color: #fff;

    &:hover:not(:disabled) {
      background: #059669;
    }

    &:active:not(:disabled) {
      background: #047857;
    }
  }

  svg {
    font-size: 18px;
  }
`;

const StepperValue = styled.div`
  width: 50px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;

  input {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    color: #111;
    outline: none;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
`;

const SearchWrapper = styled.div`
  flex: 1;
  position: relative;
  
  ${({ $isLoading }) => $isLoading && `
    pointer-events: none;
  `}
  
  ${({ $isOpen }) => $isOpen && `
    &::after {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 98;
      animation: fadeIn 0.15s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `}
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 101;
  border: 2px solid #10b981;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  animation: pulse 1.5s ease-in-out infinite;
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    font-size: 22px;
    color: #10b981;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #10b981;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 20px;
  color: #9ca3af;
  font-size: 20px;
  pointer-events: none;
  z-index: 1;
  display: flex;
  align-items: center;
  z-index: 1;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 48px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  padding: 0 48px 0 48px;
  font-size: 15px;
  height: 48px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  padding: 0 48px 0 48px;
  font-size: 15px;
  background: #fff;
  color: #111;
  color: #111;
  outline: none;
  transition: all 0.2s ease;
  position: relative;
  z-index: 99;
  transition: all 0.2s ease;
  position: relative;
  z-index: 99;

  &:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }
  
  &::-webkit-search-cancel-button {
    display: none;
  }
`;

const ClearSearchButton = styled.button`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
  z-index: 100;

  &:hover {
    background: #e5e7eb;
    color: #374151;
  }

  svg {
    font-size: 16px;
  }
`;

/* Dropdown de resultados de búsqueda */
const SearchResultsDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 100;
  overflow: hidden;
  animation: slideDown 0.2s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ResultsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
`;

const ResultsCount = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
`;

const CloseResults = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #9ca3af;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }

  svg {
    font-size: 18px;
  }
`;

const ResultsList = styled.div`
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #d1d5db;
  }
`;

const ProductResultItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;

  &:hover, &:focus {
    background: #f0fdf4;
  }

  &:focus {
    box-shadow: inset 0 0 0 2px #10b981;
  }
`;

const ProductIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    font-size: 20px;
    color: #0284c7;
  }
`;

const ProductInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProductName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
`;

const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const MetaTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 6px;

  svg {
    font-size: 12px;
  }

  &.price {
    background: #dcfce7;
    color: #15803d;
    font-weight: 600;
  }
`;

const AddIcon = styled.div`
  color: #10b981;
  font-size: 24px;
  opacity: 0.5;
  transition: all 0.15s;
  flex-shrink: 0;

  ${ProductResultItem}:hover &,
  ${ProductResultItem}:focus & {
    opacity: 1;
    transform: scale(1.1);
  }
`;

const NoResultsMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #9ca3af;
  gap: 8px;

  svg {
    font-size: 32px;
    opacity: 0.5;
  }

  span {
    font-size: 14px;
  }
`;
