import { useState, useMemo } from "react";
import styled from "styled-components";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useProductosStore } from "../../../store/ProductosStore";

import { useAsignacionCajaSucursalStore } from "../../../store/AsignacionCajaSucursalStore";
import { useAlmacenesStore } from "../../../store/AlmacenesStore";
import { useVentasStore } from "../../../store/VentasStore";
import { useDetalleVentasStore } from "../../../store/DetalleVentasStore";
import { useClientesProveedoresStore } from "../../../store/ClientesProveedoresStore";
import { useCierreCajaStore } from "../../../store/CierreCajaStore";
import { useStockStore } from "../../../store/StockStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useFormattedDate } from "../../../hooks/useFormattedDate";
import { useUsuariosStore } from "../../../store/UsuariosStore";

export const SelectAlmacenModal = () => {
  const [cantidadInput, setCantidadInput] = useState(1);
  const fechaactual = useFormattedDate()
  const { dataempresa } = useEmpresaStore();
  const { productosItemSelect } = useProductosStore();
  const { sucursalesItemSelectAsignadas } = useAsignacionCajaSucursalStore();
  const { almacenSelectItem, setAlmacenSelectItem, dataAlmacenesXsucursal } = useAlmacenesStore();
  const { insertarVentas, idventa } = useVentasStore();
  const { insertarDetalleVentas } = useDetalleVentasStore();
  const { cliproItemSelect } = useClientesProveedoresStore();
  const { dataCierreCaja } = useCierreCajaStore();
  const { setStateModal, dataStockXAlmacenesYProducto } = useStockStore();
  const {datausuarios} = useUsuariosStore()
  const queryClient = useQueryClient();
  
  // Filtrar almacenes: solo los de la sucursal actual
  const sucursalActualId = dataCierreCaja?.caja?.id_sucursal;
  const almacenActualId = almacenSelectItem?.id || almacenSelectItem?.id_almacen || dataAlmacenesXsucursal?.[0]?.id;
  
  const data = useMemo(() => {
    if (!dataStockXAlmacenesYProducto || !sucursalActualId) {
      return [];
    }
    
    return dataStockXAlmacenesYProducto.filter(item => {
      const itemSucursalId = item.almacen?.id_sucursal || item.almacen?.sucursales?.id;
      const itemAlmacenId = item.id_almacen || item.almacen?.id;
      
      // Solo almacenes de la misma sucursal y diferente al actual
      return itemSucursalId === sucursalActualId && 
             itemAlmacenId !== almacenActualId &&
             item.stock > 0;
    });
  }, [dataStockXAlmacenesYProducto, sucursalActualId, almacenActualId]);

  async function insertarventas() {
    if (idventa === 0) {
      const pventas = {
        fecha: fechaactual,
        id_usuario: datausuarios?.id,
        id_sucursal: sucursalesItemSelectAsignadas?.id_sucursal,
        id_empresa: dataempresa?.id,
        id_cierre_caja: dataCierreCaja?.id,
      };
       console.log("pventas",pventas)
      const result = await insertarVentas(pventas);
      if (result?.id > 0) {
        await insertarDVentas(result?.id);
      }
    } else {
      await insertarDVentas(idventa);
    }
  }
  async function insertarDVentas(idventa) {
    const productosItemSelect =
      useProductosStore.getState().productosItemSelect;
    
    // Obtener el almacén - puede venir como id o id_almacen según la fuente
    const almacenId = almacenSelectItem?.id_almacen || almacenSelectItem?.id;
    
    if (!almacenId) {
      toast.error("No hay almacén seleccionado.");
      return;
    }
    
    const pDetalleVentas = {
      _id_venta: idventa,
      _cantidad: parseFloat(cantidadInput) || 1,
      _precio_venta: productosItemSelect.precio_venta,
      _descripcion: productosItemSelect.nombre,
      _id_producto: productosItemSelect.id,
      _precio_compra: productosItemSelect.precio_compra,
      _id_sucursal: sucursalesItemSelectAsignadas.id_sucursal,
      _id_almacen: almacenId,
    };
    console.log("pDetalleVentas", pDetalleVentas);
    await insertarDetalleVentas(pDetalleVentas);
  }
  async function Controladorinsertarventas(item) {
    setAlmacenSelectItem(item);
    doInsertarVentas();
  }
  const { mutate: doInsertarVentas, isPending } = useMutation({
    mutationKey: ["insertar ventas"],
    mutationFn: insertarventas,
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
      setStateModal(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mostrar detalle venta"]);
      setStateModal(false);
    },
  });
  const ValidarCantidad = (e) => {
    const value = Math.max(0, parseFloat(e.target.value));
    setCantidadInput(value);
  };

  return (
    <Overlay>
      <ModalContainer>
        {/* Header */}
        <ModalHeader>
          <HeaderContent>
            <ProductIcon>
              <Icon icon="lucide:package" />
            </ProductIcon>
            <HeaderText>
              <ProductName>{productosItemSelect?.nombre}</ProductName>
              <ProductSubtitle>Seleccionar almacén alternativo</ProductSubtitle>
            </HeaderText>
          </HeaderContent>
          <CloseButton onClick={() => setStateModal(false)}>
            <Icon icon="lucide:x" />
          </CloseButton>
        </ModalHeader>

        {/* Message */}
        <MessageSection>
          <Icon icon="lucide:info" />
          <span>Se encontró <strong>stock</strong> en otros almacenes. Selecciona uno para continuar.</span>
        </MessageSection>

        {/* Cantidad Input */}
        <InputSection>
          <InputLabel>Cantidad</InputLabel>
          <InputWrapper>
            <Icon icon="lucide:hash" />
            <StyledInput
              type="number"
              min="1"
              value={cantidadInput}
              onChange={ValidarCantidad}
              placeholder="1"
            />
          </InputWrapper>
        </InputSection>

        {/* Almacenes Table */}
        <TableSection>
          <TableHeader>
            <span>Almacenes disponibles</span>
            <Badge>{data?.length || 0}</Badge>
          </TableHeader>
          
          {data?.length > 0 ? (
            <AlmacenList>
              {data?.map((item, index) => (
                <AlmacenItem
                  key={index}
                  onClick={() => Controladorinsertarventas(item)}
                  disabled={isPending}
                >
                  <AlmacenInfo>
                    <Icon icon="lucide:warehouse" />
                    <AlmacenDetails>
                      <AlmacenName>{item?.almacen?.nombre || 'Sin nombre'}</AlmacenName>
                      <SucursalName>{item?.almacen?.sucursales?.nombre || 'Sin sucursal'}</SucursalName>
                    </AlmacenDetails>
                  </AlmacenInfo>
                  <StockBadge $hasStock={item?.stock > 0}>
                    <Icon icon="lucide:package" />
                    {item?.stock} uds
                  </StockBadge>
                </AlmacenItem>
              ))}
            </AlmacenList>
          ) : (
            <EmptyState>
              <Icon icon="lucide:package-x" />
              <span>No hay almacenes con stock disponible</span>
            </EmptyState>
          )}
        </TableSection>

        {/* Footer */}
        <ModalFooter>
          <CancelButton onClick={() => setStateModal(false)} disabled={isPending}>
            <Icon icon="lucide:arrow-left" />
            Volver
          </CancelButton>
        </ModalFooter>
      </ModalContainer>
    </Overlay>
  );
};

