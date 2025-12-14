import styled from "styled-components";
import { Icon } from "@iconify/react";
import {
  ConvertirCapitalize,
  useEmpresaStore,
  useUsuariosStore,
} from "../../../index";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCajasStore } from "../../../store/CajasStore";
import { useAsignacionCajaSucursalStore } from "../../../store/AsignacionCajaSucursalStore";
import Swal from "sweetalert2";
export function RegistrarCaja() {
  const queryClient = useQueryClient();
  const { insertarAsignacionSucursal } = useAsignacionCajaSucursalStore();
  const { accion, cajaSelectItem, setStateCaja, insertarCaja, editarCaja } =
    useCajasStore();
  const { dataempresa } = useEmpresaStore();
  const { datausuarios } = useUsuariosStore();
  const {
    register,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm();

  const handleCerrarConConfirmacion = async () => {
    if (isDirty) {
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
        setStateCaja(false);
      }
    } else {
      setStateCaja(false);
    }
  };
  const insertar = async (data) => {
    if (accion === "Editar") {
      const p = {
        id: cajaSelectItem?.id,
        descripcion: ConvertirCapitalize(data.descripcion),
      };
      await editarCaja(p);
    } else {
      const p = {
        descripcion: ConvertirCapitalize(data.descripcion),
        id_sucursal: cajaSelectItem?.id,
      };
      const response = await insertarCaja(p);
      const pAsignaciones = {
        id_sucursal: cajaSelectItem?.id,
        id_usuario: datausuarios?.id,
        id_caja: response?.id,
      };
      await insertarAsignacionSucursal(pAsignaciones);
    }
  };
  const { isPending, mutate: doInsertar } = useMutation({
    mutationKey: ["insertar caja"],
    mutationFn: insertar,
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Caja registrada correctamente");
      queryClient.invalidateQueries(["mostrar Cajas XSucursal"]);
      setStateCaja(false);
    },
  });

  const handlesub = (data) => {
    doInsertar(data);
  };

  // Obtener nombre de sucursal para mostrar contexto
  const nombreSucursal = accion === "Editar" 
    ? "" 
    : cajaSelectItem?.nombre || "";

  return (
    <Overlay onClick={handleCerrarConConfirmacion}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {isPending ? (
          <LoadingState>
            <Icon icon="lucide:loader-2" className="spin" />
            <span>Guardando...</span>
          </LoadingState>
        ) : (
          <>
            <ModalHeader>
              <HeaderLeft>
                <IconWrapper>
                  <Icon icon="lucide:monitor" />
                </IconWrapper>
                <HeaderInfo>
                  <ModalTitle>
                    {accion === "Editar" ? "Editar caja" : "Nueva caja"}
                  </ModalTitle>
                  <ModalSubtitle>
                    {accion === "Editar" 
                      ? "Modifica el nombre de la caja"
                      : `Agregar caja a ${nombreSucursal}`}
                  </ModalSubtitle>
                </HeaderInfo>
              </HeaderLeft>
              <CloseButton onClick={handleCerrarConConfirmacion}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              <Form onSubmit={handleSubmit(handlesub)}>
                <FormGroup>
                  <Label htmlFor="descripcion">
                    <Icon icon="lucide:tag" />
                    Nombre de la caja *
                  </Label>
                  <Input
                    id="descripcion"
                    type="text"
                    placeholder="Ej: Caja Principal"
                    defaultValue={accion === "Editar" ? cajaSelectItem?.descripcion : ""}
                    $hasError={errors.descripcion}
                    {...register("descripcion", { required: true })}
                  />
                  {errors.descripcion?.type === "required" && (
                    <ErrorText>Este campo es requerido</ErrorText>
                  )}
                </FormGroup>

                <ButtonGroup>
                  <CancelButton type="button" onClick={handleCerrarConConfirmacion}>
                    Cancelar
                  </CancelButton>
                  <SubmitButton type="submit">
                    <Icon icon="lucide:check" />
                    {accion === "Editar" ? "Guardar cambios" : "Crear caja"}
                  </SubmitButton>
                </ButtonGroup>
              </Form>
            </ModalBody>
          </>
        )}
      </Modal>
    </Overlay>
  );
}
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
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

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: #6b7280;

  .spin {
    font-size: 32px;
    color: #10b981;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-radius: 12px;

  svg {
    font-size: 24px;
    color: #10b981;
  }
`;

const HeaderInfo = styled.div``;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const ModalSubtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 4px 0 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  svg {
    font-size: 20px;
    color: #6b7280;
  }

  &:hover {
    background: #e5e7eb;
    svg { color: #374151; }
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;

  svg {
    font-size: 16px;
    color: #6b7280;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  color: #1f2937;
  background: #f9fafb;
  border: 1px solid ${({ $hasError }) => ($hasError ? '#ef4444' : '#e5e7eb')};
  border-radius: 10px;
  transition: all 0.15s;

  &::placeholder {
    color: #9ca3af;
  }

  &:focus {
    outline: none;
    background: #fff;
    border-color: ${({ $hasError }) => ($hasError ? '#ef4444' : '#10b981')};
    box-shadow: 0 0 0 3px ${({ $hasError }) => ($hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)')};
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #e5e7eb;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: #10b981;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: #059669;
  }
`;
