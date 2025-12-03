import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Swal from "sweetalert2";

import { useProductosStore } from "../../../store/ProductosStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useSucursalesStore } from "../../../store/SucursalesStore";
import { useCategoriasStore } from "../../../store/CategoriasStore";
import { useAlmacenesStore } from "../../../store/AlmacenesStore";
import { useStockStore } from "../../../store/StockStore";
import { ConvertirMinusculas } from "../../../index";
import { SelectList } from "../../ui/lists/SelectList";

export function RegistrarProductos({
  onClose,
  dataSelect,
  accion,
  setIsExploding,
  state,
}) {
  const [sevendepor, setSevendepor] = useState("UNIDAD");
  const [stateInventarios, setStateInventarios] = useState(false);
  const [stateEnabledStock, setStateEnabledStock] = useState(false);
  const [randomCodeinterno, setRandomCodeinterno] = useState("");
  const [randomCodebarras, setRandomCodebarras] = useState("");

  const { insertarProductos, editarProductos, generarCodigo, codigogenerado, refetchs } = useProductosStore();
  const { insertarStock, mostrarStockXAlmacenYProducto } = useStockStore();
  const { dataempresa } = useEmpresaStore();
  const { mostrarAlmacenesXSucursal, almacenSelectItem, setAlmacenSelectItem } = useAlmacenesStore();
  const { dataSucursales, selectSucursal, sucursalesItemSelect } = useSucursalesStore();
  const { datacategorias, selectCategoria, categoriaItemSelect } = useCategoriasStore();

  const { data: dataStockXAlmacenYProducto } = useQuery({
    queryKey: ["mostrar stock almacen y producto", { id_producto: dataSelect?.id, id_almacen: almacenSelectItem?.id }],
    queryFn: () => mostrarStockXAlmacenYProducto({ id_almacen: almacenSelectItem?.id, id_producto: dataSelect?.id }),
    enabled: !!almacenSelectItem?.id && !!dataSelect?.id,
  });

  const { data: dataAlmacenes } = useQuery({
    queryKey: ["mostrar almacenes x sucursal", { id_sucursal: sucursalesItemSelect?.id }],
    queryFn: () => mostrarAlmacenesXSucursal({ id_sucursal: sucursalesItemSelect?.id }),
    enabled: !!sucursalesItemSelect?.id,
  });

  const { register, formState: { errors }, handleSubmit } = useForm();

  const { isPending, mutate: doInsertar } = useMutation({
    mutationFn: insertar,
    mutationKey: "insertar productos",
    onError: (error) => toast.error(`Error: ${error.message}`),
    onSuccess: () => {
      toast.success("Producto guardado");
      onClose();
      setIsExploding(true);
    },
  });

  async function insertar(data) {
    if (!randomCodeinterno) generarCodigoInterno();
    if (!randomCodebarras) generarCodigoBarras();
    if (data.precio_venta?.trim() === "") data.precio_venta = 0;
    if (data.precio_compra?.trim() === "") data.precio_compra = 0;

    if (accion === "Editar") {
      const p = {
        _id: dataSelect.id,
        _nombre: ConvertirMinusculas(data.nombre),
        _precio_venta: parseFloat(data.precio_venta),
        _precio_compra: parseFloat(data.precio_compra),
        _id_categoria: categoriaItemSelect.id,
        _codigo_barras: randomCodebarras || codigogenerado,
        _codigo_interno: randomCodeinterno || codigogenerado,
        _id_empresa: dataempresa.id,
        _sevende_por: sevendepor,
        _maneja_inventarios: stateInventarios,
      };
      await editarProductos(p);
      if (stateInventarios && !dataStockXAlmacenYProducto) {
        await insertarStock({
          id_almacen: almacenSelectItem?.id,
          id_producto: dataSelect?.id,
          stock: parseFloat(data.stock || 0),
          stock_minimo: parseFloat(data.stock_minimo || 0),
          ubicacion: data.ubicacion || "",
        });
      }
    } else {
      const p = {
        _nombre: ConvertirMinusculas(data.nombre),
        _precio_venta: parseFloat(data.precio_venta),
        _precio_compra: parseFloat(data.precio_compra),
        _id_categoria: categoriaItemSelect.id,
        _codigo_barras: randomCodebarras || codigogenerado,
        _codigo_interno: randomCodeinterno || codigogenerado,
        _id_empresa: dataempresa.id,
        _sevende_por: sevendepor,
        _maneja_inventarios: stateInventarios,
        _maneja_multiprecios: false,
      };
      const id_producto_nuevo = await insertarProductos(p);
      if (stateInventarios) {
        await insertarStock({
          id_almacen: almacenSelectItem?.id,
          id_producto: id_producto_nuevo,
          stock: parseFloat(data.stock || 0),
          stock_minimo: parseFloat(data.stock_minimo || 0),
          ubicacion: data.ubicacion || "",
        });
      }
    }
  }

  function generarCodigoBarras() {
    generarCodigo();
    setRandomCodebarras(codigogenerado);
  }

  function generarCodigoInterno() {
    generarCodigo();
    setRandomCodeinterno(codigogenerado);
  }

  useEffect(() => {
    if (accion !== "Editar") {
      generarCodigoInterno();
    } else {
      selectCategoria({ id: dataSelect.id_categoria, nombre: dataSelect.categoria });
      setRandomCodeinterno(dataSelect.codigo_interno);
      setRandomCodebarras(dataSelect.codigo_barras);
      setSevendepor(dataSelect.sevende_por);
      setStateInventarios(dataSelect.maneja_inventarios);
      setStateEnabledStock(dataSelect.maneja_inventarios);
    }
  }, []);

  // Cuando cambian los almacenes disponibles, seleccionar el primero
  useEffect(() => {
    if (dataAlmacenes && dataAlmacenes.length > 0) {
      setAlmacenSelectItem(dataAlmacenes[0]);
    } else {
      setAlmacenSelectItem(null);
    }
  }, [dataAlmacenes, setAlmacenSelectItem]);

  // Función para confirmar cierre con cambios sin guardar
  const handleCerrarConConfirmacion = async () => {
    const result = await Swal.fire({
      title: '¿Salir sin guardar?',
      text: 'Si sales ahora, perderás la información ingresada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#111',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Seguir editando',
      reverseButtons: true,
    });
    
    if (result.isConfirmed) {
      refetchs();
      onClose();
    }
  };

  // Early return after all hooks
  if (!state) return null;

  return (
    <Overlay onClick={handleCerrarConConfirmacion}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <HeaderTitle>
            <Icon icon="lucide:package-plus" />
            {accion === "Editar" ? "Editar producto" : "Nuevo producto"}
          </HeaderTitle>
          <CloseBtn onClick={handleCerrarConConfirmacion}>
            <Icon icon="lucide:x" />
          </CloseBtn>
        </Header>

        {/* Form */}
        <Form onSubmit={handleSubmit(doInsertar)}>
          <FormGrid>
            {/* Nombre */}
            <InputGroup $full>
              <Label>Nombre del producto</Label>
              <InputWrapper>
                <InputIcon><Icon icon="lucide:tag" /></InputIcon>
                <Input
                  placeholder="Ej: Coca Cola 500ml"
                  defaultValue={dataSelect?.nombre}
                  {...register("nombre", { required: true })}
                />
              </InputWrapper>
              {errors.nombre && <ErrorText>Campo requerido</ErrorText>}
            </InputGroup>

            {/* Precios */}
            <InputGroup>
              <Label>Precio venta</Label>
              <InputWrapper>
                <InputIcon><Icon icon="lucide:dollar-sign" /></InputIcon>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={dataSelect?.precio_venta}
                  {...register("precio_venta")}
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <Label>Precio compra</Label>
              <InputWrapper>
                <InputIcon><Icon icon="lucide:receipt" /></InputIcon>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={dataSelect?.precio_compra}
                  {...register("precio_compra")}
                />
              </InputWrapper>
            </InputGroup>

            {/* Códigos */}
            <InputGroup>
              <Label>Código de barras</Label>
              <InputWrapper>
                <InputIcon><Icon icon="lucide:barcode" /></InputIcon>
                <Input
                  type="number"
                  placeholder="EAN/UPC"
                  value={randomCodebarras}
                  onChange={(e) => setRandomCodebarras(e.target.value)}
                />
                <GenBtn type="button" onClick={generarCodigoBarras}>
                  <Icon icon="lucide:refresh-cw" />
                </GenBtn>
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <Label>Código interno</Label>
              <InputWrapper>
                <InputIcon><Icon icon="lucide:hash" /></InputIcon>
                <Input
                  type="number"
                  placeholder="SKU"
                  value={randomCodeinterno}
                  onChange={(e) => setRandomCodeinterno(e.target.value)}
                />
                <GenBtn type="button" onClick={generarCodigoInterno}>
                  <Icon icon="lucide:refresh-cw" />
                </GenBtn>
              </InputWrapper>
            </InputGroup>

            {/* Categoría */}
            <InputGroup>
              <Label>Categoría</Label>
              <SelectList
                data={datacategorias}
                itemSelect={categoriaItemSelect}
                onSelect={selectCategoria}
                displayField="nombre"
              />
            </InputGroup>

            {/* Se vende por */}
            <InputGroup>
              <Label>Se vende por</Label>
              <ToggleGroup>
                <ToggleBtn 
                  type="button"
                  $active={sevendepor === "UNIDAD"}
                  onClick={() => setSevendepor("UNIDAD")}
                >
                  <Icon icon="lucide:box" /> Unidad
                </ToggleBtn>
                <ToggleBtn 
                  type="button"
                  $active={sevendepor === "GRANEL"}
                  onClick={() => setSevendepor("GRANEL")}
                >
                  <Icon icon="lucide:scale" /> Granel
                </ToggleBtn>
              </ToggleGroup>
            </InputGroup>
          </FormGrid>

          {/* Control de stock */}
          <StockToggle>
            <StockToggleInfo>
              <Icon icon="lucide:warehouse" />
              <div>
                <span>Control de inventario</span>
                <small>Gestionar stock del producto</small>
              </div>
            </StockToggleInfo>
            <Switch 
              $active={stateInventarios} 
              onClick={() => setStateInventarios(!stateInventarios)}
            >
              <SwitchKnob $active={stateInventarios} />
            </Switch>
          </StockToggle>

          {/* Stock fields */}
          {stateInventarios && (
            <StockSection>
              <StockGrid>
                <InputGroup>
                  <Label>Sucursal</Label>
                  <SelectList
                    data={dataSucursales}
                    itemSelect={sucursalesItemSelect}
                    onSelect={selectSucursal}
                    displayField="nombre"
                  />
                </InputGroup>

                <InputGroup>
                  <Label>Almacén</Label>
                  <SelectList
                    data={dataAlmacenes}
                    itemSelect={almacenSelectItem}
                    onSelect={setAlmacenSelectItem}
                    displayField="nombre"
                  />
                </InputGroup>
              </StockGrid>

              {stateEnabledStock && dataStockXAlmacenYProducto ? (
                <StockWarning>
                  <Icon icon="lucide:info" />
                  Edite el stock desde el módulo Kardex
                </StockWarning>
              ) : (
                <StockGrid>
                  <InputGroup>
                    <Label>Stock inicial</Label>
                    <InputWrapper>
                      <InputIcon><Icon icon="lucide:layers" /></InputIcon>
                      <Input type="number" step="0.01" placeholder="0" {...register("stock")} />
                    </InputWrapper>
                  </InputGroup>

                  <InputGroup>
                    <Label>Stock mínimo</Label>
                    <InputWrapper>
                      <InputIcon><Icon icon="lucide:alert-triangle" /></InputIcon>
                      <Input type="number" step="0.01" placeholder="0" {...register("stock_minimo")} />
                    </InputWrapper>
                  </InputGroup>

                  <InputGroup $full>
                    <Label>Ubicación</Label>
                    <InputWrapper>
                      <InputIcon><Icon icon="lucide:map-pin" /></InputIcon>
                      <Input placeholder="Ej: Estante A-3" {...register("ubicacion")} />
                    </InputWrapper>
                  </InputGroup>
                </StockGrid>
              )}
            </StockSection>
          )}

          {/* Actions */}
          <Actions>
            <CancelBtn type="button" onClick={onClose}>Cancelar</CancelBtn>
            <SubmitBtn type="submit" disabled={isPending}>
              {isPending ? (
                <><Icon icon="lucide:loader-2" className="spin" /> Guardando...</>
              ) : (
                <><Icon icon="lucide:check" /> Guardar</>
              )}
            </SubmitBtn>
          </Actions>
        </Form>
      </Modal>
    </Overlay>
  );
}

