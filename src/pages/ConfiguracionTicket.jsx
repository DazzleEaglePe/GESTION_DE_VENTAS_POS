import styled, { keyframes } from "styled-components";
import { ImageSelector } from "../hooks/useImageSelector";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useForm } from "react-hook-form";
import { Icon } from "@iconify/react";
import { Toaster } from "sonner";

import { useGlobalStore } from "../store/GlobalStore";
import { useUpdateEmpresaTicketMutation } from "../tanstack/EmpresaStack";

export const ConfiguracionTicket = () => {
  const { dataempresa } = useEmpresaStore();
  const { fileUrl } = useGlobalStore();
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    defaultValues: {
      nombre: dataempresa?.nombre,
      id_fiscal: dataempresa?.id_fiscal,
      direccion_fiscal: dataempresa?.direccion_fiscal,
      nombre_moneda: dataempresa?.nombre_moneda,
      pie_pagina_ticket: dataempresa?.pie_pagina_ticket,
    },
  });
  const { mutate, isPending } = useUpdateEmpresaTicketMutation();

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:receipt" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Configuración de Ticket</Title>
            <Subtitle>Personaliza el diseño de tus comprobantes</Subtitle>
          </HeaderInfo>
        </HeaderLeft>
        <SaveButton type="button" onClick={handleSubmit(mutate)} disabled={isPending}>
          {isPending ? (
            <>
              <Icon icon="lucide:loader-2" className="spin" />
              Guardando...
            </>
          ) : (
            <>
              <Icon icon="lucide:save" />
              Guardar cambios
            </>
          )}
        </SaveButton>
      </Header>

      {/* Main Layout */}
      <MainLayout>
        {/* Left: Form Fields */}
        <FormSection>
          <SectionTitle>
            <Icon icon="lucide:edit-3" />
            Campos Editables
          </SectionTitle>
          <SectionDescription>
            Modifica los datos que aparecerán en tu ticket
          </SectionDescription>

          <FormGrid>
            <FormField>
              <FieldLabel>
                <Icon icon="lucide:building-2" />
                Nombre de la Empresa
              </FieldLabel>
              <FieldInput
                type="text"
                placeholder="Ej: Mi Negocio S.A.C."
                {...register("nombre", { required: "Campo requerido" })}
              />
              {errors.nombre && <FieldError>{errors.nombre.message}</FieldError>}
            </FormField>

            <FormField>
              <FieldLabel>
                <Icon icon="lucide:file-text" />
                RUC / ID Fiscal
              </FieldLabel>
              <FieldInput
                type="text"
                placeholder="Ej: 20123456789"
                {...register("id_fiscal", { required: "Campo requerido" })}
              />
              {errors.id_fiscal && <FieldError>{errors.id_fiscal.message}</FieldError>}
            </FormField>

            <FormField $full>
              <FieldLabel>
                <Icon icon="lucide:map-pin" />
                Dirección Fiscal
              </FieldLabel>
              <FieldInput
                type="text"
                placeholder="Ej: Av. Principal 123, Lima"
                {...register("direccion_fiscal", { required: "Campo requerido" })}
              />
              {errors.direccion_fiscal && <FieldError>{errors.direccion_fiscal.message}</FieldError>}
            </FormField>

            <FormField>
              <FieldLabel>
                <Icon icon="lucide:coins" />
                Nombre de Moneda
              </FieldLabel>
              <FieldInput
                type="text"
                placeholder="Ej: SOLES"
                {...register("nombre_moneda", { required: "Campo requerido" })}
              />
              {errors.nombre_moneda && <FieldError>{errors.nombre_moneda.message}</FieldError>}
            </FormField>

            <FormField $full>
              <FieldLabel>
                <Icon icon="lucide:message-square" />
                Pie de Página / Agradecimiento
              </FieldLabel>
              <FieldTextarea
                placeholder="Ej: ¡Gracias por su compra!"
                {...register("pie_pagina_ticket", { required: "Campo requerido" })}
              />
              {errors.pie_pagina_ticket && <FieldError>{errors.pie_pagina_ticket.message}</FieldError>}
            </FormField>
          </FormGrid>

          <InfoBadge>
            <Icon icon="lucide:info" />
            Los cambios se reflejarán en todos los tickets que generes
          </InfoBadge>
        </FormSection>

        {/* Right: Ticket Preview */}
        <PreviewSection>
          <SectionTitle>
            <Icon icon="lucide:eye" />
            Vista Previa del Ticket
          </SectionTitle>
          
          <TicketContainer>
            {isPending && <ProgressBar />}
            
            <TicketPaper>
              {/* Logo */}
              <TicketLogo>
                <ImageSelector fileUrl={fileUrl || dataempresa?.logo} />
              </TicketLogo>

              {/* Company Info */}
              <TicketCompanyName>
                {dataempresa?.nombre || "NOMBRE EMPRESA"}
              </TicketCompanyName>
              <TicketText>RUC: {dataempresa?.id_fiscal || "00000000000"}</TicketText>
              <TicketText>{dataempresa?.direccion_fiscal || "Dirección de la empresa"}</TicketText>

              <TicketDivider />

              {/* Ticket Number */}
              <TicketNumber>TICKET - T0001</TicketNumber>

              <TicketDivider />

              {/* Details */}
              <TicketRow>
                <span>Cajero</span>
                <span>:</span>
                <span>Nombre del Cajero</span>
              </TicketRow>
              <TicketRow>
                <span>Fecha</span>
                <span>:</span>
                <span>19/02/2018</span>
              </TicketRow>
              <TicketRow>
                <span>Cliente</span>
                <span>:</span>
                <span>CLIENTE GENERAL</span>
              </TicketRow>

              <TicketDivider />

              {/* Products Table */}
              <TicketTable>
                <thead>
                  <tr>
                    <th>Cant.</th>
                    <th>Descripción</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Gaseosa Coca Cola x 1 Lt</td>
                    <td>{dataempresa?.simbolo_moneda || "S/."} 26.00</td>
                  </tr>
                </tbody>
              </TicketTable>

              {/* Summary */}
              <TicketSummary>
                <TicketSummaryRow>
                  <span>Sub Total:</span>
                  <span>{dataempresa?.simbolo_moneda || "S/."} 26.00</span>
                </TicketSummaryRow>
                <TicketSummaryRow>
                  <span>Descuento:</span>
                  <span>{dataempresa?.simbolo_moneda || "S/."} 0.00</span>
                </TicketSummaryRow>
                <TicketSummaryRow $total>
                  <span>TOTAL:</span>
                  <span>{dataempresa?.simbolo_moneda || "S/."} 26.00</span>
                </TicketSummaryRow>
              </TicketSummary>

              {/* Payment Info */}
              <TicketPayment>
                <div>SON: VEINTISEIS CON 00/100 {dataempresa?.nombre_moneda || "SOLES"}</div>
                <TicketSummaryRow>
                  <span>EFECTIVO:</span>
                  <span>{dataempresa?.simbolo_moneda || "S/."} 50.00</span>
                </TicketSummaryRow>
                <TicketSummaryRow>
                  <span>VUELTO:</span>
                  <span>{dataempresa?.simbolo_moneda || "S/."} 24.00</span>
                </TicketSummaryRow>
              </TicketPayment>

              <TicketDivider />

              {/* Footer */}
              <TicketFooter>
                {dataempresa?.pie_pagina_ticket || "¡Gracias por su compra!"}
              </TicketFooter>

              <TicketStars>********************************</TicketStars>

              {/* QR Code */}
              <TicketQR>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Codigo_QR.svg/500px-Codigo_QR.svg.png"
                  alt="QR Code"
                />
              </TicketQR>
            </TicketPaper>
          </TicketContainer>
        </PreviewSection>
      </MainLayout>
    </Container>
  );
};

