import styled, { keyframes } from "styled-components";
import { FormatearNumeroDinero } from "../../../../utils/Conversiones";
import { useAuthStore } from "../../../../store/AuthStore";
import { useEmpresaStore } from "../../../../store/EmpresaStore";
import { useUsuariosStore } from "../../../../store/UsuariosStore";
import { useMovCajaStore } from "../../../../store/MovCajaStore";
import { useVentasStore } from "../../../../store/VentasStore";
import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { useCierreCajaStore } from "../../../../store/CierreCajaStore";
import { useFormattedDate } from "../../../../hooks/useFormattedDate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

// Configuración de límites
const LIMITE_DIFERENCIA_PORCENTAJE = 5;
const LIMITE_DIFERENCIA_MONTO = 20;

export function PantallaConteoCaja() {
  const { cerrarSesion } = useAuthStore();
  const [montoEfectivo, setMontoEfectivo] = useState(0);
  const [paso, setPaso] = useState("conteo");
  const [justificacion, setJustificacion] = useState("");
  const [codigoSupervisor, setCodigoSupervisor] = useState("");
  const [supervisorValidado, setSupervisorValidado] = useState(null);
  const [errorSupervisor, setErrorSupervisor] = useState("");
  const inputRef = useRef(null);
  
  const { totalEfectivoTotalCaja } = useMovCajaStore();
  const { datausuarios } = useUsuariosStore();
  const fechaactual = useFormattedDate();
  const { dataempresa } = useEmpresaStore();
  const {
    cerrarTurnoCajaAtomico,
    validarSupervisor,
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

  // Auto-focus en input
  useEffect(() => {
    if (paso === "conteo" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [paso]);

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

  // Calcular diferencia y nivel de alerta
  const diferencia = montoEfectivo - totalEfectivoTotalCaja;
  const porcentajeDiferencia = totalEfectivoTotalCaja > 0 
    ? Math.abs(diferencia) / totalEfectivoTotalCaja * 100 
    : 0;
  const isExact = diferencia === 0;
  const requiereJustificacion = !isExact;
  const requiereAutorizacion = !isExact && (
    porcentajeDiferencia > LIMITE_DIFERENCIA_PORCENTAJE || 
    Math.abs(diferencia) > LIMITE_DIFERENCIA_MONTO
  );

  // Determinar nivel de alerta
  const getNivelAlerta = () => {
    if (isExact) return 'perfecto';
    if (Math.abs(diferencia) <= 5) return 'normal';
    if (porcentajeDiferencia <= 2 || Math.abs(diferencia) <= 20) return 'advertencia';
    return 'critico';
  };

  const nivelAlerta = getNivelAlerta();

  // Validar supervisor
  const validarCodigoSupervisor = async () => {
    if (!codigoSupervisor.trim()) {
      setErrorSupervisor("Ingrese el código del supervisor");
      return;
    }
    
    try {
      const resultado = await validarSupervisor({
        codigo: codigoSupervisor.trim(),
        id_empresa: dataempresa?.id,
      });
      
      if (resultado?.valido) {
        setSupervisorValidado(resultado);
        setErrorSupervisor("");
        toast.success(`Autorizado por: ${resultado.nombre_supervisor}`, { position: "top-center" });
      } else {
        setErrorSupervisor("Código de supervisor no válido");
        setSupervisorValidado(null);
      }
    } catch (error) {
      setErrorSupervisor("Error al validar supervisor");
      setSupervisorValidado(null);
    }
  };

  const insertar = async (data) => {
    const p = {
      id: dataCierreCaja?.id,
      fechacierre: fechaactual,
      id_usuario: datausuarios?.id,
      total_efectivo_real: parseFloat(data.montoreal),
      justificacion: justificacion || null,
      requirio_autorizacion: requiereAutorizacion && supervisorValidado?.valido,
      id_supervisor: supervisorValidado?.id_supervisor || null,
    };
    await cerrarTurnoCajaAtomico(p);
  };

  const { isPending, mutate: doInsertar } = useMutation({
    mutationKey: ["cerrar turno caja"],
    mutationFn: insertar,
    onSuccess: (resultado) => {
      const nivelMsg = resultado?.nivel_alerta || nivelAlerta;
      let mensaje = "Caja cerrada correctamente";
      
      if (nivelMsg === 'perfecto') {
        mensaje = "✓ Caja cerrada - Cuadre perfecto";
      } else if (nivelMsg === 'normal') {
        mensaje = "Caja cerrada - Diferencia mínima registrada";
      } else if (nivelMsg === 'advertencia') {
        mensaje = "Caja cerrada - Diferencia registrada para revisión";
      } else if (nivelMsg === 'critico') {
        mensaje = "⚠ Caja cerrada - Diferencia crítica notificada a gerencia";
      }
      
      toast.success(mensaje, { position: "top-center", duration: 4000 });
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

  const handleConteoSubmit = (data) => {
    if (requiereJustificacion && !isExact) {
      setPaso("justificacion");
    } else {
      doInsertar(data);
    }
  };

  const handleJustificacionSubmit = () => {
    if (!justificacion.trim()) {
      toast.error("Debe ingresar una justificación", { position: "top-center" });
      return;
    }
    
    if (requiereAutorizacion) {
      setPaso("autorizacion");
    } else {
      doInsertar({ montoreal: montoEfectivo });
    }
  };

  const handleAutorizacionSubmit = () => {
    if (!supervisorValidado?.valido) {
      toast.error("Debe validar el código del supervisor", { position: "top-center" });
      return;
    }
    doInsertar({ montoreal: montoEfectivo });
  };

  // Si está cargando, mostrar loading
  if (isLoadingPendientes) {
    return (
      <Overlay>
        <Modal>
          <LoadingState>
            <Spinner />
            <LoadingText>Verificando estado...</LoadingText>
          </LoadingState>
        </Modal>
      </Overlay>
    );
  }

  // Si hay ventas pendientes, mostrar advertencia
  if (ventasPendientes > 0) {
    return (
      <Overlay onClick={() => setStateConteoCaja(false)}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <IconCircle $variant="warning">
              <Icon icon="lucide:alert-triangle" />
            </IconCircle>
            <ModalTitle>Ventas Pendientes</ModalTitle>
            <ModalSubtitle>
              Hay <strong>{ventasPendientes}</strong> venta(s) sin completar
            </ModalSubtitle>
          </ModalHeader>

          <AlertBox $variant="warning">
            <Icon icon="lucide:info" />
            <div>
              Estas ventas fueron iniciadas pero nunca completadas. 
              Debes eliminarlas para poder cerrar la caja.
            </div>
          </AlertBox>

          <ActionButtons>
            <SecondaryButton onClick={() => setStateConteoCaja(false)}>
              Cancelar
            </SecondaryButton>
            <DangerButton onClick={() => limpiarVentas()} disabled={isLimpiando}>
              {isLimpiando ? (
                <>
                  <Spinner $small />
                  Limpiando...
                </>
              ) : (
                <>
                  <Icon icon="lucide:trash-2" />
                  Eliminar Pendientes
                </>
              )}
            </DangerButton>
          </ActionButtons>
        </Modal>
      </Overlay>
    );
  }

  // PASO 1: Conteo de caja
  if (paso === "conteo") {
    return (
      <Overlay onClick={() => setStateConteoCaja(false)}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <CloseBtn onClick={() => setStateConteoCaja(false)}>
            <Icon icon="lucide:x" />
          </CloseBtn>

          <ModalHeader>
            <IconCircle>
              <Icon icon="lucide:calculator" />
            </IconCircle>
            <ModalTitle>Conteo de Efectivo</ModalTitle>
            <ModalSubtitle>Verifica el dinero físico en caja</ModalSubtitle>
          </ModalHeader>

          {/* Efectivo esperado - destacado */}
          <ExpectedCard>
            <ExpectedLabel>
              <Icon icon="lucide:wallet" />
              Efectivo esperado
            </ExpectedLabel>
            <ExpectedValue>
              {FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}
            </ExpectedValue>
          </ExpectedCard>

          {/* Formulario */}
          <Form onSubmit={handleSubmit(handleConteoSubmit)}>
            <InputGroup>
              <InputLabel>Efectivo contado físicamente</InputLabel>
              <InputContainer>
                <CurrencyPrefix>{dataempresa?.currency || "S/"}</CurrencyPrefix>
                <AmountInput
                  ref={inputRef}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("montoreal", {
                    required: true,
                    onChange: (e) => setMontoEfectivo(parseFloat(e.target.value) || 0),
                  })}
                />
              </InputContainer>
              {errors.montoreal && <InputError>Campo requerido</InputError>}
            </InputGroup>

            {/* Resultado de diferencia */}
            {montoEfectivo > 0 && (
              <ResultCard $nivel={nivelAlerta}>
                <ResultIcon $nivel={nivelAlerta}>
                  <Icon icon={isExact ? "lucide:check-circle-2" : nivelAlerta === 'critico' ? "lucide:alert-octagon" : "lucide:alert-triangle"} />
                </ResultIcon>
                <ResultContent>
                  <ResultLabel>{isExact ? 'Cuadre perfecto' : 'Diferencia detectada'}</ResultLabel>
                  <ResultValue $nivel={nivelAlerta}>
                    {diferencia > 0 ? '+' : ''}{FormatearNumeroDinero(diferencia, dataempresa?.currency, dataempresa?.iso)}
                  </ResultValue>
                </ResultContent>
                {!isExact && (
                  <ResultBadge $nivel={nivelAlerta}>
                    {porcentajeDiferencia.toFixed(1)}%
                  </ResultBadge>
                )}
              </ResultCard>
            )}

            {/* Mensaje de estado */}
            {montoEfectivo > 0 && !isExact && (
              <StatusAlert $nivel={nivelAlerta}>
                {nivelAlerta === 'normal' && (
                  <>
                    <Icon icon="lucide:info" />
                    Diferencia mínima - se registrará automáticamente
                  </>
                )}
                {nivelAlerta === 'advertencia' && (
                  <>
                    <Icon icon="lucide:file-text" />
                    Se requiere justificación para continuar
                  </>
                )}
                {nivelAlerta === 'critico' && (
                  <>
                    <Icon icon="lucide:shield-alert" />
                    Requiere justificación + autorización de supervisor
                  </>
                )}
              </StatusAlert>
            )}

            {/* Botón de acción */}
            <PrimaryButton type="submit" disabled={isPending || montoEfectivo <= 0}>
              {isPending ? (
                <>
                  <Spinner $small />
                  Procesando...
                </>
              ) : isExact ? (
                <>
                  <Icon icon="lucide:check" />
                  Cerrar Turno
                </>
              ) : (
                <>
                  <Icon icon="lucide:arrow-right" />
                  Continuar
                </>
              )}
            </PrimaryButton>
          </Form>
        </Modal>
      </Overlay>
    );
  }

  // PASO 2: Justificación
  if (paso === "justificacion") {
    return (
      <Overlay onClick={() => setPaso("conteo")}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <BackBtn onClick={() => setPaso("conteo")}>
            <Icon icon="lucide:arrow-left" />
          </BackBtn>

          <ModalHeader>
            <IconCircle $variant="warning">
              <Icon icon="lucide:file-text" />
            </IconCircle>
            <ModalTitle>Justificación</ModalTitle>
            <ModalSubtitle>Explica el motivo de la diferencia</ModalSubtitle>
          </ModalHeader>

          {/* Resumen de diferencia compacto */}
          <SummaryBox $nivel={nivelAlerta}>
            <SummaryRow>
              <span>Esperado</span>
              <span>{FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}</span>
            </SummaryRow>
            <SummaryRow>
              <span>Contado</span>
              <span>{FormatearNumeroDinero(montoEfectivo, dataempresa?.currency, dataempresa?.iso)}</span>
            </SummaryRow>
            <SummaryDivider />
            <SummaryRow $highlight $nivel={nivelAlerta}>
              <span>Diferencia</span>
              <strong>{diferencia > 0 ? '+' : ''}{FormatearNumeroDinero(diferencia, dataempresa?.currency, dataempresa?.iso)}</strong>
            </SummaryRow>
          </SummaryBox>

          {/* Campo de justificación */}
          <InputGroup>
            <InputLabel>
              <Icon icon="lucide:message-square" />
              ¿Qué ocurrió?
            </InputLabel>
            <TextArea
              placeholder="Ej: Error al dar vuelto, billete falso detectado..."
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <CharCounter $warning={justificacion.length < 10}>
              {justificacion.length}/200 (mínimo 10)
            </CharCounter>
          </InputGroup>

          <ActionButtons>
            <SecondaryButton onClick={() => setPaso("conteo")}>
              <Icon icon="lucide:arrow-left" />
              Volver
            </SecondaryButton>
            <PrimaryButton 
              onClick={handleJustificacionSubmit} 
              disabled={justificacion.trim().length < 10 || isPending}
            >
              {isPending ? (
                <>
                  <Spinner $small />
                  Procesando...
                </>
              ) : requiereAutorizacion ? (
                <>
                  <Icon icon="lucide:shield" />
                  Solicitar Autorización
                </>
              ) : (
                <>
                  <Icon icon="lucide:check" />
                  Cerrar Turno
                </>
              )}
            </PrimaryButton>
          </ActionButtons>
        </Modal>
      </Overlay>
    );
  }

  // PASO 3: Autorización de supervisor
  if (paso === "autorizacion") {
    return (
      <Overlay onClick={() => setPaso("justificacion")}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <BackBtn onClick={() => setPaso("justificacion")}>
            <Icon icon="lucide:arrow-left" />
          </BackBtn>

          <ModalHeader>
            <IconCircle $variant="danger">
              <Icon icon="lucide:shield-check" />
            </IconCircle>
            <ModalTitle>Autorización Requerida</ModalTitle>
            <ModalSubtitle>La diferencia excede el límite permitido</ModalSubtitle>
          </ModalHeader>

          {/* Alerta crítica */}
          <AlertBox $variant="danger">
            <Icon icon="lucide:alert-octagon" />
            <div>
              <strong>Diferencia: {FormatearNumeroDinero(Math.abs(diferencia), dataempresa?.currency, dataempresa?.iso)}</strong>
              <p>Supera el límite de {LIMITE_DIFERENCIA_PORCENTAJE}% o {FormatearNumeroDinero(LIMITE_DIFERENCIA_MONTO, dataempresa?.currency, dataempresa?.iso)}</p>
            </div>
          </AlertBox>

          {/* Justificación ingresada */}
          <JustificationPreview>
            <PreviewHeader>
              <Icon icon="lucide:quote" />
              Justificación registrada
            </PreviewHeader>
            <PreviewContent>"{justificacion}"</PreviewContent>
          </JustificationPreview>

          {/* Campo de código de supervisor */}
          <InputGroup>
            <InputLabel>
              <Icon icon="lucide:key" />
              Código de Supervisor
            </InputLabel>
            <InputContainer>
              <SupervisorInput
                type="text"
                placeholder="Email, DNI o código"
                value={codigoSupervisor}
                onChange={(e) => {
                  setCodigoSupervisor(e.target.value);
                  setErrorSupervisor("");
                  setSupervisorValidado(null);
                }}
              />
              <ValidateBtn 
                type="button" 
                onClick={validarCodigoSupervisor}
                disabled={!codigoSupervisor.trim()}
                $validated={supervisorValidado?.valido}
              >
                <Icon icon={supervisorValidado?.valido ? "lucide:check" : "lucide:arrow-right"} />
              </ValidateBtn>
            </InputContainer>
            {errorSupervisor && <InputError>{errorSupervisor}</InputError>}
          </InputGroup>
          
          {supervisorValidado?.valido && (
            <SuccessBox>
              <Icon icon="lucide:badge-check" />
              Autorizado por: <strong>{supervisorValidado.nombre_supervisor}</strong>
            </SuccessBox>
          )}

          <ActionButtons>
            <SecondaryButton onClick={() => setPaso("justificacion")}>
              <Icon icon="lucide:arrow-left" />
              Volver
            </SecondaryButton>
            <DangerButton 
              onClick={handleAutorizacionSubmit} 
              disabled={!supervisorValidado?.valido || isPending}
            >
              {isPending ? (
                <>
                  <Spinner $small />
                  Cerrando...
                </>
              ) : (
                <>
                  <Icon icon="lucide:log-out" />
                  Cerrar Turno
                </>
              )}
            </DangerButton>
          </ActionButtons>
        </Modal>
      </Overlay>
    );
  }

  return null;
}

// ============== ESTILOS MINIMALISTAS ==============

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: ${({ $small }) => $small ? '18px' : '32px'};
  height: ${({ $small }) => $small ? '18px' : '32px'};
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  padding: 28px;
  position: relative;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  overflow-y: auto;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  font-size: 18px;
  transition: all 0.15s;

  &:hover {
    background: #eee;
    color: #111;
  }
`;

const BackBtn = styled(CloseBtn)`
  left: 20px;
  right: auto;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
  color: #666;
`;

const LoadingText = styled.span`
  font-size: 14px;
  color: #666;
`;

/* Header del Modal */
const ModalHeader = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const IconCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  background: ${({ $variant }) => 
    $variant === 'danger' ? '#dc2626' : 
    $variant === 'warning' ? '#f59e0b' : 
    '#111'};

  svg {
    font-size: 26px;
    color: #fff;
  }
`;

const ModalTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #111;
  margin: 0 0 6px;
`;

const ModalSubtitle = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0;
  
  strong {
    color: #111;
  }
`;

/* Card de efectivo esperado */
const ExpectedCard = styled.div`
  background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  margin-bottom: 24px;
`;

const ExpectedLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;

  svg {
    font-size: 16px;
  }
`;

const ExpectedValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #fff;
`;

/* Formulario */
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InputLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    font-size: 16px;
    color: #666;
  }
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CurrencyPrefix = styled.span`
  position: absolute;
  left: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #999;
  pointer-events: none;
`;

const AmountInput = styled.input`
  width: 100%;
  padding: 16px 16px 16px 52px;
  font-size: 22px;
  font-weight: 600;
  border: 2px solid #e5e5e5;
  border-radius: 14px;
  text-align: right;
  outline: none;
  transition: all 0.2s;
  background: #fafafa;

  &:focus {
    border-color: #111;
    background: #fff;
  }

  &::placeholder {
    color: #ccc;
    font-weight: 400;
  }
`;

const SupervisorInput = styled.input`
  width: 100%;
  padding: 14px 52px 14px 16px;
  font-size: 15px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s;
  background: #fafafa;

  &:focus {
    border-color: #111;
    background: #fff;
  }
`;

const InputError = styled.span`
  font-size: 12px;
  color: #dc2626;
`;

/* Resultado de diferencia */
const getColorByNivel = (nivel) => {
  switch (nivel) {
    case 'perfecto': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '#dcfce7' };
    case 'normal': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '#dcfce7' };
    case 'advertencia': return { bg: '#fefce8', border: '#fef08a', text: '#ca8a04', icon: '#fef9c3' };
    case 'critico': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '#fee2e2' };
    default: return { bg: '#f5f5f5', border: '#e5e5e5', text: '#666', icon: '#eee' };
  }
};

const ResultCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: ${({ $nivel }) => getColorByNivel($nivel).bg};
  border: 1px solid ${({ $nivel }) => getColorByNivel($nivel).border};
`;

const ResultIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $nivel }) => getColorByNivel($nivel).icon};

  svg {
    font-size: 22px;
    color: ${({ $nivel }) => getColorByNivel($nivel).text};
  }
`;

const ResultContent = styled.div`
  flex: 1;
`;

const ResultLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
`;

const ResultValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ $nivel }) => getColorByNivel($nivel).text};
`;

const ResultBadge = styled.span`
  background: ${({ $nivel }) => getColorByNivel($nivel).icon};
  color: ${({ $nivel }) => getColorByNivel($nivel).text};
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
`;

const StatusAlert = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  padding: 12px 16px;
  border-radius: 10px;
  background: ${({ $nivel }) => getColorByNivel($nivel).bg};
  color: ${({ $nivel }) => 
    $nivel === 'perfecto' || $nivel === 'normal' ? '#166534' :
    $nivel === 'advertencia' ? '#854d0e' : '#991b1b'};
    
  svg {
    font-size: 16px;
    flex-shrink: 0;
  }
`;

/* Botones */
const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const PrimaryButton = styled.button`
  flex: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 600;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #15803d;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    font-size: 18px;
  }
