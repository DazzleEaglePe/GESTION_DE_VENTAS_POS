import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { Icon } from "@iconify/react";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";
import { useMetodosPagoStore } from "../store/MetodosPagoStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { Spinner1 } from "../components/moleculas/Spinner1";
import { ConvertirCapitalize } from "../index";

export function MetodosPago() {
  const queryClient = useQueryClient();
  const { mostrarMetodosPago, insertarMetodosPago, editarMetodosPago, eliminarMetodosPago, dataMetodosPago } = useMetodosPagoStore();
  const { dataempresa } = useEmpresaStore();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [accion, setAccion] = useState("Nuevo");
  const [itemSelect, setItemSelect] = useState(null);

  const { isLoading, error } = useQuery({
    queryKey: ["mostrar metodos pago", dataempresa?.id],
    queryFn: () => mostrarMetodosPago({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa?.id,
    refetchOnWindowFocus: false,
  });

  const handleNuevo = () => {
    setAccion("Nuevo");
    setItemSelect(null);
    setModalOpen(true);
  };

  const handleEditar = (item) => {
    if (item.delete_update === false) {
      toast.error("Este método es del sistema y no se puede modificar");
      return;
    }
    setAccion("Editar");
    setItemSelect(item);
    setModalOpen(true);
  };

  const handleEliminar = async (item) => {
    if (item.delete_update === false) {
      toast.error("Este método es del sistema y no se puede eliminar");
      return;
    }

    const result = await Swal.fire({
      title: "¿Eliminar método de pago?",
      html: `<p style="color: #6b7280;">Se eliminará <strong style="color: #111827;">${item.nombre}</strong></p>`,
      icon: "warning",
      iconColor: "#111827",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: 'swal2-popup-neutral',
        title: 'swal2-title-neutral',
        confirmButton: 'swal2-confirm-danger-neutral',
        cancelButton: 'swal2-cancel-neutral',
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      await eliminarMetodosPago({ id: item.id });
      queryClient.invalidateQueries(["mostrar metodos pago"]);
      toast.success("Método de pago eliminado");
    }
  };

  if (isLoading) return <Spinner1 />;
  
  if (error) {
    return (
      <Container>
        <EmptyState>
          <Icon icon="lucide:alert-circle" />
          <h3>Error al cargar</h3>
          <p>{error.message}</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Toaster position="top-center" richColors />

      {/* Modal */}
      {modalOpen && (
        <ModalMetodoPago
          accion={accion}
          item={itemSelect}
          onClose={() => setModalOpen(false)}
          insertarMetodosPago={insertarMetodosPago}
          editarMetodosPago={editarMetodosPago}
          dataempresa={dataempresa}
          queryClient={queryClient}
        />
      )}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:credit-card" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Métodos de Pago</Title>
            <Subtitle>{dataMetodosPago?.length || 0} métodos configurados</Subtitle>
          </HeaderInfo>
        </HeaderLeft>
        <HeaderRight>
          <BtnPrimary onClick={handleNuevo}>
            <Icon icon="lucide:plus" />
            Nuevo Método
          </BtnPrimary>
        </HeaderRight>
      </Header>

      {/* Content */}
      <ContentCard>
        {dataMetodosPago && dataMetodosPago.length > 0 ? (
          <MetodosList>
            {dataMetodosPago.map((item) => (
              <MetodoCard key={item.id} $isSystem={!item.delete_update}>
                <MetodoIcono>
                  {item.icono && item.icono !== "-" ? (
                    <img src={item.icono} alt={item.nombre} />
                  ) : (
                    <Icon icon="lucide:wallet" />
                  )}
                </MetodoIcono>
                <MetodoInfo>
                  <MetodoNombre>{item.nombre}</MetodoNombre>
                  {!item.delete_update && (
                    <SystemBadge>
                      <Icon icon="lucide:lock" />
                      Sistema
                    </SystemBadge>
                  )}
                </MetodoInfo>
                <MetodoActions>
                  <BtnIcon 
                    onClick={() => handleEditar(item)}
                    $disabled={!item.delete_update}
                    title={!item.delete_update ? "No editable" : "Editar"}
                  >
                    <Icon icon="lucide:pencil" />
                  </BtnIcon>
                  <BtnIcon 
                    onClick={() => handleEliminar(item)}
                    $disabled={!item.delete_update}
                    $danger
                    title={!item.delete_update ? "No eliminable" : "Eliminar"}
                  >
                    <Icon icon="lucide:trash-2" />
                  </BtnIcon>
                </MetodoActions>
              </MetodoCard>
            ))}
          </MetodosList>
        ) : (
          <EmptyState>
            <Icon icon="lucide:credit-card" />
            <h3>No hay métodos de pago</h3>
            <p>Agrega métodos de pago para tus ventas.</p>
            <BtnPrimary onClick={handleNuevo} style={{ marginTop: 16 }}>
              <Icon icon="lucide:plus" />
              Agregar Método
            </BtnPrimary>
          </EmptyState>
        )}
      </ContentCard>
    </Container>
  );
}

// Modal para crear/editar método de pago
function ModalMetodoPago({ accion, item, onClose, insertarMetodosPago, editarMetodosPago, dataempresa, queryClient }) {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(item?.icono || null);
  const [guardando, setGuardando] = useState(false);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      nombre: item?.nombre || "",
    },
  });

  const handleCerrar = async () => {
    if (isDirty || file) {
      const result = await Swal.fire({
        title: "¿Salir sin guardar?",
        text: "Perderás los cambios realizados",
        icon: "warning",
        iconColor: "#111827",
        showCancelButton: true,
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Seguir editando",
        customClass: {
          popup: 'swal2-popup-neutral',
          title: 'swal2-title-neutral',
          confirmButton: 'swal2-confirm-danger-neutral',
          cancelButton: 'swal2-cancel-neutral',
        },
        buttonsStyling: false,
      });
      if (result.isConfirmed) onClose();
    } else {
      onClose();
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setFileUrl(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const onSubmit = async (data) => {
    setGuardando(true);
    try {
      if (accion === "Editar") {
        await editarMetodosPago(
          { nombre: ConvertirCapitalize(data.nombre), id: item.id },
          item.icono,
          file
        );
      } else {
        await insertarMetodosPago(
          { nombre: ConvertirCapitalize(data.nombre), id_empresa: dataempresa?.id, delete_update: true },
          file
        );
      }
      queryClient.invalidateQueries(["mostrar metodos pago"]);
      toast.success(accion === "Editar" ? "Método actualizado" : "Método creado");
      onClose();
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalOverlay onClick={handleCerrar}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <div>
            <ModalTitle>{accion === "Editar" ? "Editar Método" : "Nuevo Método"}</ModalTitle>
            <ModalSubtitle>Configura el método de pago</ModalSubtitle>
          </div>
          <CloseButton onClick={handleCerrar}>
            <Icon icon="lucide:x" />
          </CloseButton>
        </ModalHeader>

        {guardando && <ProgressBar />}

        <ModalBody>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Imagen/Icono */}
            <ImageUploadArea onClick={() => fileInputRef.current?.click()}>
              {fileUrl && fileUrl !== "-" ? (
                <img src={fileUrl} alt="Preview" />
              ) : (
                <>
                  <Icon icon="lucide:image-plus" />
                  <span>Agregar icono</span>
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                hidden
              />
            </ImageUploadArea>

            <FormGroup>
              <Label>Nombre del método</Label>
              <Input
                type="text"
                placeholder="Ej: Tarjeta de crédito"
                {...register("nombre", { required: "Campo requerido" })}
              />
              {errors.nombre && <ErrorText>{errors.nombre.message}</ErrorText>}
            </FormGroup>

            <ModalFooter>
              <BtnSecondary type="button" onClick={handleCerrar} disabled={guardando}>
                Cancelar
              </BtnSecondary>
              <BtnPrimary type="submit" disabled={guardando}>
                {guardando ? (
                  <>
                    <Icon icon="lucide:loader-2" className="spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:save" />
                    Guardar
                  </>
                )}
              </BtnPrimary>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
}

// Animations
const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
`;

// Styled Components
const Container = styled.div`
  min-height: calc(100vh - 50px);
  margin-top: 50px;
  padding: 30px;
  background: #f5f5f5;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #7c3aed;
  }
`;

const HeaderInfo = styled.div``;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 4px 0 0 0;
`;

const ContentCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 24px;
`;

const MetodosList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
`;

const MetodoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid ${props => props.$isSystem ? '#e5e7eb' : '#e5e7eb'};
  border-radius: 10px;
  background: ${props => props.$isSystem ? '#f9fafb' : '#fff'};
  transition: all 0.15s;

  &:hover {
    border-color: #d1d5db;
  }
`;

const MetodoIcono = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #f3f4f6;
  border-radius: 10px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    font-size: 20px;
    color: #6b7280;
  }
`;

const MetodoInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MetodoNombre = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
`;

const SystemBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 2px 8px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;

  svg { font-size: 10px; }
`;

const MetodoActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BtnIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  color: ${props => props.$disabled ? '#cbd5e1' : '#64748b'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.15s;

  svg { font-size: 14px; }

  &:hover {
    ${props => !props.$disabled && `
      background: ${props.$danger ? '#fef2f2' : '#f8fafc'};
      border-color: ${props.$danger ? '#fecaca' : '#cbd5e1'};
      color: ${props.$danger ? '#ef4444' : '#1a1a2e'};
    `}
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;

  svg {
    font-size: 48px;
    color: #d1d5db;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 500;
    color: #374151;
  }

  p {
    margin: 0 auto;
    max-width: 360px;
    font-size: 13px;
  }
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
`;

const ModalSubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s;

  &:hover {
    background: #f1f5f9;
    color: #1a1a2e;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 3px;
  background: #e5e7eb;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 25%;
    height: 100%;
    background: #7c3aed;
    animation: ${progressAnimation} 1s ease-in-out infinite;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const ImageUploadArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  background: #f9fafb;
  border: 2px dashed #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
  }

  svg {
    font-size: 24px;
    color: #9ca3af;
    margin-bottom: 4px;
  }

  span {
    font-size: 11px;
    color: #9ca3af;
  }

  &:hover {
    border-color: #7c3aed;
    background: #faf5ff;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: #f8fafc;
  color: #1a1a2e;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
    border-color: #7c3aed;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
`;

const ErrorText = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid #e5e7eb;
`;

const BtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  background: #7c3aed;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg { font-size: 18px; }

  .spin {
    animation: ${spinAnimation} 1s linear infinite;
  }

  &:hover:not(:disabled) {
    background: #6d28d9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const BtnSecondary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg { font-size: 16px; }

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
