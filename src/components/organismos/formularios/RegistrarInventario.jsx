import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useForm } from "react-hook-form";
import { useGlobalStore } from "../../../store/GlobalStore";
import { useProductosStore } from "../../../store/ProductosStore";
import { useMovStockStore } from "../../../store/MovStockStore";
import { useInsertarMovStockMutation } from "../../../tanstack/MovStockStack";
import { useAlmacenesStore } from "../../../store/AlmacenesStore";
import { useStockStore } from "../../../store/StockStore";
import { useSucursalesStore } from "../../../store/SucursalesStore";
import { useQuery } from "@tanstack/react-query";
import { SelectList } from "../../ui/lists/SelectList";

export function RegistrarInventario({ setIsExploding }) {
  const { setStateClose } = useGlobalStore();
  const { productosItemSelect } = useProductosStore();
  const { tipo, setTipo } = useMovStockStore();
  const { almacenSelectItem, mostrarAlmacenesXSucursal, setAlmacenSelectItem, dataAlmacenesXsucursal } = useAlmacenesStore();
  const { mostrarStockXAlmacenYProducto, dataStockXAlmacenYProducto } = useStockStore();
  const { sucursalesItemSelect, dataSucursales, selectSucursal } = useSucursalesStore();

  const {
    register,
    formState: { errors },
    handleSubmit,
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

  const mutation = useInsertarMovStockMutation();

  const handlesub = (data) => {
    mutation.mutate(data, {
      onSuccess: () => {
        setIsExploding?.(true);
        setStateClose(false);
      },
    });
  };

  const handleClose = () => {
    setStateClose(false);
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
              <Label>Cantidad</Label>
              <InputWrapper>
                <InputIcon>
                  <Icon icon="lucide:hash" />
                </InputIcon>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register("cantidad", { required: true, min: 0.01 })}
                />
              </InputWrapper>
              {errors.cantidad && <ErrorText>Cantidad requerida y mayor a 0</ErrorText>}
            </InputGroup>

            {/* Precios */}
            <FormGrid>
              <InputGroup>
                <Label>Precio compra</Label>
                <InputWrapper>
                  <InputIcon>
                    <Icon icon="lucide:dollar-sign" />
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
                    <Icon icon="lucide:dollar-sign" />
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