// Animations
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
`;

// Main Container
const Container = styled.div`
  min-height: calc(100vh - 50px);
  margin-top: 50px;
  padding: 30px;
  background: #f5f5f5;
  
  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

// Header
const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
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

const SaveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #f59e0b;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #d97706;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spin {
    animation: ${spin} 1s linear infinite;
  }
`;

// Main Layout
const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 380px;
  }
`;

// Form Section
const FormSection = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px;
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 8px 0;

  svg {
    font-size: 20px;
    color: #f59e0b;
  }
`;

const SectionDescription = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  grid-column: ${({ $full }) => ($full ? "1 / -1" : "auto")};
`;

const FieldLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;

  svg {
    font-size: 16px;
    color: #f59e0b;
  }
`;

const FieldInput = styled.input`
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: #f8fafc;
  color: #1a1a2e;
  transition: all 0.2s;

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

const FieldTextarea = styled.textarea`
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: #f8fafc;
  color: #1a1a2e;
  transition: all 0.2s;
  resize: vertical;
  min-height: 80px;

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

const FieldError = styled.span`
  font-size: 12px;
  color: #ef4444;
`;

const InfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #92400e;

  svg {
    font-size: 16px;
    color: #f59e0b;
    flex-shrink: 0;
  }
`;

// Preview Section
const PreviewSection = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px;
`;

const TicketContainer = styled.div`
  margin-top: 16px;
  border-radius: 12px;
  overflow: hidden;
  background: #fafafa;
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

