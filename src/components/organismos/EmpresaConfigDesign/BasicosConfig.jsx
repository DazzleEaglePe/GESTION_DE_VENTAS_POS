import { Icon } from "@iconify/react/dist/iconify.js";
import React from "react";
import styled, { keyframes } from "styled-components";
import { useForm, useWatch } from "react-hook-form";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useUpdateEmpresaMutation } from "../../../tanstack/EmpresaStack";
import { ImageSelector } from "../../../hooks/useImageSelector";
import { useGlobalStore } from "../../../store/GlobalStore";
import { Toaster, toast } from "sonner";

export const BasicosConfig = () => {
  const { fileUrl } = useGlobalStore();
  const { dataempresa } = useEmpresaStore();

  const {
    register,
    formState: { errors },
    handleSubmit,
    control,
  } = useForm({
    defaultValues: {
      nombre: dataempresa?.nombre || "",
      direccion: dataempresa?.direccion_fiscal || "",
      impuesto: dataempresa?.impuesto || "",
      valor_impuesto: dataempresa?.valor_impuesto || 0
    }
  });

  // Watch form values for live preview
  const watchedValues = useWatch({ control });

  const { mutate, isPending } = useUpdateEmpresaMutation();

  const onSubmit = (data) => {
    mutate(data, {
      onSuccess: () => toast.success("Empresa actualizada correctamente"),
      onError: (err) => toast.error("Error: " + err.message),
    });
  };

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:building" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Configuración Básica</Title>
            <Subtitle>Información general de tu empresa</Subtitle>
          </HeaderInfo>
        </HeaderLeft>
      </Header>

      {/* Main Layout - 2 columns */}
      <MainLayout>
        {/* Left: Form Section */}
        <FormSection>
          <ContentCard>
            {isPending && <ProgressBar />}
            
            <FormContainer onSubmit={handleSubmit(onSubmit)}>
              {/* Logo Section */}
              <LogoSection>
                <SectionTitle>
                  <Icon icon="lucide:image" />
                  Logo de la empresa
                </SectionTitle>
                <LogoUploadWrapper>
                  <LogoUploadArea>
                    <ImageSelector fileUrl={fileUrl || dataempresa?.logo} />
                  </LogoUploadArea>
                  <LogoInfo>
                    <LogoHint>
                      <Icon icon="lucide:upload" />
                      Haz clic para subir un logo
                    </LogoHint>
                    <LogoFormats>Formatos: PNG, JPG, WEBP</LogoFormats>
                  </LogoInfo>
                </LogoUploadWrapper>
              </LogoSection>

              <Divider />

              {/* Company Info */}
              <FieldsSection>
                <SectionTitle>
                  <Icon icon="lucide:building-2" />
                  Información de la empresa
                </SectionTitle>
                
                <FormGroup>
                  <Label>Nombre de la empresa</Label>
                  <Input
                    type="text"
                    placeholder="Nombre de tu empresa"
                    {...register("nombre", { required: "Campo requerido" })}
                  />
                  {errors.nombre && <ErrorText>{errors.nombre.message}</ErrorText>}
                </FormGroup>

                <FormGroup>
                  <Label>Dirección fiscal</Label>
                  <Input
                    type="text"
                    placeholder="Dirección de la empresa"
                    {...register("direccion", { required: "Campo requerido" })}
                  />
                  {errors.direccion && <ErrorText>{errors.direccion.message}</ErrorText>}
                </FormGroup>
              </FieldsSection>

              <Divider />

              {/* Tax Config */}
              <FieldsSection>
                <SectionTitle>
                  <Icon icon="lucide:percent" />
                  Configuración fiscal
                </SectionTitle>
                
                <TaxFormGrid>
                  <TaxFormGroup>
                    <TaxLabel>Nombre del impuesto</TaxLabel>
                    <TaxInput
                      type="text"
                      placeholder="Ej: IGV, IVA"
                      {...register("impuesto", { required: "Campo requerido" })}
                    />
                    {errors.impuesto && <ErrorText>{errors.impuesto.message}</ErrorText>}
                  </TaxFormGroup>

                  <TaxFormGroup>
                    <TaxLabel>Valor (%)</TaxLabel>
                    <TaxInputWrapper>
                      <TaxInput
                        type="number"
                        step="0.01"
                        placeholder="18"
                        {...register("valor_impuesto", { required: "Campo requerido" })}
                      />
                      <TaxInputSuffix>%</TaxInputSuffix>
                    </TaxInputWrapper>
                    {errors.valor_impuesto && <ErrorText>{errors.valor_impuesto.message}</ErrorText>}
                  </TaxFormGroup>
                </TaxFormGrid>
              </FieldsSection>

              <FormFooter>
                <InfoBadge>
                  <Icon icon="lucide:info" />
                  Los cambios de logo tardan ~10 segundos en reflejarse
                </InfoBadge>
                <BtnPrimary type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Icon icon="lucide:loader-2" className="spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:save" />
                      Guardar Cambios
                    </>
                  )}
                </BtnPrimary>
              </FormFooter>
            </FormContainer>
          </ContentCard>
        </FormSection>

        {/* Right: Preview Section */}
        <PreviewSection>
          <PreviewCard>
            <PreviewHeader>
              <Icon icon="lucide:eye" />
              Vista previa
            </PreviewHeader>

            {/* Business Card Preview */}
            <BusinessCardPreview>
              <CardGradient>
                <CardPattern />
              </CardGradient>
              <CardContent>
                <CardLogo $hasImage={!!(fileUrl || dataempresa?.logo)}>
                  {(fileUrl || dataempresa?.logo) ? (
                    <img src={fileUrl || dataempresa?.logo} alt="Logo" onError={(e) => e.target.style.display='none'} />
                  ) : null}
                  <CardLogoPlaceholder $hidden={!!(fileUrl || dataempresa?.logo)}>
                    <Icon icon="lucide:building-2" />
                  </CardLogoPlaceholder>
                </CardLogo>
                <CardInfo>
                  <CardName>{watchedValues.nombre || "Nombre de empresa"}</CardName>
                  <CardAddress>
                    <Icon icon="lucide:map-pin" />
                    {watchedValues.direccion || "Dirección fiscal"}
                  </CardAddress>
                </CardInfo>
              </CardContent>
            </BusinessCardPreview>

            {/* Tax Preview */}
            <TaxPreview>
              <TaxLabel>Configuración de impuesto</TaxLabel>
              <TaxInfo>
                <TaxName>{watchedValues.impuesto || "IGV"}</TaxName>
                <TaxValue>{watchedValues.valor_impuesto || 0}%</TaxValue>
              </TaxInfo>
              <TaxExample>
                <span>Ejemplo: Si un producto cuesta S/. 100.00</span>
                <TaxCalc>
                  <span>Subtotal:</span>
                  <span>S/. {(100 / (1 + (watchedValues.valor_impuesto || 0) / 100)).toFixed(2)}</span>
                </TaxCalc>
                <TaxCalc>
                  <span>{watchedValues.impuesto || "IGV"} ({watchedValues.valor_impuesto || 0}%):</span>
                  <span>S/. {(100 - 100 / (1 + (watchedValues.valor_impuesto || 0) / 100)).toFixed(2)}</span>
                </TaxCalc>
                <TaxCalc $total>
                  <span>Total:</span>
                  <span>S/. 100.00</span>
                </TaxCalc>
              </TaxExample>
            </TaxPreview>
          </PreviewCard>
        </PreviewSection>
      </MainLayout>
    </Container>
  );
};

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
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #f59e0b;
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

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 900px) {
    grid-template-columns: 1fr 380px;
  }
