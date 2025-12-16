import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import styled, { keyframes } from "styled-components";
import { Icon } from "@iconify/react";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { useVariantesStore } from "../store/VariantesStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { Spinner1 } from "../index";
import { ObtenerProductosConVariantes } from "../supabase/crudVariantes";
import { Generarcodigo } from "../hooks/Generarcodigo";

export function Variantes() {
  const queryClient = useQueryClient();
  const { dataempresa } = useEmpresaStore();
  const {
    dataAtributos,
    dataAtributosInactivos,
    obtenerAtributos,
    obtenerAtributosInactivos,
    crearAtributoConValores,
    editarAtributo,
    eliminarAtributo,
    restaurarAtributo,
    agregarValorAtributo,
    eliminarValorAtributo,
    editarValorAtributo,
    obtenerVariantesProducto,
    crearVarianteProducto,
    eliminarVariante,
    generarCombinaciones,
    setProductoSeleccionado,
    dataVariantes,
  } = useVariantesStore();

  const [tab, setTab] = useState("activos");
  const [modalAtributo, setModalAtributo] = useState(false);
  const [modalEditarAtributo, setModalEditarAtributo] = useState(false);
  const [modalValores, setModalValores] = useState(false);
  const [modalVariante, setModalVariante] = useState(false);
  const [atributoActual, setAtributoActual] = useState(null);
  const [nuevoAtributo, setNuevoAtributo] = useState({ nombre: "", valores: "" });
  const [nuevoValor, setNuevoValor] = useState("");
  const [valorEditando, setValorEditando] = useState(null);
  const [textoEditando, setTextoEditando] = useState("");
  const [productoVariante, setProductoVariante] = useState(null);
  const [atributosSeleccionados, setAtributosSeleccionados] = useState([]);
  const [guardandoVariantes, setGuardandoVariantes] = useState(false);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);
  const [eliminandoVariantes, setEliminandoVariantes] = useState(false);
  const [variantesSeleccionadas, setVariantesSeleccionadas] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // Obtener atributos activos
  const { isLoading } = useQuery({
    queryKey: ["atributos-activos", dataempresa?.id],
    queryFn: () => obtenerAtributos({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  // Obtener atributos inactivos (siempre activo para el contador)
  const { refetch: refetchInactivos } = useQuery({
    queryKey: ["atributos-inactivos", dataempresa?.id],
    queryFn: () => obtenerAtributosInactivos({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  // Obtener productos con variantes (siempre activo para el contador)
  const { data: productosConVariantes = [], isLoading: loadingProductos } = useQuery({
    queryKey: ["productos-con-variantes", dataempresa?.id],
    queryFn: () => ObtenerProductosConVariantes({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  // Filtrar atributos por búsqueda
  const atributosFiltrados = busqueda
    ? dataAtributos.filter(a => 
        a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.atributo_valores?.some(v => v.valor.toLowerCase().includes(busqueda.toLowerCase()))
      )
    : dataAtributos;

  const cambiarTab = (nuevaTab) => {
    setTab(nuevaTab);
    if (nuevaTab === "inactivos") refetchInactivos();
  };

  // === CREAR ATRIBUTO ===
  const handleCrearAtributo = async () => {
    if (!nuevoAtributo.nombre || !nuevoAtributo.valores) {
      toast.error("Completa nombre y valores");
      return;
    }
    
    const valores = nuevoAtributo.valores
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v);

    if (valores.length === 0) {
      toast.error("Agrega al menos un valor");
      return;
    }

    const resultado = await crearAtributoConValores({
      id_empresa: dataempresa?.id,
      nombre: nuevoAtributo.nombre,
      valores,
    });

    if (resultado.exito !== false) {
      toast.success("Atributo creado correctamente");
      setNuevoAtributo({ nombre: "", valores: "" });
      setModalAtributo(false);
      queryClient.invalidateQueries(["atributos-activos"]);
    } else {
      toast.error(resultado.mensaje || "Error al crear atributo");
    }
  };

  // === EDITAR ATRIBUTO ===
  const handleAbrirEditarAtributo = (atributo) => {
    setAtributoActual({ ...atributo });
    setModalEditarAtributo(true);
  };

  const handleGuardarEditarAtributo = async () => {
    if (!atributoActual.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const resultado = await editarAtributo({
      id: atributoActual.id,
      nombre: atributoActual.nombre,
    });

    if (resultado.exito) {
      toast.success("Atributo actualizado");
      setModalEditarAtributo(false);
      queryClient.invalidateQueries(["atributos-activos"]);
    } else {
      toast.error(resultado.mensaje || "Error al actualizar");
    }
  };

  // === ELIMINAR ATRIBUTO ===
  const handleEliminarAtributo = async (atributo) => {
    const result = await Swal.fire({
      title: "¿Eliminar atributo?",
      html: `<p style="color: #6b7280;">Se desactivará <strong style="color: #111827;">${atributo.nombre}</strong> y sus valores</p>`,
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
      const resultado = await eliminarAtributo({ id: atributo.id });
      if (resultado.exito) {
        toast.success("Atributo eliminado");
        queryClient.invalidateQueries(["atributos-activos"]);
        queryClient.invalidateQueries(["atributos-inactivos"]);
      } else {
        toast.error(resultado.mensaje || "Error al eliminar");
      }
    }
  };

  // === RESTAURAR ATRIBUTO ===
  const handleRestaurarAtributo = async (atributo) => {
    const result = await Swal.fire({
      title: "¿Restaurar atributo?",
      html: `<p style="color: #6b7280;">Se reactivará <strong style="color: #111827;">${atributo.nombre}</strong></p>`,
      icon: "question",
      iconColor: "#111827",
      showCancelButton: true,
      confirmButtonText: "Sí, restaurar",
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
      const resultado = await restaurarAtributo({ id: atributo.id });
      if (resultado.exito) {
        toast.success("Atributo restaurado");
        queryClient.invalidateQueries(["atributos-activos"]);
        queryClient.invalidateQueries(["atributos-inactivos"]);
      } else {
        toast.error(resultado.mensaje || "Error al restaurar");
      }
    }
  };

  // === GESTIONAR VALORES ===
  const handleAbrirValores = (atributo) => {
    setAtributoActual({ ...atributo });
    setNuevoValor("");
    setValorEditando(null);
    setTextoEditando("");
    setModalValores(true);
  };

  const handleIniciarEdicionValor = (valor) => {
    setValorEditando(valor.id);
    setTextoEditando(valor.valor);
  };

  const handleCancelarEdicionValor = () => {
    setValorEditando(null);
    setTextoEditando("");
  };

  const handleGuardarEdicionValor = async (valor) => {
    if (!textoEditando.trim()) {
      toast.error("El valor no puede estar vacío");
      return;
    }

    const resultado = await editarValorAtributo({
      id: valor.id,
      valor: textoEditando.trim(),
    });

    if (resultado.exito) {
      toast.success("Valor actualizado");
      setAtributoActual({
        ...atributoActual,
        atributo_valores: atributoActual.atributo_valores.map(v => 
          v.id === valor.id ? { ...v, valor: textoEditando.trim() } : v
        ),
      });
      setValorEditando(null);
      setTextoEditando("");
      queryClient.invalidateQueries(["atributos-activos"]);
    } else {
      toast.error(resultado.mensaje || "Error al actualizar valor");
    }
  };

  const handleAgregarValor = async () => {
    if (!nuevoValor.trim()) return;

    const resultado = await agregarValorAtributo({
      id_atributo: atributoActual.id,
      valor: nuevoValor.trim(),
    });

    if (resultado.exito) {
      toast.success("Valor agregado");
      setNuevoValor("");
      setAtributoActual({
        ...atributoActual,
        atributo_valores: [...(atributoActual.atributo_valores || []), resultado.data],
      });
      queryClient.invalidateQueries(["atributos-activos"]);
    } else {
      toast.error(resultado.mensaje || "Error al agregar valor");
    }
  };

  const handleEliminarValor = async (valor) => {
    const result = await Swal.fire({
      title: "¿Eliminar valor?",
      html: `<p style="color: #6b7280;">Se eliminará <strong style="color: #111827;">${valor.valor}</strong></p>`,
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
      const resultado = await eliminarValorAtributo({ id: valor.id });
      if (resultado.exito) {
        toast.success("Valor eliminado");
        setAtributoActual({
          ...atributoActual,
          atributo_valores: atributoActual.atributo_valores.filter(v => v.id !== valor.id),
        });
        queryClient.invalidateQueries(["atributos-activos"]);
      } else {
        toast.error(resultado.mensaje || "Error al eliminar valor");
      }
    }
  };

  // === VARIANTES ===
  const handleSeleccionarProducto = async (producto) => {
    setProductoVariante(producto);
    setProductoSeleccionado(producto);
    setAtributosSeleccionados([]);
    setVariantes([]);
    setModalVariante(true);
    setCargandoVariantes(true);
    await obtenerVariantesProducto({ id_producto: producto.id });
    setCargandoVariantes(false);
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
    if (variantes.length === 0) return;
    
    setGuardandoVariantes(true);
    let exitos = 0;
    
    for (const variante of variantes) {
      const resultado = await crearVarianteProducto({
        id_producto: productoVariante.id,
        atributos: variante.combinacion.map((a) => ({ 
          id_atributo: a.id_atributo, 
          id_valor: a.id_valor 
        })),
        nombre_variante: variante.combinacion.map((c) => c.valor).join(" / "),
        precio_venta: variante.precio,
        codigo_barras: variante.sku,
      });
      if (resultado.exito) exitos++;
    }
    
    setGuardandoVariantes(false);
    toast.success(`${exitos} variantes creadas`);
    setVariantes([]);
    setAtributosSeleccionados([]);
    // Refrescar las variantes existentes
    await obtenerVariantesProducto({ id_producto: productoVariante.id });
  };

  const handleEliminarVarianteExistente = async (variante) => {
    const result = await Swal.fire({
      title: "¿Eliminar variante?",
      html: `<p style="color: #6b7280;">Se eliminará <strong style="color: #111827;">${variante.nombre}</strong></p>`,
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
      const resultado = await eliminarVariante({ id: variante.id });
      if (resultado.exito) {
        toast.success("Variante eliminada");
        setVariantesSeleccionadas([]);
        await obtenerVariantesProducto({ id_producto: productoVariante.id });
      } else {
        toast.error(resultado.mensaje || "Error al eliminar");
      }
    }
  };

  const toggleSeleccionVariante = (varianteId) => {
    setVariantesSeleccionadas(prev => 
      prev.includes(varianteId) 
        ? prev.filter(id => id !== varianteId)
        : [...prev, varianteId]
    );
  };

  const toggleSeleccionarTodas = () => {
    if (variantesSeleccionadas.length === dataVariantes.length) {
      setVariantesSeleccionadas([]);
    } else {
      setVariantesSeleccionadas(dataVariantes.map(v => v.id));
    }
  };

  const handleEliminarSeleccionadas = async () => {
    if (variantesSeleccionadas.length === 0) return;

    const result = await Swal.fire({
      title: `¿Eliminar ${variantesSeleccionadas.length} variantes?`,
      html: `<p style="color: #6b7280;">Esta acción no se puede deshacer</p>`,
      icon: "warning",
      iconColor: "#111827",
      showCancelButton: true,
      confirmButtonText: `Sí, eliminar (${variantesSeleccionadas.length})`,
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
      setEliminandoVariantes(true);
      let eliminadas = 0;
      
      for (const id of variantesSeleccionadas) {
        const resultado = await eliminarVariante({ id });
        if (resultado.exito) eliminadas++;
      }
      
      setEliminandoVariantes(false);
      setVariantesSeleccionadas([]);
      toast.success(`${eliminadas} variantes eliminadas`);
      await obtenerVariantesProducto({ id_producto: productoVariante.id });
    }
  };

  if (isLoading) return <Spinner1 />;

  return (
    <Container>
      <Toaster position="top-center" richColors />

      {/* Modal Nuevo Atributo */}
      {modalAtributo && (
        <ModalOverlay onClick={() => setModalAtributo(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Nuevo Atributo</ModalTitle>
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
              <BtnSecondary onClick={() => setModalAtributo(false)}>
                Cancelar
              </BtnSecondary>
              <BtnPrimary onClick={handleCrearAtributo}>
                <Icon icon="lucide:plus" />
                Crear Atributo
              </BtnPrimary>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal Editar Atributo */}
      {modalEditarAtributo && atributoActual && (
        <ModalOverlay onClick={() => setModalEditarAtributo(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Editar Atributo</ModalTitle>
              <CloseButton onClick={() => setModalEditarAtributo(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label>Nombre del Atributo</Label>
                <Input
                  type="text"
                  value={atributoActual.nombre}
                  onChange={(e) =>
                    setAtributoActual({ ...atributoActual, nombre: e.target.value })
                  }
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <BtnSecondary onClick={() => setModalEditarAtributo(false)}>
                Cancelar
              </BtnSecondary>
              <BtnPrimary onClick={handleGuardarEditarAtributo}>
                <Icon icon="lucide:save" />
                Guardar
              </BtnPrimary>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal Gestionar Valores */}
      {modalValores && atributoActual && (
        <ModalOverlay onClick={() => setModalValores(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <ModalTitle>Valores de {atributoActual.nombre}</ModalTitle>
                <ModalSubtitle>{atributoActual.atributo_valores?.length || 0} valores</ModalSubtitle>
              </div>
              <CloseButton onClick={() => setModalValores(false)}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <AddValueRow>
                <Input
                  type="text"
                  placeholder="Nuevo valor..."
                  value={nuevoValor}
                  onChange={(e) => setNuevoValor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregarValor()}
                />
                <BtnPrimary onClick={handleAgregarValor}>
                  <Icon icon="lucide:plus" />
                </BtnPrimary>
              </AddValueRow>

              <ValoresList>
                {atributoActual.atributo_valores?.map((valor) => (
                  <ValorItem key={valor.id}>
                    {valorEditando === valor.id ? (
                      <ValorEditRow>
                        <Input
                          type="text"
                          value={textoEditando}
                          onChange={(e) => setTextoEditando(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleGuardarEdicionValor(valor);
                            if (e.key === "Escape") handleCancelarEdicionValor();
                          }}
                          autoFocus
                        />
                        <ActionBtn onClick={() => handleGuardarEdicionValor(valor)} title="Guardar">
                          <Icon icon="lucide:check" />
                        </ActionBtn>
                        <ActionBtn onClick={handleCancelarEdicionValor} title="Cancelar">
                          <Icon icon="lucide:x" />
                        </ActionBtn>
                      </ValorEditRow>
                    ) : (
                      <>
                        <ValorText>{valor.valor}</ValorText>
                        <ValorActions>
                          <ActionBtn onClick={() => handleIniciarEdicionValor(valor)} title="Editar">
                            <Icon icon="lucide:pencil" />
                          </ActionBtn>
                          <ActionBtn $danger onClick={() => handleEliminarValor(valor)} title="Eliminar">
                            <Icon icon="lucide:trash-2" />
                          </ActionBtn>
                        </ValorActions>
                      </>
                    )}
                  </ValorItem>
                ))}
                {(!atributoActual.atributo_valores || atributoActual.atributo_valores.length === 0) && (
                  <EmptyMessage>No hay valores configurados</EmptyMessage>
                )}
              </ValoresList>
            </ModalBody>
            <ModalFooter>
              <BtnPrimary onClick={() => setModalValores(false)}>
                Cerrar
              </BtnPrimary>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal Gestionar Variantes */}
      {modalVariante && productoVariante && (
        <ModalOverlay onClick={() => !guardandoVariantes && setModalVariante(false)}>
          <ModalContentLarge onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <ModalTitle>Gestionar Variantes</ModalTitle>
                <ModalSubtitle>Producto: {productoVariante.nombre || productoVariante.descripcion}</ModalSubtitle>
              </div>
              <CloseButton onClick={() => !guardandoVariantes && setModalVariante(false)} disabled={guardandoVariantes}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>
            {cargandoVariantes && <ProgressBar />}
            <ModalBody>
              {cargandoVariantes ? (
                <LoadingPlaceholder>
                  <Icon icon="lucide:loader-2" className="spin" />
                  <span>Cargando variantes...</span>
                </LoadingPlaceholder>
              ) : (
                <>
                  {/* Variantes Existentes */}
                  {dataVariantes.length > 0 && (
                    <Section>
                      <SectionTitleRow>
                        <SectionTitle>
                          <Icon icon="lucide:check-circle" style={{ color: "#10b981" }} />
                          Variantes existentes ({dataVariantes.length})
                        </SectionTitle>
                        <SelectionActions>
                          <SelectAllBtn onClick={toggleSeleccionarTodas}>
                            <Checkbox $checked={variantesSeleccionadas.length === dataVariantes.length && dataVariantes.length > 0}>
                              {variantesSeleccionadas.length === dataVariantes.length && dataVariantes.length > 0 && (
                                <Icon icon="lucide:check" />
                              )}
                            </Checkbox>
                            {variantesSeleccionadas.length === dataVariantes.length ? "Deseleccionar todas" : "Seleccionar todas"}
                          </SelectAllBtn>
                          {variantesSeleccionadas.length > 0 && (
                            <DeleteSelectedBtn 
                              onClick={handleEliminarSeleccionadas}
                              disabled={eliminandoVariantes}
                            >
                              {eliminandoVariantes ? (
                                <>
                                  <Icon icon="lucide:loader-2" className="spin" />
                                  Eliminando...
                                </>
                              ) : (
                                <>
                                  <Icon icon="lucide:trash-2" />
                                  Eliminar ({variantesSeleccionadas.length})
                                </>
                              )}
                            </DeleteSelectedBtn>
                          )}
                        </SelectionActions>
                      </SectionTitleRow>
                      <VariantesExistentesGrid>
                        {dataVariantes.map((v) => (
                          <VarianteExistenteCard 
                            key={v.id} 
                            $selected={variantesSeleccionadas.includes(v.id)}
                            onClick={() => toggleSeleccionVariante(v.id)}
                          >
                            <Checkbox $checked={variantesSeleccionadas.includes(v.id)}>
                              {variantesSeleccionadas.includes(v.id) && (
                                <Icon icon="lucide:check" />
                              )}
                            </Checkbox>
                            <VarianteInfo>
                              <VarianteNombre>{v.nombre}</VarianteNombre>
                              <VarianteDetalles>
                                <span>SKU: {v.codigo_barras || "Sin SKU"}</span>
                                <span>Precio: S/ {v.precio_venta?.toFixed(2)}</span>
                              </VarianteDetalles>
                            </VarianteInfo>
                            <SmallActionBtn 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarVarianteExistente(v);
                              }}
                              title="Eliminar variante"
                            >
                              <Icon icon="lucide:trash-2" />
                            </SmallActionBtn>
                          </VarianteExistenteCard>
                        ))}
                      </VariantesExistentesGrid>
                    </Section>
                  )}

                  {/* Crear nuevas variantes */}
                  <Section>
                    <SectionTitle>
                      <Icon icon="lucide:plus-circle" />
                      {dataVariantes.length > 0 ? "Agregar más variantes" : "Crear variantes"}
                    </SectionTitle>
                    <SectionSubtitle>1. Selecciona los atributos</SectionSubtitle>
                    <AtributosSelectGrid>
                      {dataAtributos.map((attr) => (
                        <AtributoSelectCard
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
                        </AtributoSelectCard>
                      ))}
                    </AtributosSelectGrid>
                    <BtnPrimary
                      onClick={handleGenerarVariantes}
                      disabled={atributosSeleccionados.length === 0}
                      style={{ marginTop: 16 }}
                    >
                      <Icon icon="lucide:layers" />
                      Generar Combinaciones
                    </BtnPrimary>
                  </Section>

                  {variantes.length > 0 && (
                    <Section>
                      <SectionSubtitle>2. Configura cada variante ({variantes.length})</SectionSubtitle>
                      <GenerarTodosBtn onClick={() => {
                        const newVariantes = variantes.map((v, idx) => ({
                          ...v,
                          sku: v.sku || Generarcodigo({ id: productoVariante.id + idx + Date.now() })
                        }));
                        setVariantes(newVariantes);
                        toast.success("SKUs generados automáticamente");
                      }}>
                        <Icon icon="lucide:wand-2" />
                        Generar todos los SKU
                      </GenerarTodosBtn>
                      <VariantesTable>
                        <thead>
                          <tr>
                            <th>Combinación</th>
                            <th>SKU</th>
                            <th>Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantes.map((v, idx) => (
                            <tr key={idx}>
                              <td>{v.combinacion.map((c) => c.valor).join(" / ")}</td>
                              <td>
                                <SkuInputGroup>
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
                                  <GenerarSkuBtn 
                                    type="button"
                                    title="Generar SKU"
                                    onClick={() => {
                                      const newVariantes = [...variantes];
                                      newVariantes[idx].sku = Generarcodigo({ id: productoVariante.id + idx + Date.now() });
                                      setVariantes(newVariantes);
                                    }}
                                  >
                                    <Icon icon="lucide:shuffle" />
                                  </GenerarSkuBtn>
                                </SkuInputGroup>
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
                            </tr>
                          ))}
                        </tbody>
                      </VariantesTable>
                      <StockNote>
                        <Icon icon="lucide:info" />
                        El stock de las variantes se gestiona desde el módulo de Inventario
                      </StockNote>
                    </Section>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <BtnSecondary onClick={() => setModalVariante(false)} disabled={guardandoVariantes}>
                {dataVariantes.length > 0 && variantes.length === 0 ? "Cerrar" : "Cancelar"}
              </BtnSecondary>
              {variantes.length > 0 && (
                <BtnPrimary onClick={handleGuardarVariantes} disabled={guardandoVariantes}>
                  {guardandoVariantes ? (
                    <>
                      <Icon icon="lucide:loader-2" className="spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:save" />
                      Guardar Variantes ({variantes.length})
                    </>
                  )}
                </BtnPrimary>
              )}
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
          <HeaderInfo>
            <Title>Variantes de Productos</Title>
            <Subtitle>
              {dataAtributos.length} {dataAtributos.length === 1 ? "atributo activo" : "atributos activos"}
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
              placeholder="Buscar atributo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <ClearSearchBtn onClick={() => setBusqueda("")}>
                <Icon icon="lucide:x" />
              </ClearSearchBtn>
            )}
          </SearchWrapper>
        </HeaderRight>
      </Header>

      {/* Toolbar */}
      <Toolbar>
        <ToolbarLeft>
          <Tabs>
            <Tab $active={tab === "activos"} onClick={() => cambiarTab("activos")}>
              <Icon icon="lucide:tag" />
              <span>Atributos</span>
              <TabBadge $active={tab === "activos"}>{dataAtributos.length}</TabBadge>
            </Tab>
            <Tab $active={tab === "inactivos"} onClick={() => cambiarTab("inactivos")}>
              <Icon icon="lucide:archive-x" />
              <span>Inactivos</span>
              <TabBadge $active={tab === "inactivos"}>{dataAtributosInactivos.length}</TabBadge>
            </Tab>
            <Tab $active={tab === "productos"} onClick={() => cambiarTab("productos")}>
              <Icon icon="lucide:package" />
              <span>Productos</span>
              <TabBadge $active={tab === "productos"}>{productosConVariantes.length}</TabBadge>
            </Tab>
          </Tabs>
        </ToolbarLeft>
        <ToolbarRight>
          {tab === "activos" && (
            <BtnPrimary onClick={() => setModalAtributo(true)}>
              <Icon icon="lucide:plus" />
              Nuevo Atributo
            </BtnPrimary>
          )}
        </ToolbarRight>
      </Toolbar>

      {/* Content */}
      <ContentCard>
        {tab === "activos" && (
          <>
            {atributosFiltrados.length > 0 ? (
              <AtributosGrid>
                {atributosFiltrados.map((attr) => (
                  <AtributoCard key={attr.id}>
                    <AtributoCardHeader>
                      <AtributoIcon>
                        <Icon icon="lucide:tag" />
                      </AtributoIcon>
                      <AtributoInfo>
                        <AtributoNombre>{attr.nombre}</AtributoNombre>
                        <AtributoCount>
                          {attr.atributo_valores?.length || 0} valores
                        </AtributoCount>
                      </AtributoInfo>
                      <AtributoActions>
                        <ActionBtn onClick={() => handleAbrirValores(attr)} title="Gestionar valores">
                          <Icon icon="lucide:list" />
                        </ActionBtn>
                        <ActionBtn onClick={() => handleAbrirEditarAtributo(attr)} title="Editar">
                          <Icon icon="lucide:pencil" />
                        </ActionBtn>
                        <ActionBtn $danger onClick={() => handleEliminarAtributo(attr)} title="Eliminar">
                          <Icon icon="lucide:trash-2" />
                        </ActionBtn>
                      </AtributoActions>
                    </AtributoCardHeader>
                    <AtributoValores>
                      {attr.atributo_valores?.slice(0, 6).map((v) => (
                        <ValorTag key={v.id}>{v.valor}</ValorTag>
                      ))}
                      {(attr.atributo_valores?.length || 0) > 6 && (
                        <ValorTag $more>+{attr.atributo_valores.length - 6}</ValorTag>
                      )}
                    </AtributoValores>
                  </AtributoCard>
                ))}
              </AtributosGrid>
            ) : (
              <EmptyState>
                <Icon icon="lucide:tag" />
                <h3>No hay atributos</h3>
                <p>Crea atributos como Color, Talla, Material para tus productos</p>
                <BtnPrimary onClick={() => setModalAtributo(true)}>
                  <Icon icon="lucide:plus" />
                  Crear primer atributo
                </BtnPrimary>
              </EmptyState>
            )}
          </>
        )}

        {tab === "inactivos" && (
          <>
            {dataAtributosInactivos.length > 0 ? (
              <InactivosGrid>
                {dataAtributosInactivos.map((attr) => (
                  <InactivoCard key={attr.id}>
                    <InactivoHeader>
                      <InactivoIcon>
                        <Icon icon="lucide:tag" />
                      </InactivoIcon>
                      <InactivoInfo>
                        <InactivoNombre>{attr.nombre}</InactivoNombre>
                        <InactivoCount>{attr.atributo_valores?.length || 0} valores</InactivoCount>
                      </InactivoInfo>
                    </InactivoHeader>
                    {attr.atributo_valores?.length > 0 && (
                      <ValoresPreview>
                        {attr.atributo_valores.slice(0, 4).map((val) => (
                          <ValorChipSmall key={val.id}>{val.valor}</ValorChipSmall>
                        ))}
                        {attr.atributo_valores.length > 4 && (
                          <ValorChipSmall>+{attr.atributo_valores.length - 4}</ValorChipSmall>
                        )}
                      </ValoresPreview>
                    )}
                    <RestoreBtn onClick={() => handleRestaurarAtributo(attr)}>
                      <Icon icon="lucide:rotate-ccw" />
                      Restaurar
                    </RestoreBtn>
                  </InactivoCard>
                ))}
              </InactivosGrid>
            ) : (
              <EmptyState>
                <Icon icon="lucide:inbox" />
                <h3>No hay atributos inactivos</h3>
                <p>Los atributos eliminados aparecerán aquí</p>
              </EmptyState>
            )}
          </>
        )}

        {tab === "productos" && (
          <>
            {loadingProductos ? (
              <Spinner1 />
            ) : productosConVariantes.length > 0 ? (
              <ProductosGrid>
                {productosConVariantes.map((producto) => (
                  <ProductoCard key={producto.id}>
                    <ProductoInfo>
                      <ProductoNombre>{producto.nombre || producto.descripcion}</ProductoNombre>
                      <ProductoDetalles>
                        <span>SKU: {producto.codigo_barras || producto.codigobarras || "N/A"}</span>
                        <span>Precio: S/ {producto.precio_venta?.toFixed(2)}</span>
                      </ProductoDetalles>
                    </ProductoInfo>
                    <BtnSecondary onClick={() => handleSeleccionarProducto(producto)}>
                      <Icon icon="lucide:settings" />
                      Gestionar Variantes
                    </BtnSecondary>
                  </ProductoCard>
                ))}
              </ProductosGrid>
            ) : (
              <EmptyState>
                <Icon icon="lucide:package" />
                <h3>No hay productos con variantes</h3>
                <p>
                  Activa &quot;Maneja variantes&quot; en los productos que necesiten
                  diferentes presentaciones
                </p>
              </EmptyState>
            )}
          </>
        )}
      </ContentCard>
    </Container>
  );
}

// =====================================================
// STYLED COMPONENTS - Minimalista Neutro
// =====================================================

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
  flex-direction: column;
  gap: 20px;
  margin-bottom: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
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
  width: 52px;
  height: 52px;
  background: #f3f4f6;
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #111827;
  }
`;

const HeaderInfo = styled.div``;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 4px 0 0 0;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #9ca3af;
  display: flex;
  align-items: center;

  svg {
    font-size: 18px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-width: 280px;
  padding: 12px 40px 12px 44px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  background: #f9fafb;
  color: #111827;
  transition: all 0.2s ease;

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: #111827;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1);
  }
`;

const ClearSearchBtn = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #6b7280;
    background: #f3f4f6;
  }

  svg {
    font-size: 16px;
  }
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  flex-wrap: wrap;
  gap: 12px;
`;

const ToolbarLeft = styled.div`
  display: flex;
  gap: 8px;
`;

const ToolbarRight = styled.div`
  display: flex;
  gap: 8px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  background: ${({ $active }) => ($active ? '#111827' : '#f9fafb')};
  color: ${({ $active }) => ($active ? '#fff' : '#6b7280')};
  border: 1px solid ${({ $active }) => ($active ? '#111827' : '#e5e7eb')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 18px; }

  &:hover {
    background: ${({ $active }) => ($active ? '#111827' : '#f3f4f6')};
    border-color: ${({ $active }) => ($active ? '#111827' : '#d1d5db')};
  }
`;

const TabBadge = styled.span`
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $active }) => ($active ? 'rgba(255,255,255,0.2)' : '#e5e7eb')};
  border-radius: 10px;
`;

const ContentCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 24px;
`;

const AtributosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const AtributoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const AtributoCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AtributoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #111827;
  border-radius: 10px;

  svg {
    font-size: 20px;
    color: #fff;
  }
`;

const AtributoInfo = styled.div`
  flex: 1;
`;

const AtributoNombre = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  display: block;
`;

const AtributoCount = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const AtributoActions = styled.div`
  display: flex;
  gap: 4px;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${({ $danger }) => ($danger ? '#fef2f2' : '#f3f4f6')};
  color: ${({ $danger }) => ($danger ? '#dc2626' : '#6b7280')};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 16px; }

  &:hover {
    background: ${({ $danger }) => ($danger ? '#fee2e2' : '#e5e7eb')};
    color: ${({ $danger }) => ($danger ? '#b91c1c' : '#111827')};
  }
`;

const SmallActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  min-width: 26px;
  background: #fef2f2;
  color: #ef4444;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 13px; }

  &:hover {
    background: #fee2e2;
    color: #dc2626;
  }
`;

const AtributoValores = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ValorTag = styled.span`
  padding: 4px 10px;
  background: ${({ $more }) => ($more ? '#111827' : '#e5e7eb')};
  color: ${({ $more }) => ($more ? '#fff' : '#374151')};
  border-radius: 20px;
  font-size: 12px;
`;

const InactivosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const InactivoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
`;

const InactivoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InactivoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #e5e7eb;
  border-radius: 10px;

  svg {
    font-size: 20px;
    color: #6b7280;
  }
`;

const InactivoInfo = styled.div`
  flex: 1;
`;

const InactivoNombre = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  display: block;
`;

const InactivoCount = styled.span`
  font-size: 12px;
  color: #9ca3af;
`;

const ValoresPreview = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const ValorChipSmall = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 12px;
`;

const RestoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 16px; }

  &:hover {
    background: #1f2937;
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
  justify-content: space-between;
  padding: 16px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #111827;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const ProductoInfo = styled.div`
  flex: 1;
`;

const ProductoNombre = styled.h3`
  margin: 0 0 4px;
  color: #111827;
  font-size: 1rem;
  font-weight: 600;
`;

const ProductoDetalles = styled.div`
  display: flex;
  gap: 16px;

  span {
    font-size: 0.875rem;
    color: #6b7280;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;

  svg {
    font-size: 48px;
    opacity: 0.5;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    color: #374151;
    font-weight: 600;
  }

  p {
    margin: 0 0 24px;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

  svg { font-size: 18px; }
  
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
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 18px; }

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
`;

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
  border: 1px solid #e5e7eb;
`;

const ModalContentLarge = styled(ModalContent)`
  max-width: 800px;
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
  font-size: 1.25rem;
  color: #111827;
  font-weight: 600;
`;

const ModalSubtitle = styled.p`
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 0.875rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #111827;
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
  border-top: 1px solid #e5e7eb;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  color: #111827;

  &:focus {
    outline: none;
    border-color: #111827;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1);
  }
`;

const SmallInput = styled(Input)`
  padding: 8px 12px;
  font-size: 13px;
`;

const SkuInputGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const GenerarSkuBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;

  &:hover {
    background: #e5e7eb;
    color: #111827;
  }

  svg { font-size: 14px; }
`;

const GenerarTodosBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 12px;
  transition: all 0.15s;

  &:hover {
    background: #e5e7eb;
  }

  svg { font-size: 14px; }
`;

const StockNote = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-top: 16px;
  font-size: 13px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;

  svg { font-size: 16px; color: #9ca3af; }
`;

const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
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
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

const VariantesExistentesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
`;

const VarianteExistenteCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: ${props => props.$selected ? '#eff6ff' : '#f9fafb'};
  border: 1px solid ${props => props.$selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${props => props.$selected ? '#dbeafe' : '#f3f4f6'};
    border-color: ${props => props.$selected ? '#3b82f6' : '#d1d5db'};
  }
`;

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
`;

const SelectionActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SelectAllBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 11px;
  color: #6b7280;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
`;

const DeleteSelectedBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: #ef4444;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 13px; }

  .spin {
    animation: ${spinAnimation} 1s linear infinite;
  }

  &:hover:not(:disabled) {
    background: #dc2626;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Checkbox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  min-width: 16px;
  background: ${props => props.$checked ? '#3b82f6' : '#fff'};
  border: 1.5px solid ${props => props.$checked ? '#3b82f6' : '#d1d5db'};
  border-radius: 3px;
  transition: all 0.15s;

  svg {
    font-size: 10px;
    color: #fff;
  }
`;

const VarianteInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const VarianteNombre = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const VarianteDetalles = styled.div`
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #9ca3af;
`;

const SectionSubtitle = styled.p`
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
`;

const HelpText = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: #6b7280;
`;

const Section = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;

const AddValueRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const ValoresList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ValorItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const ValorText = styled.span`
  font-size: 14px;
  color: #111827;
`;

const ValorActions = styled.div`
  display: flex;
  gap: 4px;
`;

const ValorEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  input {
    flex: 1;
  }
`;

const EmptyMessage = styled.p`
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 24px;
`;

const AtributosSelectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const AtributoSelectCard = styled.div`
  padding: 16px;
  border: 2px solid ${(props) => (props.$selected ? "#111827" : "#e5e7eb")};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) => (props.$selected ? "#f9fafb" : "#fff")};

  &:hover {
    border-color: #111827;
  }

  h4 {
    margin: 0 0 12px;
    color: #111827;
    font-size: 14px;
  }
`;

const ValoresTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Tag = styled.span`
  padding: 4px 10px;
  background: #e5e7eb;
  color: #374151;
  border-radius: 20px;
  font-size: 11px;
`;

const VariantesTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f9fafb;
    font-weight: 500;
    color: #6b7280;
    font-size: 12px;
    text-transform: uppercase;
  }

  td {
    font-size: 14px;
    color: #111827;
  }
`;
