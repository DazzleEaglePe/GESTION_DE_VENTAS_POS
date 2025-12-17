import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useGlobalStore } from "../../../store/GlobalStore";
import { useProductosStore } from "../../../store/ProductosStore";
import { useMovStockStore } from "../../../store/MovStockStore";
import { useInsertarMovStockMutation } from "../../../tanstack/MovStockStack";
import { useAlmacenesStore } from "../../../store/AlmacenesStore";
import { useStockStore } from "../../../store/StockStore";
import { useSucursalesStore } from "../../../store/SucursalesStore";
import { useClientesProveedoresStore } from "../../../store/ClientesProveedoresStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useQuery } from "@tanstack/react-query";
import { SelectList } from "../../ui/lists/SelectList";
import Swal from "sweetalert2";

export function RegistrarInventario({ setIsExploding }) {
  const { setStateClose } = useGlobalStore();
  const { productosItemSelect } = useProductosStore();
  const { tipo, setTipo } = useMovStockStore();
  const { almacenSelectItem, mostrarAlmacenesXSucursal, setAlmacenSelectItem, dataAlmacenesXsucursal } = useAlmacenesStore();
  const { mostrarStockXAlmacenYProducto, dataStockXAlmacenYProducto } = useStockStore();
  const { sucursalesItemSelect, dataSucursales, selectSucursal } = useSucursalesStore();
  const { buscarCliPro } = useClientesProveedoresStore();
  const { dataempresa } = useEmpresaStore();
  
  // Determinar si el producto se vende por granel (permite decimales)
  const esGranel = productosItemSelect?.sevende_por === "GRANEL";
  
  // Estado para proveedor
  const [proveedorSelect, setProveedorSelect] = useState(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");

  const {
    register,
    formState: { errors },
    handleSubmit,
    watch,
  } = useForm();

  // Cargar almacenes de la sucursal
  const { data: dataAlmacenes } = useQuery({
    queryKey: ["mostrar almacenes X sucursal inventario", sucursalesItemSelect?.id],
    queryFn: () => mostrarAlmacenesXSucursal({ id_sucursal: sucursalesItemSelect?.id }),
    enabled: !!sucursalesItemSelect?.id,
  });

  // Cargar stock actual del producto en el almacén seleccionado
  useQuery({
    queryKey: [
      "mostrar stock X almacen Y producto",
      almacenSelectItem?.id,
      productosItemSelect?.id,
    ],
    queryFn: () =>
      mostrarStockXAlmacenYProducto({
        id_almacen: almacenSelectItem?.id,
        id_producto: productosItemSelect?.id,
      }),
    enabled: !!almacenSelectItem?.id && !!productosItemSelect?.id,
  });

  // Buscar proveedores
  const { data: dataProveedores } = useQuery({
    queryKey: ["buscar proveedores inventario", busquedaProveedor],
    queryFn: () => buscarCliPro({ 
      id_empresa: dataempresa?.id, 
      tipo: "proveedor",
      buscador: busquedaProveedor 
    }),
    enabled: !!dataempresa?.id && busquedaProveedor.length > 0,
  });

  const mutation = useInsertarMovStockMutation(proveedorSelect);

  const handlesub = (data) => {
    mutation.mutate(data, {
      onSuccess: () => {
        setIsExploding?.(true);
        setStateClose(false);
      },
    });
  };

  const handleClose = async () => {
    const formValues = watch();
    const hayCambios = formValues.cantidad || formValues.motivo || proveedorSelect;
    
    if (hayCambios) {
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
        setStateClose(false);
      }
    } else {
      setStateClose(false);
    }
  };

  return (
    <Overlay onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <HeaderTitle>
            <Icon icon="lucide:package-plus" />
            Registrar Movimiento
          </HeaderTitle>
          <CloseBtn onClick={handleClose}>
            <Icon icon="lucide:x" />
          </CloseBtn>
        </Header>

        {productosItemSelect?.nombre ? (
          <Form onSubmit={handleSubmit(handlesub)}>
            {/* Info del producto */}
            <ProductInfo>
              <InfoItem>
                <Icon icon="lucide:package" width="18" />
                <div>
                  <label>Producto</label>
                  <strong>{productosItemSelect?.nombre}</strong>
                </div>
              </InfoItem>
              <InfoItem>
                <Icon icon="lucide:layers" width="18" />
                <div>
                  <label>Stock actual</label>
                  <strong>{dataStockXAlmacenYProducto?.stock ?? 0}</strong>
                </div>
              </InfoItem>
            </ProductInfo>

            {/* Tipo de movimiento */}
            <InputGroup>
              <Label>Tipo de movimiento</Label>
              <TypeToggle>
                <TypeBtn
                  type="button"
                  $active={tipo === "ingreso"}
                  $variant="ingreso"
                  onClick={() => setTipo("ingreso")}
                >
                  <Icon icon="lucide:arrow-down-circle" width="18" />
                  Ingreso
                </TypeBtn>
                <TypeBtn
                  type="button"
                  $active={tipo === "egreso"}
                  $variant="egreso"
                  onClick={() => setTipo("egreso")}
                >
                  <Icon icon="lucide:arrow-up-circle" width="18" />
                  Egreso
                </TypeBtn>
              </TypeToggle>
            </InputGroup>

            {/* Proveedor - Solo para ingresos */}
            {tipo === "ingreso" && (
              <InputGroup>
                <Label>
                  <Icon icon="lucide:truck" width="14" style={{ marginRight: "6px" }} />
                  Proveedor (opcional)
                </Label>
                <ProveedorSearchContainer>
                  <InputWrapper>
                    <InputIcon>
                      <Icon icon="lucide:search" />
                    </InputIcon>
                    <Input
                      type="text"
                      placeholder="Buscar proveedor..."
                      value={busquedaProveedor}
                      onChange={(e) => setBusquedaProveedor(e.target.value)}
                    />
                    {busquedaProveedor && (
                      <ClearSearchBtn type="button" onClick={() => { setBusquedaProveedor(""); setProveedorSelect(null); }}>
                        <Icon icon="lucide:x" width="14" />
                      </ClearSearchBtn>
                    )}
                  </InputWrapper>
                  
                  {/* Dropdown de proveedores */}
                  {busquedaProveedor && dataProveedores && dataProveedores.length > 0 && !proveedorSelect && (
                    <ProveedorDropdown>
                      {dataProveedores.map((prov) => (
                        <ProveedorItem 
                          key={prov.id} 
                          onClick={() => {
                            setProveedorSelect(prov);
                            setBusquedaProveedor(prov.nombres);
                          }}
                        >
                        <Icon icon="lucide:building" width="14" />
                        <span>{prov.nombres}</span>
                        {prov.identificador_fiscal && <small>{prov.identificador_fiscal}</small>}
                      </ProveedorItem>
                      ))}
                    </ProveedorDropdown>
                  )}
                  
                  {/* Proveedor seleccionado */}
                  {proveedorSelect && (
                    <ProveedorSelected>
                      <Icon icon="lucide:check-circle" width="14" />
                      <span>{proveedorSelect.nombres}</span>
                      <RemoveProvBtn type="button" onClick={() => { setProveedorSelect(null); setBusquedaProveedor(""); }}>
                        <Icon icon="lucide:x" width="12" />
                      </RemoveProvBtn>
                    </ProveedorSelected>
                  )}
                </ProveedorSearchContainer>
              </InputGroup>
            )}

            {/* Sucursal y Almacén */}
            <FormGrid>
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
                  data={dataAlmacenes || dataAlmacenesXsucursal}
                  itemSelect={almacenSelectItem}
                  onSelect={setAlmacenSelectItem}
                  displayField="nombre"
                />
              </InputGroup>
            </FormGrid>

            {/* Cantidad */}
            <InputGroup>
              <Label>
                Cantidad 
                <TypeIndicator $granel={esGranel}>
                  {esGranel ? "(Granel - decimales permitidos)" : "(Unidad - solo enteros)"}
                </TypeIndicator>
              </Label>
              <InputWrapper>
                <InputIcon>
                  <Icon icon="lucide:hash" />
                </InputIcon>
                <Input
                  type="number"
                  step={esGranel ? "0.01" : "1"}
                  min={esGranel ? "0.01" : "1"}
                  placeholder={esGranel ? "0.00" : "0"}
                  {...register("cantidad", { 
                    required: "Cantidad requerida",
                    min: { value: esGranel ? 0.01 : 1, message: `Mínimo ${esGranel ? "0.01" : "1"}` },
                    validate: value => {
                      if (!esGranel && !Number.isInteger(Number(value))) {
                        return "Este producto solo acepta cantidades enteras";
                      }
                      return true;
                    }
                  })}
                />
              </InputWrapper>
              {errors.cantidad && <ErrorText>{errors.cantidad.message || "Cantidad requerida y mayor a 0"}</ErrorText>}
            </InputGroup>

            {/* Precios */}
            <FormGrid>
              <InputGroup>
                <Label>Precio compra</Label>
                <InputWrapper>
                  <InputIcon>
                    <span style={{ fontWeight: 600 }}>{dataempresa?.simbolo_moneda || "$"}</span>
                  </InputIcon>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={productosItemSelect?.precio_compra ?? 0}
                    {...register("precio_compra", { required: true, min: 0 })}
                  />
                </InputWrapper>
              </InputGroup>

              <InputGroup>
                <Label>Precio venta</Label>
                <InputWrapper>
                  <InputIcon>
                    <span style={{ fontWeight: 600 }}>{dataempresa?.simbolo_moneda || "$"}</span>
                  </InputIcon>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={productosItemSelect?.precio_venta ?? 0}
                    {...register("precio_venta", { required: true, min: 0 })}
                  />
                </InputWrapper>
              </InputGroup>
            </FormGrid>

            {/* Actions */}
            <Actions>
              <CancelBtn type="button" onClick={handleClose}>
                Cancelar
              </CancelBtn>
              <SubmitBtn type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Icon icon="lucide:loader-2" className="spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:check" />
                    Guardar
                  </>
                )}
              </SubmitBtn>
            </Actions>
          </Form>
        ) : (
          <EmptyState>
            <Icon icon="lucide:alert-circle" width="48" />
            <h4>Sin producto seleccionado</h4>
            <p>Primero selecciona un producto para registrar movimiento</p>
            <CloseStateBtn onClick={handleClose}>Cerrar</CloseStateBtn>
          </EmptyState>
        )}
      </Modal>
    </Overlay>
  );
}

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
`;

const HeaderTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0;

  svg {
    color: #6366f1;
  }
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
`;

