import styled from "styled-components";
import { FormatearNumeroDinero } from "../../../utils/Conversiones";
import {
  Lottieanimacion,
  useDetalleVentasStore,
  useEmpresaStore,
  useVentasStore,
} from "../../../index";
import animacionvacio from "../../../assets/vacioanimacion.json";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function AreaDetalleventaPos() {
  const { dataempresa } = useEmpresaStore();
  const [editIndex, setEditIndex] = useState(null);
  const [newCantidad, setNewCantidad] = useState(1);
  const { mostrardetalleventa, editarCantidadDetalleVenta, eliminardetalleventa } =
    useDetalleVentasStore();
  const queryClient = useQueryClient();
  const { idventa } = useVentasStore();

  const EditarCantidadDv = async (data) => {
    const p = {
      _id: data.id,
      _cantidad: data.cantidad,
    };
    await editarCantidadDetalleVenta(p);
  };

  const { mutate: mutateEditarCantidadDV } = useMutation({
    mutationKey: ["editar cantidad detalle venta"],
    mutationFn: EditarCantidadDv,
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mostrar detalle venta"]);
    },
  });

  const EliminarDV = async (p) => {
    await eliminardetalleventa({ id: p.id });
  };

  const { mutate: mutateEliminarDV } = useMutation({
    mutationKey: ["eliminar detalle venta"],
    mutationFn: EliminarDV,
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mostrar detalle venta"]);
    },
  });

  const handleEditClick = (index, cantidad) => {
    setEditIndex(index);
    setNewCantidad(cantidad);
  };

  const handleInputChange = (e) => {
    const value = Math.max(0, parseFloat(e.target.value));
    setNewCantidad(value);
  };

  const handleInputBlur = (item) => {
    mutateEditarCantidadDV({ id: item.id, cantidad: newCantidad });
    setEditIndex(null);
  };

  const handleKeyDown = (e, item) => {
    if (e.key === "Enter") {
      handleInputBlur(item);
    }
  };

  const { data: items } = useQuery({
    queryKey: ["mostrar detalle venta", { id_venta: idventa }],
    queryFn: () => mostrardetalleventa({ id_venta: idventa }),
  });

  return (
    <Container>
      {items?.length > 0 ? (
        <ProductList>
          {items?.map((item, index) => (
            <ProductCard key={index}>
              {/* Info del producto */}
              <ProductInfo>
                <ProductName>{item.descripcion}</ProductName>
                <ProductPrice>
                  <span>precio unit:</span>
                  <PriceTag>
                    {FormatearNumeroDinero(item.precio_venta, dataempresa?.currency, dataempresa?.iso)}
                  </PriceTag>
                </ProductPrice>
              </ProductInfo>

              {/* Controles de cantidad */}
              <QuantityControls>
                <QuantityButton
                  onClick={() => mutateEditarCantidadDV({ id: item.id, cantidad: item.cantidad + 1 })}
                >
                  <Icon icon="lucide:plus" />
                </QuantityButton>

                {editIndex === index ? (
                  <QuantityInput
                    type="number"
                    value={newCantidad}
                    onChange={handleInputChange}
                    onBlur={() => handleInputBlur(item)}
                    onKeyDown={(e) => handleKeyDown(e, item)}
                    min="1"
                    autoFocus
                  />
                ) : (
                  <QuantityDisplay onClick={() => handleEditClick(index, item.cantidad)}>
                    <span>{item.cantidad}</span>
                    <Icon icon="lucide:pencil" className="edit-icon" />
                  </QuantityDisplay>
                )}

                <QuantityButton
                  onClick={() => mutateEditarCantidadDV({ id: item.id, cantidad: item.cantidad - 1 })}
                  disabled={item.cantidad <= 1}
                >
                  <Icon icon="lucide:minus" />
                </QuantityButton>
              </QuantityControls>

              {/* Total y eliminar */}
              <ProductActions>
                <ProductTotal>
                  {FormatearNumeroDinero(item.total, dataempresa?.currency, dataempresa?.iso)}
                </ProductTotal>
                <DeleteButton onClick={() => mutateEliminarDV(item)}>
                  <Icon icon="lucide:trash-2" />
                </DeleteButton>
              </ProductActions>
            </ProductCard>
          ))}
        </ProductList>
      ) : (
        <EmptyState>
          <Lottieanimacion animacion={animacionvacio} alto="180" ancho="180" />
        </EmptyState>
      )}
    </Container>
  );
}

// Styled Components - Minimalista
const Container = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  overflow: hidden;
`;

const ProductList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 4px;
  flex: 1;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #d1d5db;
  }
`;

const ProductCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  transition: all 0.15s ease;

  &:hover {
    border-color: #e5e7eb;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 12px;
  }
`;

const ProductInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    width: 100%;
    flex: none;
  }
`;

const ProductName = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProductPrice = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;

  span {
    font-weight: 400;
  }
`;

const PriceTag = styled.span`
  color: #dc2626;
  font-weight: 600;
`;

const QuantityControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f9fafb;
  padding: 6px;
  border-radius: 10px;
`;

const QuantityButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: #374151;
  font-size: 16px;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover:not(:disabled) {
    background: #f3f4f6;
    color: #111;
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const QuantityDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 60px;
  justify-content: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover {
    background: #e5e7eb;
  }

  span {
    font-size: 18px;
    font-weight: 700;
    color: #111;
  }

  .edit-icon {
    font-size: 14px;
    color: #9ca3af;
    opacity: 0;
    transition: opacity 0.15s;
  }

  &:hover .edit-icon {
    opacity: 1;
  }
`;

const QuantityInput = styled.input`
  width: 60px;
  height: 32px;
  text-align: center;
  border: 2px solid #6366f1;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #111;
  outline: none;
  background: #fff;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const ProductActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ProductTotal = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #111;
  min-width: 90px;
  text-align: right;
`;

const DeleteButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #fef2f2;
  border-radius: 8px;
  cursor: pointer;
  color: #dc2626;
  font-size: 18px;
  transition: all 0.15s;

  &:hover {
    background: #fee2e2;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px;
`;
