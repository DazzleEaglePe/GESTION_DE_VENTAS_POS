import styled from "styled-components";
import { useCierreCajaStore } from "../../../../store/CierreCajaStore";
import { useEffect, useState } from "react";
import { useCajasStore } from "../../../../store/CajasStore";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useMovCajaStore } from "../../../../store/MovCajaStore";
import { useMetodosPagoStore } from "../../../../store/MetodosPagoStore";
import { useUsuariosStore } from "../../../../store/UsuariosStore";
import { useFormattedDate } from "../../../../hooks/useFormattedDate";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";

export function PantallaIngresoSalidaDinero() {
  const fechaActual = useFormattedDate();
  const { tipoRegistro, setStateIngresoSalida, dataCierreCaja } = useCierreCajaStore();
  const { insertarMovCaja } = useMovCajaStore();
  const [selectedMetodo, setSelectedMetodo] = useState(null);
  const { dataMetodosPago } = useMetodosPagoStore();
  const { datausuarios } = useUsuariosStore();

  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm();

  const isIngreso = tipoRegistro === "ingreso";

  const insertar = async (data) => {
    const pmovcaja = {
      fecha_movimiento: fechaActual,
      tipo_movimiento: tipoRegistro,
      monto: parseFloat(data.monto),
      id_metodo_pago: selectedMetodo?.id,
      descripcion: `${isIngreso ? "Ingreso" : "Salida"} de dinero con ${selectedMetodo?.nombre}${data.motivo ? ` - ${data.motivo}` : ""}`,
      id_usuario: datausuarios?.id,
      id_cierre_caja: dataCierreCaja?.id,
    };
    await insertarMovCaja(pmovcaja);
  };

  const { isPending, mutate: doInsertar } = useMutation({
    mutationKey: ["insertar ingresos salidas caja"],
    mutationFn: insertar,
    onSuccess: () => {
      toast.success("Movimiento registrado correctamente");
      setStateIngresoSalida(false);
      reset();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || "Error al registrar";
      toast.error(errorMessage);
    },
  });

  const handleMetodoClick = (item) => {
    setSelectedMetodo(item);
  };

  useEffect(() => {
    const efectivo = dataMetodosPago?.find((item) => item.nombre === "Efectivo");
    if (efectivo) {
      setSelectedMetodo(efectivo);
    }
  }, [dataMetodosPago]);

  // Confirmar cierre con datos sin guardar
  const handleCerrarConConfirmacion = async () => {
    const result = await Swal.fire({
      title: '¿Salir sin guardar?',
      text: 'Si sales ahora, perderás los datos ingresados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#111',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Seguir editando',
      reverseButtons: true,
    });
    if (result.isConfirmed) setStateIngresoSalida(false);
  };

  return (
    <Overlay onClick={handleCerrarConConfirmacion}>
      <Container onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <CloseButton onClick={handleCerrarConConfirmacion}>
            <Icon icon="lucide:x" />
          </CloseButton>
          <HeaderIcon $isIngreso={isIngreso}>
            <Icon icon={isIngreso ? "lucide:arrow-down-circle" : "lucide:arrow-up-circle"} />
          </HeaderIcon>
          <Title>{isIngreso ? "Ingresar Dinero" : "Retirar Dinero"}</Title>
          <Subtitle>
            {isIngreso ? "Registra un ingreso de efectivo a caja" : "Registra una salida de dinero de caja"}
          </Subtitle>
        </Header>

        {/* Métodos de pago */}
        <Section>
          <SectionLabel>Método de pago</SectionLabel>
          <MetodosGrid>
            {dataMetodosPago
              ?.filter((item) => item.nombre !== "Mixto")
              .map((item, index) => (
                <MetodoCard
                  key={index}
                  $selected={item.id === selectedMetodo?.id}
                  onClick={() => handleMetodoClick(item)}
                >
                  {item.icono && item.icono !== "-" ? (
                    <MetodoImage src={item.icono} alt={item.nombre} />
                  ) : (
                    <MetodoIcon>
                      <Icon icon="lucide:wallet" />
                    </MetodoIcon>
                  )}
                  <span>{item.nombre}</span>
                </MetodoCard>
              ))}
          </MetodosGrid>
        </Section>

        {/* Form */}
        <Form onSubmit={handleSubmit((data) => doInsertar(data))}>
          <InputGroup>
            <InputLabel>Monto</InputLabel>
            <InputWrapper>
              <InputIcon>S/</InputIcon>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("monto", { required: "El monto es requerido" })}
              />
            </InputWrapper>
            {errors.monto && <InputError>{errors.monto.message}</InputError>}
          </InputGroup>

          <InputGroup>
            <InputLabel>Motivo (opcional)</InputLabel>
            <TextArea
              rows="2"
              placeholder="Describe el motivo del movimiento..."
              {...register("motivo")}
            />
          </InputGroup>

          <ButtonGroup>
            <CancelButton type="button" onClick={() => setStateIngresoSalida(false)}>
              Cancelar
            </CancelButton>
            <SubmitButton type="submit" disabled={isPending} $isIngreso={isIngreso}>
              {isPending ? (
                <Icon icon="lucide:loader-2" className="spin" />
              ) : (
                <>
                  <Icon icon={isIngreso ? "lucide:plus" : "lucide:minus"} />
                  {isIngreso ? "Registrar Ingreso" : "Registrar Salida"}
                </>
              )}
            </SubmitButton>
          </ButtonGroup>
        </Form>
      </Container>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Container = styled.div`
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  padding: 24px 24px 20px;
  text-align: center;
  position: relative;
  border-bottom: 1px solid #f0f0f0;
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
  width: 56px;
  height: 56px;
  background: ${({ $isIngreso }) => $isIngreso ? '#f0fdf4' : '#fef2f2'};
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  svg {
    font-size: 28px;
    color: ${({ $isIngreso }) => $isIngreso ? '#16a34a' : '#dc2626'};
  }
`;

const Title = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #111;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0;
`;

const Section = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
`;

const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
`;

const MetodosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const MetodoCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: ${({ $selected }) => $selected ? '#111' : '#fafafa'};
  border: 2px solid ${({ $selected }) => $selected ? '#111' : '#e5e5e5'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;

  span {
    font-size: 12px;
    font-weight: 500;
    color: ${({ $selected }) => $selected ? '#fff' : '#333'};
  }

  &:hover {
    border-color: #111;
  }
`;

const MetodoImage = styled.img`
  width: 28px;
  height: 28px;
  object-fit: contain;
`;

const MetodoIcon = styled.div`
  font-size: 24px;
  color: inherit;
`;

const Form = styled.form`
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InputLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #333;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.span`
  position: absolute;
  left: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #666;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 14px 14px 44px;
  font-size: 18px;
  font-weight: 600;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  background: #fafafa;
  color: #111;
  transition: all 0.15s;
  outline: none;

  &::placeholder {
    color: #bbb;
    font-weight: 400;
  }

  &:focus {
    border-color: #111;
    background: #fff;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  background: #fafafa;
  color: #111;
  transition: all 0.15s;
  outline: none;
  resize: none;
  font-family: inherit;

  &::placeholder {
    color: #bbb;
  }

  &:focus {
    border-color: #111;
    background: #fff;
  }
`;

const InputError = styled.span`
  font-size: 12px;
  color: #ef4444;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 14px;
  font-size: 14px;
  font-weight: 600;
  background: transparent;
  color: #666;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f5f5f5;
    color: #111;
  }
`;

const SubmitButton = styled.button`
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  font-size: 14px;
  font-weight: 600;
  background: ${({ $isIngreso }) => $isIngreso ? '#16a34a' : '#dc2626'};
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

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
`;
