import styled, { keyframes, css } from "styled-components";
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

// Niveles de alerta
const NIVEL = {
  PERFECTO: 'perfecto',
  ACEPTABLE: 'aceptable', 
  REQUIERE_REVISION: 'requiere_revision'
};

export function PantallaConteoCaja() {
  const { cerrarSesion } = useAuthStore();
  const [montoEfectivo, setMontoEfectivo] = useState("");
  const [inputTocado, setInputTocado] = useState(false);
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
  const { reset } = useForm();

  // Auto-focus en input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
      toast.success(`${resultado.eliminadas} venta(s) eliminadas`);
      refetchPendientes();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Calcular diferencia
  const montoNumerico = parseFloat(montoEfectivo) || 0;
  const diferencia = montoNumerico - totalEfectivoTotalCaja;
  const porcentajeDiferencia = totalEfectivoTotalCaja > 0 
    ? Math.abs(diferencia) / totalEfectivoTotalCaja * 100 
    : 0;
  const isExact = diferencia === 0;
  
  const requiereAutorizacion = !isExact && (
    porcentajeDiferencia > LIMITE_DIFERENCIA_PORCENTAJE || 
    Math.abs(diferencia) > LIMITE_DIFERENCIA_MONTO
  );

  const getNivelAlerta = () => {
    if (isExact) return NIVEL.PERFECTO;
    if (!requiereAutorizacion) return NIVEL.ACEPTABLE;
    return NIVEL.REQUIERE_REVISION;
  };

  const nivelAlerta = getNivelAlerta();

  // Validar supervisor
  const validarCodigoSupervisor = async () => {
    if (!codigoSupervisor.trim()) {
      setErrorSupervisor("Ingrese el código");
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
        toast.success(`Autorizado: ${resultado.nombre_supervisor}`);
      } else {
        setErrorSupervisor("Código inválido");
        setSupervisorValidado(null);
      }
    } catch (error) {
      setErrorSupervisor("Error de conexión");
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
    onSuccess: () => {
      const mensaje = nivelAlerta === NIVEL.PERFECTO 
        ? "✓ Cuadre perfecto" 
        : nivelAlerta === NIVEL.ACEPTABLE
        ? "Caja cerrada correctamente"
        : "Caja cerrada - Diferencia registrada";
      
      toast.success(mensaje, { duration: 3000 });
      setStateConteoCaja(false);
      setStateCierraCaja(false);
      reset();
      queryClient.invalidateQueries(["mostrar cierre de caja"]);
      cerrarSesion();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCerrarCaja = () => {
    if (!isExact) {
      if (!justificacion.trim() || justificacion.length < 10) {
        toast.error("Ingresa una justificación (mín. 10 caracteres)");
        return;
      }
      if (requiereAutorizacion && !supervisorValidado?.valido) {
        toast.error("Se requiere autorización de supervisor");
        return;
      }
    }
    doInsertar({ montoreal: montoEfectivo });
  };

  // Loading
  if (isLoadingPendientes) {
    return (
      <Overlay>
        <Modal>
          <LoadingState>
            <Spinner />
            <LoadingText>Verificando...</LoadingText>
          </LoadingState>
        </Modal>
      </Overlay>
    );
  }

  // Ventas pendientes
  if (ventasPendientes > 0) {
    return (
      <Overlay onClick={() => setStateConteoCaja(false)}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <CloseBtn onClick={() => setStateConteoCaja(false)}>
            <Icon icon="lucide:x" />
          </CloseBtn>
          
          <ModalHeader>
            <IconBadge $variant="warning">
              <Icon icon="lucide:alert-triangle" />
            </IconBadge>
            <ModalTitle>Ventas Pendientes</ModalTitle>
            <ModalSubtitle>
              Hay {ventasPendientes} venta(s) sin completar
            </ModalSubtitle>
          </ModalHeader>

          <InfoText>
            Elimina las ventas pendientes para continuar.
          </InfoText>

          <ActionRow>
            <BtnSecondary onClick={() => setStateConteoCaja(false)}>
              Cancelar
            </BtnSecondary>
            <BtnDanger onClick={() => limpiarVentas()} disabled={isLimpiando}>
              {isLimpiando ? <Spinner $small /> : <Icon icon="lucide:trash-2" />}
              {isLimpiando ? "Limpiando..." : "Eliminar"}
            </BtnDanger>
          </ActionRow>
        </Modal>
      </Overlay>
    );
  }

  // Modal principal
  return (
    <Overlay onClick={() => setStateConteoCaja(false)}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={() => setStateConteoCaja(false)}>
          <Icon icon="lucide:x" />
        </CloseBtn>

        <ModalHeader>
          <IconBadge>
            <Icon icon="lucide:calculator" />
          </IconBadge>
          <ModalTitle>Cerrar Caja</ModalTitle>
          <ModalSubtitle>Cuenta el efectivo físico</ModalSubtitle>
        </ModalHeader>

        {/* Monto esperado */}
        <ExpectedBox>
          <ExpectedLabel>Efectivo esperado</ExpectedLabel>
          <ExpectedValue>
            {FormatearNumeroDinero(totalEfectivoTotalCaja, dataempresa?.currency, dataempresa?.iso)}
          </ExpectedValue>
        </ExpectedBox>

        {/* Input de conteo */}
        <InputWrapper>
          <InputLabel>Efectivo contado</InputLabel>
          <InputField>
            <CurrencySymbol>{dataempresa?.currency || "S/"}</CurrencySymbol>
            <MoneyInput
              ref={inputRef}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={montoEfectivo}
              onChange={(e) => {
                setInputTocado(true);
                setMontoEfectivo(e.target.value);
              }}
            />
          </InputField>
        </InputWrapper>

        {/* Resultado de diferencia */}
        {inputTocado && montoEfectivo !== "" && (
          <DiffResult $nivel={nivelAlerta}>
            <DiffIcon $nivel={nivelAlerta}>
              <Icon icon={
                nivelAlerta === NIVEL.PERFECTO ? "lucide:check" :
                nivelAlerta === NIVEL.ACEPTABLE ? "lucide:minus" : "lucide:alert-triangle"
              } />
            </DiffIcon>
            <DiffInfo>
              <DiffLabel>
                {nivelAlerta === NIVEL.PERFECTO ? "Cuadre perfecto" :
                 nivelAlerta === NIVEL.ACEPTABLE ? "Diferencia aceptable" : "Diferencia alta"}
              </DiffLabel>
              <DiffValue $nivel={nivelAlerta}>
                {diferencia > 0 ? "+" : ""}{FormatearNumeroDinero(diferencia, dataempresa?.currency, dataempresa?.iso)}
              </DiffValue>
            </DiffInfo>
            {!isExact && (
              <DiffPercent $nivel={nivelAlerta}>{porcentajeDiferencia.toFixed(1)}%</DiffPercent>
            )}
          </DiffResult>
        )}

        {/* Campos adicionales si hay diferencia */}
        {inputTocado && montoEfectivo !== "" && !isExact && (
          <ExtraFields>
            <FieldGroup>
              <FieldLabel>Motivo de la diferencia</FieldLabel>
              <TextField
                placeholder="Ej: Error al dar vuelto..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                maxLength={200}
              />
              <CharCount $warning={justificacion.length < 10 && justificacion.length > 0}>
                {justificacion.length}/200
              </CharCount>
            </FieldGroup>

            {requiereAutorizacion && (
              <FieldGroup>
                <FieldLabel>
                  Autorización de supervisor
                  <RequiredBadge>Requerido</RequiredBadge>
                </FieldLabel>
                <SupervisorField>
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
                  <ValidateButton 
                    onClick={validarCodigoSupervisor}
                    disabled={!codigoSupervisor.trim()}
                    $valid={supervisorValidado?.valido}
                  >
                    <Icon icon={supervisorValidado?.valido ? "lucide:check" : "lucide:arrow-right"} />
                  </ValidateButton>
                </SupervisorField>
                {errorSupervisor && <ErrorMsg>{errorSupervisor}</ErrorMsg>}
                {supervisorValidado?.valido && (
                  <SuccessMsg>
                    <Icon icon="lucide:check-circle" />
                    {supervisorValidado.nombre_supervisor}
                  </SuccessMsg>
                )}
              </FieldGroup>
            )}
          </ExtraFields>
        )}

        {/* Botón de acción */}
        <ActionRow>
          <BtnPrimary 
            onClick={handleCerrarCaja} 
            disabled={
              isPending || 
              !inputTocado ||
              montoEfectivo === "" ||
              parseFloat(montoEfectivo) < 0 ||
              (parseFloat(montoEfectivo) === 0 && totalEfectivoTotalCaja > 0) ||
              (!isExact && justificacion.length < 10) ||
              (requiereAutorizacion && !supervisorValidado?.valido)
            }
            $nivel={nivelAlerta}
          >
            {isPending ? (
              <>
                <Spinner $small />
                Cerrando...
              </>
            ) : (
              <>
                <Icon icon="lucide:log-out" />
                Cerrar Caja
              </>
            )}
          </BtnPrimary>
        </ActionRow>
      </Modal>
    </Overlay>
  );
}

// ============== ESTILOS MINIMALISTAS ==============

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const slideUp = keyframes`
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
`;

const Spinner = styled.div`
  width: ${({ $small }) => $small ? '16px' : '28px'};
  height: ${({ $small }) => $small ? '16px' : '28px'};
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
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
  max-width: 380px;
  padding: 24px;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow-y: auto;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #999;
  font-size: 18px;
  transition: all 0.15s;

  &:hover {
    background: #f5f5f5;
    color: #333;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #666;
`;

const LoadingText = styled.span`
  font-size: 13px;
  color: #999;
`;

/* Header */
const ModalHeader = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

const IconBadge = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  background: ${({ $variant }) => 
    $variant === 'warning' ? '#fef3c7' : 
    $variant === 'danger' ? '#fee2e2' : '#f3f4f6'};

  svg {
    font-size: 22px;
    color: ${({ $variant }) => 
      $variant === 'warning' ? '#d97706' : 
      $variant === 'danger' ? '#dc2626' : '#374151'};
  }
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 4px;
`;

const ModalSubtitle = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0;
`;

/* Expected Box */
const ExpectedBox = styled.div`
  background: #111;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 16px;
`;

const ExpectedLabel = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
`;

const ExpectedValue = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: #fff;
`;

/* Input */
const InputWrapper = styled.div`
  margin-bottom: 16px;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
`;

const InputField = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CurrencySymbol = styled.span`
  position: absolute;
  left: 14px;
  font-size: 16px;
  font-weight: 500;
  color: #999;
`;

const MoneyInput = styled.input`
  width: 100%;
  padding: 14px 14px 14px 44px;
  font-size: 20px;
  font-weight: 600;
  border: 1.5px solid #e5e5e5;
  border-radius: 10px;
  text-align: right;
  outline: none;
  transition: border-color 0.15s;
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

/* Diferencia Result */
const getNivelColors = (nivel) => {
  switch (nivel) {
    case 'perfecto': return { bg: '#f0fdf4', border: '#dcfce7', text: '#16a34a', badge: '#dcfce7' };
    case 'aceptable': return { bg: '#fefce8', border: '#fef9c3', text: '#ca8a04', badge: '#fef9c3' };
    case 'requiere_revision': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#fecaca' };
    default: return { bg: '#f5f5f5', border: '#e5e5e5', text: '#666', badge: '#e5e5e5' };
  }
};

const DiffResult = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: ${({ $nivel }) => getNivelColors($nivel).bg};
  border: 1px solid ${({ $nivel }) => getNivelColors($nivel).border};
  margin-bottom: 16px;
  animation: ${slideUp} 0.2s ease-out;
`;

const DiffIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $nivel }) => getNivelColors($nivel).badge};

  svg {
    font-size: 18px;
    color: ${({ $nivel }) => getNivelColors($nivel).text};
  }