const Form = styled.form`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ProductInfo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #6366f1;
  }

  label {
    display: block;
    font-size: 12px;
    color: #6b7280;
  }

  strong {
    display: block;
    font-size: 14px;
    color: #111;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
`;

const TypeToggle = styled.div`
  display: flex;
  gap: 12px;
`;

const TypeBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid ${({ $active, $variant }) => 
    $active 
      ? ($variant === "ingreso" ? "#22c55e" : "#ef4444")
      : "#e5e7eb"
  };
  border-radius: 10px;
  background: ${({ $active, $variant }) =>
    $active
      ? ($variant === "ingreso" ? "#dcfce7" : "#fef2f2")
      : "#fff"
  };
  color: ${({ $active, $variant }) =>
    $active
      ? ($variant === "ingreso" ? "#166534" : "#dc2626")
      : "#6b7280"
  };
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ $variant }) => 
      $variant === "ingreso" ? "#22c55e" : "#ef4444"
    };
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 12px;
  color: #9ca3af;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  background: #f9fafb;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #ef4444;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const CancelBtn = styled.button`
  flex: 1;
  padding: 12px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
  }
`;

const SubmitBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: #111;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #333;
  }

  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  color: #9ca3af;

  svg {
    margin-bottom: 16px;
    color: #fbbf24;
  }

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    margin: 0 0 20px 0;
  }
`;

const CloseStateBtn = styled.button`
  padding: 10px 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }
`;

// Styled Components para Proveedor
const ProveedorSearchContainer = styled.div`
  position: relative;
`;

const ClearSearchBtn = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;

  &:hover {
    color: #6b7280;
  }
`;

const ProveedorDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  margin-top: 4px;
  max-height: 180px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

const ProveedorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f5f5f5;
  }

  svg {
    color: #9ca3af;
  }

  span {
    flex: 1;
    font-size: 14px;
    color: #111;
  }

  small {
    font-size: 12px;
    color: #9ca3af;
  }
`;

const ProveedorSelected = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  margin-top: 8px;
  font-size: 14px;
  color: #166534;

  svg {
    color: #22c55e;
  }

  span {
    flex: 1;
  }
`;

const RemoveProvBtn = styled.button`
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;

  &:hover {
    background: #fef2f2;
  }
`;
const TypeIndicator = styled.span`
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${props => props.$granel ? '#fef3c7' : '#dbeafe'};
  color: ${props => props.$granel ? '#92400e' : '#1e40af'};
`;