import React from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { Icon } from "@iconify/react";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useEditarPerfilMutation } from "../tanstack/UsuariosStack";

export const MiPerfil = () => {
  const { datausuarios } = useUsuariosStore();
  const { mutate, isPending } = useEditarPerfilMutation();
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    defaultValues: {
      nombres: datausuarios?.nombres || "",
      nro_doc: datausuarios?.nro_doc || "",
      telefono: datausuarios?.telefono || "",
    },
  });

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      <PageHeader>
        <PageTitle>Mi Perfil</PageTitle>
        <PageSubtitle>Gestiona tu información personal</PageSubtitle>
      </PageHeader>

      <ContentGrid>
        {/* Módulo 1: Perfil/Avatar */}
        <ProfileCard>
          <AvatarSection>
            <AvatarCircle>
              <span>{datausuarios?.nombres?.charAt(0)?.toUpperCase() || "U"}</span>
            </AvatarCircle>
            <ProfileName>{datausuarios?.nombres}</ProfileName>
            <ProfileEmail>{datausuarios?.correo}</ProfileEmail>
          </AvatarSection>

          <Divider />

          <InfoList>
            <InfoItem>
              <InfoIcon $color="#16a34a">
                <Icon icon="lucide:shield-check" />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Rol</InfoLabel>
                <InfoValue>{datausuarios?.roles?.nombre}</InfoValue>
              </InfoContent>
            </InfoItem>

            <InfoItem>
              <InfoIcon $color="#2563eb">
                <Icon icon="lucide:building-2" />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Estado</InfoLabel>
                <StatusBadge>Activo</StatusBadge>
              </InfoContent>
            </InfoItem>

            <InfoItem>
              <InfoIcon $color="#8b5cf6">
                <Icon icon="lucide:calendar" />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Miembro desde</InfoLabel>
                <InfoValue>2024</InfoValue>
              </InfoContent>
            </InfoItem>
          </InfoList>
        </ProfileCard>

        {/* Módulo 2: Formulario de Edición */}
        <FormCard>
          <FormHeader>
            <FormTitle>
              <Icon icon="lucide:edit-3" />
              Editar Información
            </FormTitle>
            <FormSubtitle>Actualiza tus datos personales</FormSubtitle>
          </FormHeader>

          <Form onSubmit={handleSubmit(mutate)}>
            <InputGroup>
              <Label>Nombre completo</Label>
              <InputWrapper>
                <InputIcon>
                  <Icon icon="lucide:user" />
                </InputIcon>
                <Input
                  placeholder="Ingresa tu nombre"
                  type="text"
                  {...register("nombres", { required: true })}
                />
              </InputWrapper>
              {errors.nombres && <ErrorText>Este campo es requerido</ErrorText>}
            </InputGroup>

            <InputRow>
              <InputGroup>
                <Label>Documento de identidad</Label>
                <InputWrapper>
                  <InputIcon>
                    <Icon icon="lucide:id-card" />
                  </InputIcon>
                  <Input
                    placeholder="DNI / RUC"
                    type="text"
                    {...register("nro_doc", { required: true })}
                  />
                </InputWrapper>
                {errors.nro_doc && <ErrorText>Campo requerido</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Teléfono</Label>
                <InputWrapper>
                  <InputIcon>
                    <Icon icon="lucide:phone" />
                  </InputIcon>
                  <Input
                    placeholder="987 654 321"
                    type="text"
                    {...register("telefono", { required: true })}
                  />
                </InputWrapper>
                {errors.telefono && <ErrorText>Campo requerido</ErrorText>}
              </InputGroup>
            </InputRow>

            <InputGroup>
              <Label>Correo electrónico</Label>
              <InputWrapper $disabled>
                <InputIcon>
                  <Icon icon="lucide:mail" />
                </InputIcon>
                <Input
                  disabled
                  defaultValue={datausuarios?.correo}
                  type="text"
                />
                <LockIcon>
                  <Icon icon="lucide:lock" />
                </LockIcon>
              </InputWrapper>
              <HintText>El correo electrónico no puede ser modificado</HintText>
            </InputGroup>

            <ButtonGroup>
              <SubmitButton type="submit" disabled={isPending}>
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
              </SubmitButton>
            </ButtonGroup>
          </Form>
        </FormCard>
      </ContentGrid>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  padding: 32px 24px;
  background: #f5f5f5;
`;

const PageHeader = styled.div`
  max-width: 900px;
  margin: 0 auto 24px;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #111;
  margin: 0 0 4px;
`;

const PageSubtitle = styled.p`
  font-size: 15px;
  color: #666;
  margin: 0;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

/* Módulo 1: Perfil */
const ProfileCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: fit-content;
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const AvatarCircle = styled.div`
  width: 88px;
  height: 88px;
  background: linear-gradient(135deg, #111 0%, #333 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;

  span {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
  }
`;

const ProfileName = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 4px;
`;

const ProfileEmail = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0;
`;

const Divider = styled.div`
  height: 1px;
  background: #eee;
  margin: 24px 0;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const InfoIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${({ $color }) => `${$color}15`};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 20px;
    color: ${({ $color }) => $color};
  }
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.span`
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
`;

const InfoValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  padding: 4px 10px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
`;

/* Módulo 2: Formulario */
const FormCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const FormHeader = styled.div`
  margin-bottom: 28px;
`;

const FormTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 6px;

  svg {
    font-size: 20px;
    color: #666;
  }
`;

const FormSubtitle = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #333;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: ${({ $disabled }) => ($disabled ? "#f5f5f5" : "#fafafa")};
  border: 2px solid #e5e5e5;
  border-radius: 10px;
  transition: all 0.15s;

  &:focus-within {
    border-color: #111;
    background: #fff;
  }
`;

const InputIcon = styled.div`
  padding-left: 14px;
  color: #999;

  svg {
    font-size: 18px;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 14px 14px;
  font-size: 14px;
  border: none;
  background: transparent;
  outline: none;

  &:disabled {
    color: #999;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #bbb;
  }
`;

const LockIcon = styled.div`
  padding-right: 14px;
  color: #ccc;

  svg {
    font-size: 16px;
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #dc2626;
`;

const HintText = styled.span`
  font-size: 12px;
  color: #999;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  font-size: 14px;
  font-weight: 600;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #222;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    font-size: 18px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
