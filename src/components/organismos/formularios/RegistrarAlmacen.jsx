import styled from "styled-components";
import { Icon } from "@iconify/react";
import {
  ConvertirCapitalize,
  useAlmacenesStore,
} from "../../../index";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Swal from "sweetalert2";

export function RegistrarAlmacen() {
  const queryClient = useQueryClient();
  const {
    accion,
    almacenSelectItem,
    setStateAlmacen,
    insertarAlmacen,
    editarAlmacen,
  } = useAlmacenesStore();
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
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Seguir editando',
        reverseButtons: true,
      });
      if (result.isConfirmed) {
        setStateAlmacen(false);
      }
    } else {
      setStateAlmacen(false);
    }
  };

  const insertar = async (data) => {
    if (accion === "Editar") {
      const p = {
        id: almacenSelectItem?.id,
        nombre: ConvertirCapitalize(data.nombre),
      };
      await editarAlmacen(p);
    } else {
      const p = {
        id_sucursal: almacenSelectItem?.id,
        nombre: ConvertirCapitalize(data.nombre),
      };
      await insertarAlmacen(p);
    }
  };

  const { isPending, mutate: doInsertar } = useMutation({
    mutationKey: ["insertar almacen"],
    mutationFn: insertar,
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Almacén guardado correctamente");
      queryClient.invalidateQueries(["mostrar almacenes X empresa"]);
      setStateAlmacen(false);
    },
  });

  const handlesub = (data) => {
    doInsertar(data);
  };

  // Nombre de sucursal para contexto
  const nombreSucursal = accion === "Editar" ? "" : almacenSelectItem?.nombre || "";

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
                  <Icon icon="lucide:warehouse" />
                </IconWrapper>
                <HeaderInfo>
                  <ModalTitle>
                    {accion === "Editar" ? "Editar almacén" : "Nuevo almacén"}
                  </ModalTitle>
                  <ModalSubtitle>
                    {accion === "Editar" 
                      ? "Modifica el nombre del almacén"
                      : `Agregar almacén a ${nombreSucursal}`}
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
                  <Label htmlFor="nombre">
                    <Icon icon="lucide:tag" />
                    Nombre del almacén *
                  </Label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Ej: Almacén Principal"
                    defaultValue={accion === "Editar" ? almacenSelectItem?.nombre : ""}
                    $hasError={errors.nombre}
                    {...register("nombre", { required: true })}
                  />
                  {errors.nombre?.type === "required" && (
                    <ErrorText>Este campo es requerido</ErrorText>
                  )}
                </FormGroup>

                <ButtonGroup>
                  <CancelButton type="button" onClick={handleCerrarConConfirmacion}>
                    Cancelar
                  </CancelButton>
                  <SubmitButton type="submit">
                    <Icon icon="lucide:check" />
                    {accion === "Editar" ? "Guardar cambios" : "Crear almacén"}
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
    color: #f59e0b;
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
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;

  svg {
    font-size: 24px;
    color: #f59e0b;
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
    border-color: ${({ $hasError }) => ($hasError ? '#ef4444' : '#f59e0b')};
    box-shadow: 0 0 0 3px ${({ $hasError }) => ($hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)')};
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
  background: #f59e0b;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: #d97706;
  }
`;
