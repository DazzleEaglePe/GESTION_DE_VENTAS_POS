import { useState } from "react";
import styled, { keyframes } from "styled-components";
import { Icon } from "@iconify/react";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";
import { Spinner1 } from "../components/moleculas/Spinner1";
import { 
  useEditarSerializacionDefaultMutation, 
  useMostrarSerializacionesQuery,
  useEditarSerializacionMutation 
} from "../tanstack/SerializacionStack";

export const SerializacionComprobantes = () => {
  const { data, isLoading, error } = useMostrarSerializacionesQuery();
  const { mutate: mutateDefault, isPending: isPendingDefault } = useEditarSerializacionDefaultMutation();
  const { mutate: mutateEditar, isPending: isPendingEditar } = useEditarSerializacionMutation();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [itemSelect, setItemSelect] = useState(null);

  const handleEditar = (item) => {
    setItemSelect(item);
    setModalOpen(true);
  };

  const handleSetDefault = async (item) => {
    const result = await Swal.fire({
      title: "¿Establecer como predeterminado?",
      html: `<p style="color: #6b7280;">Se usará <strong style="color: #111827;">${item.serie}</strong> como comprobante por defecto para <strong style="color: #111827;">${item.tipo_comprobantes?.nombre}</strong></p>`,
      icon: "question",
      iconColor: "#111827",
      showCancelButton: true,
      confirmButtonText: "Sí, establecer",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: 'swal2-popup-neutral',
        title: 'swal2-title-neutral',
        confirmButton: 'swal2-confirm-neutral',
        cancelButton: 'swal2-cancel-neutral',
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      mutateDefault(item, {
        onSuccess: () => toast.success("Comprobante establecido como predeterminado"),
        onError: (err) => toast.error("Error: " + err.message),
      });
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

      {/* Modal Editar */}
      {modalOpen && itemSelect && (
        <ModalEditar 
          item={itemSelect} 
          onClose={() => setModalOpen(false)}
          onSave={mutateEditar}
          isPending={isPendingEditar}
        />
      )}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:file-text" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Serialización de Comprobantes</Title>
            <Subtitle>{data?.length || 0} series configuradas</Subtitle>
          </HeaderInfo>
        </HeaderLeft>
      </Header>

      {/* Content */}
      <ContentCard>
        {data && data.length > 0 ? (
          <SeriesList>
            {data.map((item) => (
              <SerieCard key={item.id} $isDefault={item.por_default}>
                <SerieIcon $isDefault={item.por_default}>
                  <Icon icon="lucide:hash" />
                </SerieIcon>
                <SerieInfo>
                  <SerieTipo>{item.tipo_comprobantes?.nombre}</SerieTipo>
                  <SerieNumero>
                    <span className="serie">{item.serie}</span>
                    <span className="separador">-</span>
                    <span className="correlativo">
                      {String(item.correlativo).padStart(item.cantidad_numeros || 6, '0')}
                    </span>
                  </SerieNumero>
                  <SerieDetalles>
                    <span>
                      <Icon icon="lucide:hash" />
                      {item.cantidad_numeros} dígitos
                    </span>
                    {item.por_default && (
                      <DefaultBadge>
                        <Icon icon="lucide:check" />
                        Predeterminado
                      </DefaultBadge>
                    )}
                  </SerieDetalles>
                </SerieInfo>
                <SerieActions>
                  {!item.por_default && (
                    <BtnIcon 
                      onClick={() => handleSetDefault(item)}
                      title="Establecer como predeterminado"
                    >
                      <Icon icon="lucide:star" />
                    </BtnIcon>
                  )}
                  <BtnSecondary onClick={() => handleEditar(item)}>
                    <Icon icon="lucide:pencil" />
                    Editar
                  </BtnSecondary>
                </SerieActions>
              </SerieCard>
            ))}
          </SeriesList>
        ) : (
          <EmptyState>
            <Icon icon="lucide:file-x" />
            <h3>No hay series configuradas</h3>
            <p>Configura las series de tus comprobantes desde el módulo de administración.</p>
          </EmptyState>
        )}
      </ContentCard>
    </Container>
  );
};

// Modal de edición
function ModalEditar({ item, onClose, onSave, isPending }) {
  const [cantidadNumeros, setCantidadNumeros] = useState(item?.cantidad_numeros || 6);
  const [correlativo, setCorrelativo] = useState(item?.correlativo || 0);
  const [serie, setSerie] = useState(item?.serie || "");

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      cantidad_numeros: item?.cantidad_numeros,
      correlativo: item?.correlativo,
      serie: item?.serie,
    },
  });

  const handleCerrar = async () => {
    if (isDirty) {
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

  const onSubmit = (data) => {
    onSave({ ...data, id: item.id }, {
      onSuccess: () => {
        toast.success("Serie actualizada correctamente");
        onClose();
      },
      onError: (err) => toast.error("Error: " + err.message),
    });
  };

  return (
    <ModalOverlay onClick={handleCerrar}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <div>
            <ModalTitle>Editar Serie</ModalTitle>
            <ModalSubtitle>{item.tipo_comprobantes?.nombre}</ModalSubtitle>
          </div>
          <CloseButton onClick={handleCerrar}>
            <Icon icon="lucide:x" />
          </CloseButton>
        </ModalHeader>

        {isPending && <ProgressBar />}

        <ModalBody>
          {/* Vista previa del comprobante */}
          <PreviewCard>
            <PreviewLabel>Vista previa</PreviewLabel>
            <PreviewNumero>
              <span className="serie">{serie}</span>
              <span className="separador">-</span>
              <span className="correlativo">
                {String(correlativo).padStart(cantidadNumeros, '0')}
              </span>
            </PreviewNumero>
          </PreviewCard>

          <form onSubmit={handleSubmit(onSubmit)}>
            <FormGroup>
              <Label>Serie</Label>
              <Input
                type="text"
                placeholder="Ej: F001"
                value={serie}
                {...register("serie", { required: "Campo requerido" })}
                onChange={(e) => setSerie(e.target.value.toUpperCase())}
              />
              {errors.serie && <ErrorText>{errors.serie.message}</ErrorText>}
            </FormGroup>

            <FormRow>
              <FormGroup>
                <Label>Correlativo actual</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={correlativo}
                  {...register("correlativo", { required: "Campo requerido" })}
                  onChange={(e) => setCorrelativo(Math.max(0, parseInt(e.target.value) || 0))}
                />
                {errors.correlativo && <ErrorText>{errors.correlativo.message}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>Cantidad de dígitos</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={cantidadNumeros}
                  {...register("cantidad_numeros", { required: "Campo requerido" })}
                  onChange={(e) => setCantidadNumeros(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                />
                {errors.cantidad_numeros && <ErrorText>{errors.cantidad_numeros.message}</ErrorText>}
              </FormGroup>
            </FormRow>

            <ModalFooter>
              <BtnSecondary type="button" onClick={handleCerrar} disabled={isPending}>
                Cancelar
              </BtnSecondary>
              <BtnPrimary type="submit" disabled={isPending}>
                {isPending ? (
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

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #0891b2;
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

const SeriesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SerieCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid ${props => props.$isDefault ? '#0891b2' : '#e2e8f0'};
  border-radius: 12px;
  background: ${props => props.$isDefault ? '#f0fdfa' : '#fff'};
  transition: all 0.15s;

  &:hover {
    border-color: ${props => props.$isDefault ? '#0891b2' : '#cbd5e1'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const SerieIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: ${props => props.$isDefault ? 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)' : '#f1f5f9'};
  border-radius: 10px;

  svg {
    font-size: 20px;
    color: ${props => props.$isDefault ? '#0891b2' : '#64748b'};
  }
`;

const SerieInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SerieTipo = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const SerieNumero = styled.div`
  font-size: 18px;
  font-weight: 600;
  font-family: monospace;
  color: #1a1a2e;

  .serie { color: #0891b2; }
  .separador { color: #94a3b8; margin: 0 2px; }
  .correlativo { color: #475569; }
`;

const SerieDetalles = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  
  span {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #6b7280;
    
    svg { font-size: 12px; }
  }
`;

const DefaultBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #0891b2;
  color: #fff !important;
  border-radius: 12px;
  font-size: 11px !important;
  font-weight: 500;
`;

const SerieActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BtnIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s;

  svg { font-size: 16px; }

  &:hover {
    background: #f0fdfa;
    border-color: #a5f3fc;
    color: #0891b2;
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
  max-width: 440px;
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
    background: #0891b2;
    animation: ${progressAnimation} 1s ease-in-out infinite;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const PreviewCard = styled.div`
  padding: 20px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  text-align: center;
  margin-bottom: 24px;
`;

const PreviewLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const PreviewNumero = styled.div`
  font-size: 24px;
  font-weight: 700;
  font-family: monospace;
  color: #1a1a2e;

  .serie { color: #0891b2; }
  .separador { color: #94a3b8; margin: 0 4px; }
  .correlativo { color: #475569; }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
    border-color: #0891b2;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1);
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
  background: #0891b2;
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
    background: #0e7490;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
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
