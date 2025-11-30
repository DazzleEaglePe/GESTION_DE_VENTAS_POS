import styled from "styled-components";
import { Device } from "../../../styles/breakpoints";
import { Icon } from "@iconify/react";

import { useCierreCajaStore } from "../../../store/CierreCajaStore";
import { useVentasStore } from "../../../store/VentasStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function FooterPos() {
  const { eliminarVenta, idventa } = useVentasStore();
  const { setStateIngresoSalida, setTipoRegistro, setStateCierraCaja } =
    useCierreCajaStore();
  const queryClient = useQueryClient();

  const { mutate: mutateEliminarVenta, isPending } = useMutation({
    mutationKey: ["eliminar venta"],
    mutationFn: () => {
      if (idventa > 0) {
        return eliminarVenta({ id: idventa });
      } else {
        return Promise.reject(new Error("Sin registro de venta para eliminar"));
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Venta eliminada");
      queryClient.invalidateQueries(["mostrar detalle venta"]);
    },
  });

  return (
    <Footer>
      <FooterButton 
        $variant="danger" 
        disabled={isPending} 
        onClick={mutateEliminarVenta}
      >
        <Icon icon="lucide:trash-2" />
        <span>Eliminar venta</span>
      </FooterButton>

      <FooterButton onClick={() => setStateCierraCaja(true)}>
        <Icon icon="lucide:archive" />
        <span>Cerrar caja</span>
      </FooterButton>

      <FooterButton
        $variant="success"
        onClick={() => {
          setStateIngresoSalida(true);
          setTipoRegistro("ingreso");
        }}
      >
        <Icon icon="lucide:plus-circle" />
        <span>Ingresar dinero</span>
      </FooterButton>

      <FooterButton
        $variant="warning"
        onClick={() => {
          setStateIngresoSalida(true);
          setTipoRegistro("salida");
        }}
      >
        <Icon icon="lucide:minus-circle" />
        <span>Retirar dinero</span>
      </FooterButton>
    </Footer>
  );
}

const Footer = styled.section`
  grid-area: footer;
  display: none;
  gap: 10px;
  padding: 10px 0;

  @media ${Device.desktop} {
    display: flex;
    align-items: center;
  }
`;

const FooterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  border: 2px solid;

  ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return `
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
          
          &:hover {
            background: #fee2e2;
            border-color: #dc2626;
          }
        `;
      case 'success':
        return `
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #16a34a;
          
          &:hover {
            background: #dcfce7;
            border-color: #16a34a;
          }
        `;
      case 'warning':
        return `
          background: #fffbeb;
          border-color: #fde68a;
          color: #d97706;
          
          &:hover {
            background: #fef3c7;
            border-color: #d97706;
          }
        `;
      default:
        return `
          background: #fff;
          border-color: #e5e5e5;
          color: #333;
          
          &:hover {
            background: #f5f5f5;
            border-color: #111;
          }
        `;
    }
  }}

  svg {
    font-size: 18px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