`;

const FormSection = styled.div``;

const ContentCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
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
    background: #f59e0b;
    animation: ${progressAnimation} 1s ease-in-out infinite;
  }
`;

const FormContainer = styled.form`
  padding: 24px;
`;

const LogoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LogoUploadWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
`;

const LogoUploadArea = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  border: 2px dashed #d1d5db;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    border-color: #f59e0b;
    background: #fffbeb;
  }
`;

const LogoInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LogoHint = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  
  svg {
    font-size: 16px;
    color: #f59e0b;
  }
`;

const LogoFormats = styled.span`
  font-size: 12px;
  color: #94a3b8;
`;

const FieldsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;

  svg {
    font-size: 18px;
    color: #f59e0b;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #475569;
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
    border-color: #f59e0b;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #ef4444;
`;

const Divider = styled.div`
  height: 1px;
  background: #e2e8f0;
  margin: 20px 0;
`;

const FormFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  margin-top: 8px;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const InfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;

  svg {
    font-size: 14px;
    color: #f59e0b;
    flex-shrink: 0;
  }
`;

const BtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  background: #f59e0b;
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
    background: #d97706;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Preview Section
const PreviewSection = styled.div`
  @media (max-width: 899px) {
    order: -1;
  }
`;

const PreviewCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  position: sticky;
  top: 20px;
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  font-size: 14px;
  font-weight: 600;
  color: #92400e;

  svg {
    font-size: 18px;
    color: #f59e0b;
  }
`;

const BusinessCardPreview = styled.div`
  margin: 20px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const CardGradient = styled.div`
  height: 60px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  position: relative;
`;

const CardPattern = styled.div`
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 120 120'%3E%3Cpolygon fill='%23000' fill-opacity='0.08' points='120 0 120 60 90 30 60 0 0 0 0 0 60 60 0 120 60 120 90 90 120 60 120 0'/%3E%3C/svg%3E");
  background-size: 30px 30px;
`;

const CardContent = styled.div`
  background: #fff;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
`;

const CardLogo = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  background: ${props => props.$hasImage ? '#fff' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: -40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 3px solid #fff;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: relative;
    z-index: 1;
  }
`;

const CardInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardName = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 6px 0;
  word-break: break-word;
`;

const CardAddress = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;

  svg {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
    color: #94a3b8;
  }
`;

const TaxPreview = styled.div`
  margin: 0 20px 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

const TaxLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 10px;
`;

const TaxInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e2e8f0;
`;

const TaxName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
`;

const TaxValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #f59e0b;
`;

const TaxExample = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  > span:first-child {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 4px;
  }
`;

const TaxCalc = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: ${props => props.$total ? '#1a1a2e' : '#64748b'};
  font-weight: ${props => props.$total ? '600' : '400'};
  ${props => props.$total && `
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    margin-top: 4px;
  `}
`;

// Tax Form Styles
const TaxFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 60px;
  align-items: flex-start;
  max-width: 400px;
`;

const TaxFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TaxInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const TaxInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  padding-right: ${props => props.type === 'number' ? '40px' : '16px'};
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  background: #fff;
  color: #1a1a2e;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }

  &:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const TaxInputSuffix = styled.span`
  position: absolute;
  right: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #f59e0b;
  pointer-events: none;
`;

// Card Logo with Placeholder
const CardLogoPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  display: ${props => props.$hidden ? 'none' : 'flex'};
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  
  svg {
    font-size: 24px;
    color: #f59e0b;
  }
`;