`;

const SecondaryButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 500;
  background: #fff;
  color: #666;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f5f5f5;
    border-color: #ddd;
  }

  svg {
    font-size: 18px;
  }
`;

const DangerButton = styled(PrimaryButton)`
  background: #dc2626;

  &:hover:not(:disabled) {
    background: #b91c1c;
  }
`;

/* Summary Box */
const SummaryBox = styled.div`
  background: ${({ $nivel }) => getColorByNivel($nivel).bg};
  border: 1px solid ${({ $nivel }) => getColorByNivel($nivel).border};
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: ${({ $highlight }) => $highlight ? '#111' : '#666'};
  padding: 6px 0;
  
  strong {
    font-weight: 700;
    font-size: ${({ $highlight }) => $highlight ? '16px' : '14px'};
    color: ${({ $nivel, $highlight }) => $highlight ? getColorByNivel($nivel).text : 'inherit'};
  }
`;

const SummaryDivider = styled.hr`
  border: none;
  border-top: 1px dashed #ddd;
  margin: 8px 0;
`;

/* Text Area */
const TextArea = styled.textarea`
  width: 100%;
  padding: 14px;
  font-size: 14px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  background: #fafafa;
  
  &:focus {
    border-color: #f59e0b;
    background: #fff;
  }
  
  &::placeholder {
    color: #aaa;
  }
`;