// Styles
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
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
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
`;

const HeaderTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0;
  
  svg { font-size: 22px; color: #666; }
`;

const CloseBtn = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  
  svg { font-size: 20px; color: #666; }
  &:hover { background: #eee; }
`;

const Form = styled.form`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${({ $full }) => ($full ? "1 / -1" : "auto")};
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #333;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: #fafafa;
  border: 2px solid #e5e5e5;
  border-radius: 10px;
  transition: all 0.15s;
  
  &:focus-within {
    border-color: #111;
    background: #fff;
  }
`;

const InputIcon = styled.div`
  padding-left: 12px;
  color: #999;
  svg { font-size: 18px; }
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  font-size: 14px;
  border: none;
  background: transparent;
  outline: none;
  
  &::placeholder { color: #bbb; }
`;

const GenBtn = styled.button`
  padding: 8px 12px;
  margin-right: 4px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  
  svg { font-size: 16px; color: #666; }
  &:hover { background: #e5e5e5; }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #dc2626;
`;

const ToggleGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ToggleBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  font-size: 13px;
  font-weight: 500;
  background: ${({ $active }) => ($active ? "#111" : "#f5f5f5")};
  color: ${({ $active }) => ($active ? "#fff" : "#666")};
  border: 2px solid ${({ $active }) => ($active ? "#111" : "#e5e5e5")};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  
  svg { font-size: 16px; }
  &:hover { border-color: #111; }
`;

const StockToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
`;

const StockToggleInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  > svg { font-size: 22px; color: #666; }
  
  div {
    span { display: block; font-size: 14px; font-weight: 500; color: #333; }
    small { font-size: 12px; color: #999; }
  }
`;

const Switch = styled.div`
  width: 48px;
  height: 26px;
  background: ${({ $active }) => ($active ? "#111" : "#ddd")};
  border-radius: 13px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
`;

const SwitchKnob = styled.div`
  width: 22px;
  height: 22px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: ${({ $active }) => ($active ? "24px" : "2px")};
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const StockSection = styled.div`
  padding: 16px;
  background: #f9fafb;
  border: 1px dashed #e5e5e5;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StockGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const StockWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  font-size: 13px;
  
  svg { font-size: 18px; }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #eee;
`;

const CancelBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover { background: #eee; }
`;

const SubmitBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  
  svg { font-size: 18px; }
  
  &:hover:not(:disabled) { background: #222; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

