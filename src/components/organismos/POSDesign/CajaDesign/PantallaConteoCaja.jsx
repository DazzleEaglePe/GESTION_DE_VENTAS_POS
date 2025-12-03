import styled from "styled-components";
import { FormatearNumeroDinero } from "../../../../utils/Conversiones";
import { useAuthStore } from "../../../../store/AuthStore";
import { useEmpresaStore } from "../../../../store/EmpresaStore";
import { useUsuariosStore } from "../../../../store/UsuariosStore";
import { useMovCajaStore } from "../../../../store/MovCajaStore";
import { useVentasStore } from "../../../../store/VentasStore";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useCierreCajaStore } from "../../../../store/CierreCajaStore";
import { useFormattedDate } from "../../../../hooks/useFormattedDate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

export function PantallaConteoCaja() {
  const { cerrarSesion } = useAuthStore();
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const { totalEfectivoTotalCaja } = useMovCajaStore();
  const { datausuarios } = useUsuariosStore();
  const fechaactual = useFormattedDate();
  const { dataempresa } = useEmpresaStore();
  const {
    cerrarTurnoCajaAtomico,
    dataCierreCaja,
    setStateConteoCaja,
    setStateCierraCaja,
  } = useCierreCajaStore();
  const { contarVentasPendientes, eliminarVentasPendientesPorCierre } = useVentasStore();
  const queryClient = useQueryClient();
  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm();

  // Query para verificar ventas pendientes
  const { data: ventasPendientes = 0, isLoading: isLoadingPendientes, refetch: refetchPendientes } = useQuery({
    queryKey: ["ventas-pendientes-cierre", dataCierreCaja?.id],
    queryFn: () => contarVentasPendientes({ id_cierre_caja: dataCierreCaja?.id }),
    enabled: !!dataCierreCaja?.id,
  });

  // Mutation para limpiar ventas pendientes
  const { isPending: isLimpiando, mutate: limpiarVentas } = useMutation({
    mutationKey: ["limpiar-ventas-pendientes"],
    mutationFn: () => eliminarVentasPendientesPorCierre({ id_cierre_caja: dataCierreCaja?.id }),
    onSuccess: (resultado) => {
      toast.success(`Se eliminaron ${resultado.eliminadas} venta(s) pendiente(s)`, { position: "top-center" });
      refetchPendientes();
    },
    onError: (error) => {
      toast.error(`Error al limpiar ventas: ${error.message}`, { position: "top-center" });
    },
  });

  const insertar = async (data) => {
    const p = {
      id: dataCierreCaja?.id,
      fechacierre: fechaactual,
      id_usuario: datausuarios?.id,
      total_efectivo_real: parseFloat(data.montoreal),
    };
    await cerrarTurnoCajaAtomico(p);
  };

  const { isPending, mutate: doInsertar } = useMutation({
    mutationKey: ["cerrar turno caja"],
    mutationFn: insertar,
    onSuccess: (resultado) => {
      const mensaje = resultado?.diferencia === 0 
        ? "Caja cerrada correctamente - Cuadre perfecto ✓" 
        : `Caja cerrada - Diferencia: ${resultado?.diferencia?.toFixed(2) || 0}`;
      toast.success(mensaje, { position: "top-center" });
      setStateConteoCaja(false);
      setStateCierraCaja(false);
      reset();
      queryClient.invalidateQueries(["mostrar cierre de caja"]);
      cerrarSesion();
    },
    onError: (error) => {
      toast.error(`Error al cerrar caja: ${error.message}`, { position: "top-center" });
    },
  });

  const handleSub = (data) => {
    doInsertar(data);
  };

  const diferencia = montoEfectivo - totalEfectivoTotalCaja;
  const isExact = diferencia === 0;

  // Si está cargando, mostrar loading
  if (isLoadingPendientes) {
    return (
      <Overlay>
        <Modal>
          <LoadingBox>
            <Icon icon="lucide:loader-2" className="spin" />
            <span>Verificando estado de caja...</span>
          </LoadingBox>
        </Modal>
      </Overlay>
    );
  }

  // Si hay ventas pendientes, mostrar advertencia
  if (ventasPendientes > 0) {
    return (
      <Overlay onClick={() => setStateConteoCaja(false)}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={() => setStateConteoCaja(false)}>
            <Icon icon="lucide:x" />
          </CloseButton>

          <WarningIcon>
            <Icon icon="lucide:alert-triangle" />
          </WarningIcon>

          <Title>Ventas Pendientes</Title>
          <Subtitle>
            Hay <strong>{ventasPendientes}</strong> venta(s) sin completar asociadas a esta caja.
          </Subtitle>

          <WarningBox>
            <p>
              Estas ventas fueron iniciadas pero nunca se completaron (posiblemente por 
              cierres inesperados del navegador o sesiones anteriores).
            </p>
            <p>
              Para cerrar la caja, debes eliminar estas ventas pendientes.
            </p>
          </WarningBox>

          <ButtonGroup>
            <CancelButton onClick={() => setStateConteoCaja(false)}>
              Cancelar
            </CancelButton>
            <CleanButton onClick={() => limpiarVentas()} disabled={isLimpiando}>
              {isLimpiando ? (
                <>
                  <Icon icon="lucide:loader-2" className="spin" />
                  Limpiando...
                </>
              ) : (
                <>
                  <Icon icon="lucide:trash-2" />
                  Eliminar Ventas Pendientes
                </>
              )}
            </CleanButton>
          </ButtonGroup>
        </Modal>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={() => setStateConteoCaja(false)}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={() => setStateConteoCaja(false)}>
          <Icon icon="lucide:x" />
        </CloseButton>

        <HeaderIcon>
          <Icon icon="lucide:calculator" />
        </HeaderIcon>

        <Title>Conteo de Caja</Title>
        <Subtitle>Verifica el efectivo físico antes de cerrar</Subtitle>

        {/* Efectivo esperado */}
        <ExpectedBox>
          <ExpectedLabel>
            <Icon icon="lucide:banknote" />
            Efectivo esperado en caja
          </ExpectedLabel>
          <ExpectedAmount>
            {FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}
          </ExpectedAmount>
        </ExpectedBox>

        {/* Formulario */}
        <Form onSubmit={handleSubmit(handleSub)}>
          <InputLabel>¿Cuánto efectivo hay en caja física?</InputLabel>
          <InputWrapper>
            <InputPrefix>S/</InputPrefix>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("montoreal", {
                required: true,
                onChange: (e) => setMontoEfectivo(parseFloat(e.target.value) || 0),
              })}
            />
          </InputWrapper>
          {errors.montoreal && <ErrorText>Este campo es requerido</ErrorText>}

          {/* Diferencia */}
          {montoEfectivo > 0 && (
            <DifferenceBox $isExact={isExact}>
              <DifferenceIcon $isExact={isExact}>
                <Icon icon={isExact ? "lucide:check-circle-2" : "lucide:alert-triangle"} />
              </DifferenceIcon>
              <DifferenceInfo>
                <DifferenceLabel>Diferencia</DifferenceLabel>
                <DifferenceValue $isExact={isExact}>
                  {diferencia > 0 ? '+' : ''}{FormatearNumeroDinero(diferencia, dataempresa?.currency, dataempresa?.iso)}
                </DifferenceValue>
              </DifferenceInfo>
            </DifferenceBox>
          )}

          {/* Mensaje */}
          {montoEfectivo > 0 && (
            <StatusMessage $isExact={isExact}>
              {isExact 
                ? "¡Todo perfecto! El conteo coincide con lo esperado."
                : "La diferencia será registrada y enviada a gerencia."
              }
            </StatusMessage>
          )}

          {/* Botón */}
          <SubmitButton type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="spin" />
                Procesando...
              </>
            ) : (
              <>
                <Icon icon="lucide:log-out" />
                Cerrar Turno
              </>
            )}
          </SubmitButton>
        </Form>
      </Modal>
    </Overlay>
  );
}

const LoadingBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  color: #666;
  
  svg {
    font-size: 32px;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const WarningIcon = styled.div`
  width: 64px;
  height: 64px;
  background: #fef3c7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  
  svg {
    font-size: 32px;
    color: #f59e0b;
  }
`;

const WarningBox = styled.div`
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 16px;
  margin: 20px 0;
  
  p {
    font-size: 13px;
    color: #92400e;
    margin: 0;
    line-height: 1.5;
    
    &:not(:last-child) {
      margin-bottom: 10px;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  flex: 1;
  height: 48px;
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #666;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover {
    background: #f5f5f5;
    border-color: #ddd;
  }
`;

const CleanButton = styled.button`
  flex: 1.5;
  height: 48px;
  border: none;
  background: #ef4444;
  color: #fff;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;
  
  &:hover:not(:disabled) {
    background: #dc2626;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  padding: 32px 28px;
  position: relative;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  font-size: 20px;
  transition: all 0.15s;

  &:hover {
    background: #eee;
    color: #111;
  }
`;

const HeaderIcon = styled.div`
  width: 60px;
  height: 60px;
  background: #111;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  svg {
    font-size: 30px;
    color: #fff;
  }
`;

const Title = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #111;
  text-align: center;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #666;
  text-align: center;
  margin: 0 0 24px;
`;

const ExpectedBox = styled.div`
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  text-align: center;
  margin-bottom: 24px;
`;

const ExpectedLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;

  svg {
    font-size: 16px;
  }
`;

const ExpectedAmount = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #111;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InputLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputPrefix = styled.span`
  position: absolute;
  left: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #999;
`;

const Input = styled.input`
  width: 100%;
  padding: 16px 16px 16px 50px;
  font-size: 20px;
  font-weight: 600;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  text-align: right;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: #111;
  }

  &::placeholder {
    color: #ccc;
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #dc2626;
  margin-top: -4px;
`;

const DifferenceBox = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  margin-top: 8px;
  background: ${({ $isExact }) => $isExact ? '#f0fdf4' : '#fef2f2'};
`;

const DifferenceIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $isExact }) => $isExact ? '#dcfce7' : '#fee2e2'};

  svg {
    font-size: 20px;
    color: ${({ $isExact }) => $isExact ? '#16a34a' : '#dc2626'};
  }
`;

const DifferenceInfo = styled.div`
  flex: 1;
`;

const DifferenceLabel = styled.div`
  font-size: 12px;
  color: #666;
`;

const DifferenceValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $isExact }) => $isExact ? '#16a34a' : '#dc2626'};
`;

const StatusMessage = styled.p`
  font-size: 13px;
  text-align: center;
  padding: 12px;
  border-radius: 10px;
  margin: 4px 0;
  background: ${({ $isExact }) => $isExact ? '#f0fdf4' : '#fefce8'};
  color: ${({ $isExact }) => $isExact ? '#166534' : '#854d0e'};
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #15803d;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    font-size: 20px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