`;

const DiffInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DiffLabel = styled.div`
  font-size: 11px;
  color: #666;
  margin-bottom: 2px;
`;

const DiffValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $nivel }) => getNivelColors($nivel).text};
`;

const DiffPercent = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${({ $nivel }) => getNivelColors($nivel).badge};
  color: ${({ $nivel }) => getNivelColors($nivel).text};
`;

/* Extra Fields */
const ExtraFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ${slideUp} 0.25s ease-out;
`;

const FieldGroup = styled.div``;

const FieldLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
`;

const RequiredBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: #fef2f2;
  color: #dc2626;
`;

const TextField = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  border: 1.5px solid #e5e5e5;
  border-radius: 8px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  background: #fafafa;
  min-height: 60px;
  
  &:focus {
    border-color: #111;
    background: #fff;
  }
  
  &::placeholder {
    color: #aaa;
  }
`;

const CharCount = styled.div`
  font-size: 10px;
  text-align: right;
  margin-top: 4px;
  color: ${({ $warning }) => $warning ? '#dc2626' : '#bbb'};
`;

const SupervisorField = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SupervisorInput = styled.input`
  width: 100%;
  padding: 10px 44px 10px 12px;
  font-size: 13px;
  border: 1.5px solid #e5e5e5;
  border-radius: 8px;
  outline: none;
  background: #fafafa;

  &:focus {
    border-color: #111;
    background: #fff;
  }
`;

const ValidateButton = styled.button`
  position: absolute;
  right: 4px;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: ${({ $valid }) => $valid ? '#16a34a' : '#111'};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 16px;
  transition: all 0.15s;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  &:disabled {
    background: #e5e5e5;
    color: #999;
    cursor: not-allowed;
  }
`;

const ErrorMsg = styled.span`
  display: block;
  font-size: 11px;
  color: #dc2626;
  margin-top: 4px;
`;

const SuccessMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #16a34a;
  margin-top: 6px;
  
  svg {
    font-size: 14px;
  }
`;

const InfoText = styled.p`
  font-size: 13px;
  color: #666;
  text-align: center;
  margin: 0 0 20px;
  line-height: 1.5;
`;

/* Action Buttons */
const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const BtnPrimary = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  background: ${({ $nivel }) => 
    $nivel === 'perfecto' ? '#16a34a' :
    $nivel === 'requiere_revision' ? '#dc2626' : '#111'};
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    font-size: 16px;
  }
`;

const BtnSecondary = styled.button`
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  background: #fff;
  color: #666;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f5f5f5;
  }
`;

const BtnDanger = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #b91c1c;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 16px;
  }
`;