// Styled Components - Minimalista
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: slideUp 0.2s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ProductIcon = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ProductName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111;
`;

const ProductSubtitle = styled.span`
  font-size: 13px;
  color: #666;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.15s;

  &:hover {
    background: #e5e5e5;
    color: #111;
  }
`;

const MessageSection = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 20px;
  background: #f0f9ff;
  color: #0369a1;
  font-size: 13px;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  strong {
    font-weight: 600;
  }
`;

const InputSection = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0 12px;
  transition: all 0.15s;

  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  svg {
    color: #9ca3af;
    font-size: 16px;
  }
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-size: 15px;
  color: #111;
  outline: none;

  &::placeholder {
    color: #9ca3af;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const TableSection = styled.div`
  padding: 16px 20px;
`;

const TableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }
`;

const Badge = styled.span`
  background: #e5e7eb;
  color: #374151;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
`;

const AlmacenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
`;

const AlmacenItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #f0fdf4;
    border-color: #22c55e;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const AlmacenInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #374151;

  svg {
    font-size: 18px;
    color: #6b7280;
  }
`;

const AlmacenDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
`;

const AlmacenName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #111;
`;

const SucursalName = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const StockBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${({ $hasStock }) => $hasStock ? '#dcfce7' : '#fee2e2'};
  color: ${({ $hasStock }) => $hasStock ? '#16a34a' : '#dc2626'};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;

  svg {
    font-size: 14px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  color: #9ca3af;

  svg {
    font-size: 32px;
  }

  span {
    font-size: 13px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-start;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
`;

const CancelButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    font-size: 16px;
  }
`;