const TicketPaper = styled.div`
  background: #fff;
  padding: 24px 16px;
  text-align: center;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #1a1a2e;
  position: relative;

  &::before,
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 12px;
    background-image: radial-gradient(circle, #fafafa 6px, transparent 6px);
    background-size: 16px 12px;
    background-position: 8px 0;
  }

  &::before { top: 0; }
  &::after { bottom: 0; }
`;

const TicketLogo = styled.div`
  margin-bottom: 12px;
  
  img {
    max-width: 80px;
    max-height: 80px;
    object-fit: contain;
  }
`;

const TicketCompanyName = styled.div`
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
`;

const TicketText = styled.div`
  font-size: 11px;
  color: #4b5563;
  margin-bottom: 2px;
`;

const TicketDivider = styled.div`
  border-top: 1px dashed #d1d5db;
  margin: 12px 0;
`;

const TicketNumber = styled.div`
  font-weight: bold;
  font-size: 13px;
  padding: 8px 0;
`;

const TicketRow = styled.div`
  display: grid;
  grid-template-columns: 60px 15px 1fr;
  text-align: left;
  font-size: 11px;
  padding: 3px 0;

  span:first-child {
    font-weight: 500;
  }
`;

const TicketTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 11px;

  th, td {
    padding: 6px 4px;
    text-align: left;
  }

  th {
    border-bottom: 1px solid #e5e7eb;
    font-weight: 500;
    color: #6b7280;
  }

  td {
    border-bottom: 1px dotted #e5e7eb;
  }

  td:last-child, th:last-child {
    text-align: right;
  }
`;

const TicketSummary = styled.div`
  margin: 12px 0;
`;

const TicketSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 3px 0;
  font-weight: ${({ $total }) => ($total ? "bold" : "normal")};
  font-size: ${({ $total }) => ($total ? "13px" : "11px")};
`;

const TicketPayment = styled.div`
  text-align: left;
  font-size: 11px;
  margin: 12px 0;
  padding: 8px;
  background: #f9fafb;
  border-radius: 6px;
`;

const TicketFooter = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin: 8px 0;
`;

const TicketStars = styled.div`
  color: #f59e0b;
  font-size: 10px;
  letter-spacing: -1px;
`;

const TicketQR = styled.div`
  margin-top: 12px;

  img {
    width: 80px;
    height: 80px;
  }
`;