const CharCounter = styled.div`
  font-size: 12px;
  text-align: right;
  color: ${({ $warning }) => $warning ? '#dc2626' : '#999'};
`;

/* Alert Boxes */
const AlertBox = styled.div`
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  margin-bottom: 20px;
  background: ${({ $variant }) => $variant === 'danger' ? '#fef2f2' : '#fffbeb'};
  border: 1px solid ${({ $variant }) => $variant === 'danger' ? '#fecaca' : '#fde68a'};
  
  > svg {
    font-size: 22px;
    color: ${({ $variant }) => $variant === 'danger' ? '#dc2626' : '#f59e0b'};
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  div {
    flex: 1;
    font-size: 13px;
    color: ${({ $variant }) => $variant === 'danger' ? '#991b1b' : '#92400e'};
    line-height: 1.5;
    
    strong {
      display: block;
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    p {
      margin: 0;
    }
  }
`;

/* Justification Preview */
const JustificationPreview = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 20px;
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
  
  svg {
    font-size: 14px;
  }
`;

const PreviewContent = styled.div`
  font-size: 14px;
  color: #334155;
  font-style: italic;
  line-height: 1.5;
`;

/* Validate Button */
const ValidateBtn = styled.button`
  position: absolute;
  right: 6px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $validated }) => $validated ? '#16a34a' : '#111'};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 18px;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
  }
  
  &:disabled {
    background: #e5e5e5;
    color: #999;
    cursor: not-allowed;
  }
`;

/* Success Box */
const SuccessBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 14px;
  font-size: 14px;
  color: #166534;
  
  svg {
    font-size: 20px;
    color: #16a34a;
  }
  
  strong {
    color: #15803d;
  }
`;