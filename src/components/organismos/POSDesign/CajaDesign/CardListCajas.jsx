import { Icon } from "@iconify/react/dist/iconify.js";
import styled from "styled-components";
import { useState } from "react";
import { useUsuariosStore } from "../../../../store/UsuariosStore";
import { useCierreCajaStore } from "../../../../store/CierreCajaStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFormattedDate } from "../../../../hooks/useFormattedDate";
import { useMetodosPagoStore } from "../../../../store/MetodosPagoStore";
import { useMovCajaStore } from "../../../../store/MovCajaStore";
import { useAsignacionCajaSucursalStore } from "../../../../store/AsignacionCajaSucursalStore";
import { useCajasStore } from "../../../../store/CajasStore";

export function CardListCajas({
  title,
  subtitle,
  funcion,
  sucursal,
  state,
}) {
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const fechaActual = useFormattedDate();
  const queryClient = useQueryClient();
  const { datausuarios } = useUsuariosStore();
  const { dataSucursalesAsignadas } = useAsignacionCajaSucursalStore();
  const { aperturarcaja } = useCierreCajaStore();
  const { dataMetodosPago } = useMetodosPagoStore();
  const { insertarMovCaja } = useMovCajaStore();
  const { cajaSelectItem } = useCajasStore();

  const registrarMovCaja = async (p) => {
    const id_metodo_pago = dataMetodosPago
      .filter((item) => item.nombre === "Efectivo")
      .map((item) => item.id)[0];
    const pmovcaja = {
      fecha_movimiento: fechaActual,
      tipo_movimiento: "apertura",
      monto: montoEfectivo ? montoEfectivo : 0,
      id_metodo_pago: id_metodo_pago,
      descripcion: `Apertura de caja con`,
      id_usuario: datausuarios?.id,
      id_cierre_caja: p.id_cierre_caja,
    };
    await insertarMovCaja(pmovcaja);
  };

  const insertar = async () => {
    const p = {
      fechainicio: fechaActual,
      fechacierre: fechaActual,
      id_usuario: datausuarios?.id,
      id_caja: cajaSelectItem?.id_caja,
    };
    const data = await aperturarcaja(p);
    await registrarMovCaja({ id_cierre_caja: data?.id });
  };

  const mutation = useMutation({
    mutationKey: ["aperturar caja"],
    mutationFn: insertar,
    onSuccess: () => {
      toast.success("Caja aperturada correctamente");
      queryClient.invalidateQueries("mostrar cierre de caja");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleClick = () => {
    funcion();
    if (!state) {
      setExpanded(!expanded);
    }
  };

  return (
    <Container onClick={handleClick} $state={state} $expanded={expanded}>
      <CardHeader>
        <IconWrapper $state={state}>
          <Icon icon={state ? "lucide:lock" : "lucide:monitor"} />
        </IconWrapper>
        <CardInfo>
          <CardTitle>{title}</CardTitle>
          <CardMeta>
            <Icon icon="lucide:map-pin" />
            {sucursal}
          </CardMeta>
        </CardInfo>
        <StatusBadge $state={state}>
          {state ? "En uso" : "Disponible"}
        </StatusBadge>
      </CardHeader>

      {state && subtitle !== 0 && (
        <UserInfo>
          <Icon icon="lucide:user" />
          <span>Operando por: <strong>{subtitle}</strong></span>
        </UserInfo>
      )}

      {state && (
        <ActionButton 
          $variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Icon icon="lucide:log-in" />
          Tomar turno
        </ActionButton>
      )}

      {!state && expanded && (
        <ExpandedContent onClick={(e) => e.stopPropagation()}>
          <InputGroup>
            <InputLabel>Monto inicial en caja (opcional)</InputLabel>
            <InputWrapper>
              <InputIcon>S/</InputIcon>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                onChange={(e) => setMontoEfectivo(parseFloat(e.target.value) || 0)}
              />
            </InputWrapper>
          </InputGroup>

          <ButtonGroup>
            <ActionButton
              $variant="ghost"
              onClick={() => {
                setMontoEfectivo(0);
                mutation.mutateAsync();
              }}
              disabled={mutation.isPending}
            >
              Omitir
            </ActionButton>
            <ActionButton
              $variant="primary"
              onClick={() => mutation.mutateAsync()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Icon icon="lucide:loader-2" className="spin" />
              ) : (
                <>
                  <Icon icon="lucide:unlock" />
                  Aperturar
                </>
              )}
            </ActionButton>
          </ButtonGroup>
        </ExpandedContent>
      )}
    </Container>
  );
}

const Container = styled.div`
  background: ${({ $expanded }) => $expanded ? '#f8f9fa' : '#fff'};
  border: 1px solid ${({ $state, $expanded }) => 
    $expanded ? '#111' : $state ? '#fecaca' : '#eee'};
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    border-color: ${({ $state }) => $state ? '#f87171' : '#ccc'};
    background: ${({ $state }) => $state ? '#fef2f2' : '#fafafa'};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  width: 40px;
  height: 40px;
  background: ${({ $state }) => $state ? '#fef2f2' : '#f0fdf4'};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    font-size: 18px;
    color: ${({ $state }) => $state ? '#ef4444' : '#22c55e'};
  }
`;

const CardInfo = styled.div`
  flex: 1;
  text-align: left;
  min-width: 0;
`;

const CardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111;
`;

const CardMeta = styled.div`
  display: none;
`;

const StatusBadge = styled.span`
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $state }) => $state ? '#fef2f2' : '#f0fdf4'};
  color: ${({ $state }) => $state ? '#dc2626' : '#16a34a'};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 12px;
  color: #666;

  svg {
    font-size: 14px;
    color: #999;
  }

  strong {
    color: #111;
  }
`;

const ExpandedContent = styled.div`
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #eee;
`;

const InputGroup = styled.div`
  margin-bottom: 14px;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.span`
  position: absolute;
  left: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 10px 10px 36px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  color: #111;
  transition: all 0.15s;
  outline: none;

  &::placeholder {
    color: #bbb;
  }

  &:focus {
    border-color: #111;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
  border: none;

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: #111;
          color: #fff;
          &:hover:not(:disabled) {
            background: #000;
          }
        `;
      case 'secondary':
        return `
          background: #fff;
          color: #111;
          border: 1px solid #ddd;
          margin-top: 10px;
          &:hover:not(:disabled) {
            border-color: #111;
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: #666;
          &:hover:not(:disabled) {
            background: #f5f5f5;
            color: #111;
          }
        `;
      default:
        return '';
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  svg {
    font-size: 16px;
  }
`;
