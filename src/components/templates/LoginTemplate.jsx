import styled from "styled-components";
import { useAuthStore, Generarcodigo } from "../../index";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { NavLink } from "react-router-dom";

export function LoginTemplate() {
  const [mode, setMode] = useState(null); // null, 'admin', 'employee'
  const [isLoading, setIsLoading] = useState(false);
  const { loginGoogle, loginEmail, crearUserYLogin } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const { mutate: loginMutate, isPending: isLoginPending } = useMutation({
    mutationKey: ["login-email"],
    mutationFn: loginEmail,
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: guestMutate, isPending: isGuestPending } = useMutation({
    mutationKey: ["guest-login"],
    mutationFn: crearUserYLogin,
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEmailLogin = (data) => {
    loginMutate({ email: data.email, password: data.password });
  };

  const handleGuestLogin = () => {
    const code = Generarcodigo({ id: 2 });
    const email = `${code.toLowerCase()}@gmail.com`;
    guestMutate({ email, password: "123456" });
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginGoogle();
    } catch (error) {
      toast.error("Error al iniciar con Google");
    }
    setIsLoading(false);
  };

  return (
    <Container>
      <Toaster position="top-center" richColors />
      
      {/* Navbar simple */}
      <Navbar>
        <NavLink to="/" style={{ textDecoration: 'none' }}>
          <LogoContainer>
            <Logo>M&L</Logo>
            <LogoText>Mathias y Luciana</LogoText>
          </LogoContainer>
        </NavLink>
      </Navbar>

      <Content>
        <Card>
          {/* Header del card */}
          <CardHeader>
            <Title>Bienvenido</Title>
            <Subtitle>Inicia sesión para continuar</Subtitle>
          </CardHeader>

          {/* Selector de modo */}
          {mode === null && (
            <ModeSelector>
              <ModeCard onClick={() => setMode('admin')}>
                <ModeIcon>
                  <Icon icon="lucide:crown" />
                </ModeIcon>
                <ModeInfo>
                  <ModeTitle>Administrador</ModeTitle>
                  <ModeDesc>Gestiona tu empresa</ModeDesc>
                </ModeInfo>
                <ModeArrow>
                  <Icon icon="lucide:chevron-right" />
                </ModeArrow>
              </ModeCard>

              <ModeCard onClick={() => setMode('employee')}>
                <ModeIcon>
                  <Icon icon="lucide:user" />
                </ModeIcon>
                <ModeInfo>
                  <ModeTitle>Empleado</ModeTitle>
                  <ModeDesc>Accede a tu cuenta</ModeDesc>
                </ModeInfo>
                <ModeArrow>
                  <Icon icon="lucide:chevron-right" />
                </ModeArrow>
              </ModeCard>
            </ModeSelector>
          )}

          {/* Panel Empleado */}
          {mode === 'employee' && (
            <FormPanel>
              <BackButton onClick={() => setMode(null)}>
                <Icon icon="lucide:arrow-left" />
                <span>Volver</span>
              </BackButton>
              
              <ModeBadge>
                <Icon icon="lucide:user" />
                Modo Empleado
              </ModeBadge>

              <Form onSubmit={handleSubmit(handleEmailLogin)}>
                <InputGroup>
                  <InputLabel>Correo electrónico</InputLabel>
                  <InputWrapper>
                    <InputIcon>
                      <Icon icon="lucide:mail" />
                    </InputIcon>
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      {...register("email", { required: "El correo es requerido" })}
                    />
                  </InputWrapper>
                  {errors.email && <InputError>{errors.email.message}</InputError>}
                </InputGroup>

                <InputGroup>
                  <InputLabel>Contraseña</InputLabel>
                  <InputWrapper>
                    <InputIcon>
                      <Icon icon="lucide:lock" />
                    </InputIcon>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...register("password", { required: "La contraseña es requerida" })}
                    />
                  </InputWrapper>
                  {errors.password && <InputError>{errors.password.message}</InputError>}
                </InputGroup>

                <PrimaryButton type="submit" disabled={isLoginPending}>
                  {isLoginPending ? (
                    <Icon icon="lucide:loader-2" className="spin" />
                  ) : (
                    <>
                      Iniciar Sesión
                      <Icon icon="lucide:arrow-right" />
                    </>
                  )}
                </PrimaryButton>
              </Form>
            </FormPanel>
          )}

          {/* Panel Admin */}
          {mode === 'admin' && (
            <FormPanel>
              <BackButton onClick={() => setMode(null)}>
                <Icon icon="lucide:arrow-left" />
                <span>Volver</span>
              </BackButton>
              
              <ModeBadge $variant="admin">
                <Icon icon="lucide:crown" />
                Modo Administrador
              </ModeBadge>

              <ButtonsContainer>
                <GuestButton 
                  onClick={handleGuestLogin} 
                  disabled={isGuestPending}
                >
                  {isGuestPending ? (
                    <Icon icon="lucide:loader-2" className="spin" />
                  ) : (
                    <>
                      <Icon icon="lucide:user-plus" />
                      Acceso de Prueba
                    </>
                  )}
                </GuestButton>

                <Divider>
                  <DividerLine />
                  <DividerText>o continúa con</DividerText>
                  <DividerLine />
                </Divider>

                <GoogleButton onClick={handleGoogleLogin} disabled={isLoading}>
                  {isLoading ? (
                    <Icon icon="lucide:loader-2" className="spin" />
                  ) : (
                    <>
                      <Icon icon="flat-color-icons:google" />
                      Google
                    </>
                  )}
                </GoogleButton>
              </ButtonsContainer>
            </FormPanel>
          )}
        </Card>

        {/* Footer info */}
        <FooterInfo>
          <span>Minimarket "Mathias y Luciana"</span>
          <span>Ica, Perú — 2025</span>
        </FooterInfo>
      </Content>
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: #111;
  display: flex;
  flex-direction: column;
`;

const Navbar = styled.nav`
  padding: 20px 40px;
  display: flex;
  align-items: center;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Logo = styled.div`
  width: 40px;
  height: 40px;
  background: #fff;
  color: #111;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoText = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #fff;

  @media (max-width: 480px) {
    display: none;
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);

  @media (max-width: 480px) {
    padding: 28px;
    border-radius: 16px;
  }
`;

const CardHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #111;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #666;
  margin: 0;
`;

const ModeSelector = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModeCard = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: #111;
    background: #fff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
`;

const ModeIcon = styled.div`
  width: 52px;
  height: 52px;
  background: #111;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
`;

const ModeInfo = styled.div`
  flex: 1;
`;

const ModeTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin-bottom: 2px;
`;

const ModeDesc = styled.div`
  font-size: 13px;
  color: #888;
`;

const ModeArrow = styled.div`
  font-size: 20px;
  color: #ccc;
`;

const FormPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;

  &:hover {
    color: #111;
  }
`;

const ModeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #111;
  color: #fff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  align-self: flex-start;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InputLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #111;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  font-size: 18px;
  color: #666;
  display: flex;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 14px 14px 44px;
  font-size: 15px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  background: #fafafa;
  color: #111;
  transition: all 0.15s;
  outline: none;

  &::placeholder {
    color: #aaa;
  }

  &:focus {
    border-color: #111;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.05);
  }
`;

const InputError = styled.span`
  font-size: 12px;
  color: #ef4444;
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  background: #111;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;

  &:hover:not(:disabled) {
    background: #000;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const GuestButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  background: #111;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #000;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: #e5e5e5;
`;

const DividerText = styled.span`
  font-size: 13px;
  color: #999;
`;

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  background: #fff;
  color: #111;
  font-size: 15px;
  font-weight: 500;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #fafafa;
    border-color: #111;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    font-size: 20px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }
`;

const FooterInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 32px;
  font-size: 13px;
  color: rgba(255,255,255,0.5);
`;
