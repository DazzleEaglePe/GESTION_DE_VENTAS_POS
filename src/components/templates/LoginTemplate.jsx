import styled from "styled-components";
import { useAuthStore, Generarcodigo } from "../../index";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { NavLink } from "react-router-dom";

// Constantes de seguridad
const MAX_LOGIN_ATTEMPTS = 3;
const INITIAL_LOCKOUT_TIME = 30; // segundos
const LOCKOUT_MULTIPLIER = 2; // duplica el tiempo con cada bloqueo
const STORAGE_KEY = "login_security_state";

// Funciones helper para localStorage
const getStoredSecurityState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      // Verificar si el bloqueo ya expiró
      if (state.lockoutUntil && new Date(state.lockoutUntil) < new Date()) {
        return { attempts: 0, lockoutUntil: null, lockoutCount: state.lockoutCount || 0 };
      }
      return state;
    }
  } catch (e) {
    console.error("Error reading security state:", e);
  }
  return { attempts: 0, lockoutUntil: null, lockoutCount: 0 };
};

const setStoredSecurityState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error saving security state:", e);
  }
};

export function LoginTemplate() {
  const [mode, setMode] = useState(null); // null, 'admin', 'employee'
  const [isLoading, setIsLoading] = useState(false);
  const { loginGoogle, loginEmail, crearUserYLogin } = useAuthStore();

  // Estados de seguridad
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [lockoutCount, setLockoutCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Cargar estado de seguridad al montar
  useEffect(() => {
    const storedState = getStoredSecurityState();
    setLoginAttempts(storedState.attempts || 0);
    setLockoutCount(storedState.lockoutCount || 0);
    
    if (storedState.lockoutUntil) {
      const lockoutDate = new Date(storedState.lockoutUntil);
      if (lockoutDate > new Date()) {
        setIsLocked(true);
        setLockoutEndTime(lockoutDate);
      }
    }
  }, []);

  // Temporizador de bloqueo
  useEffect(() => {
    let interval;
    if (isLocked && lockoutEndTime) {
      interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.ceil((lockoutEndTime - now) / 1000);
        
        if (remaining <= 0) {
          setIsLocked(false);
          setLockoutEndTime(null);
          setRemainingTime(0);
          setLoginAttempts(0);
          setStoredSecurityState({ 
            attempts: 0, 
            lockoutUntil: null, 
            lockoutCount 
          });
          clearInterval(interval);
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockoutEndTime, lockoutCount]);

  // Función para activar bloqueo
  const activateLockout = useCallback(() => {
    const newLockoutCount = lockoutCount + 1;
    const lockoutDuration = INITIAL_LOCKOUT_TIME * Math.pow(LOCKOUT_MULTIPLIER, newLockoutCount - 1);
    const lockoutEnd = new Date(Date.now() + lockoutDuration * 1000);
    
    setIsLocked(true);
    setLockoutEndTime(lockoutEnd);
    setRemainingTime(lockoutDuration);
    setLockoutCount(newLockoutCount);
    
    setStoredSecurityState({
      attempts: MAX_LOGIN_ATTEMPTS,
      lockoutUntil: lockoutEnd.toISOString(),
      lockoutCount: newLockoutCount
    });

    toast.error(
      `Cuenta bloqueada temporalmente por ${lockoutDuration} segundos debido a múltiples intentos fallidos`,
      { duration: 5000 }
    );
  }, [lockoutCount]);

  // Función para manejar intento fallido
  const handleFailedAttempt = useCallback(() => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      activateLockout();
    } else {
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
      setStoredSecurityState({ 
        attempts: newAttempts, 
        lockoutUntil: null, 
        lockoutCount 
      });
      toast.warning(
        `Credenciales incorrectas. Te quedan ${remaining} intento${remaining !== 1 ? 's' : ''}`
      );
    }
  }, [loginAttempts, lockoutCount, activateLockout]);

  // Función para resetear intentos en login exitoso
  const handleSuccessfulLogin = useCallback(() => {
    setLoginAttempts(0);
    setLockoutCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    mode: "onChange"
  });

  const watchedEmail = watch("email");
  const watchedPassword = watch("password");

  const { mutate: loginMutate, isPending: isLoginPending } = useMutation({
    mutationKey: ["login-email"],
    mutationFn: loginEmail,
    onSuccess: () => {
      handleSuccessfulLogin();
    },
    onError: (error) => {
      handleFailedAttempt();
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
    if (isLocked) {
      toast.error(`Por favor espera ${remainingTime} segundos antes de intentar nuevamente`);
      return;
    }
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
            <LogoText>Minimarket</LogoText>
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

              {/* Alerta de bloqueo */}
              {isLocked && (
                <LockoutAlert>
                  <LockoutIcon>
                    <Icon icon="lucide:shield-alert" />
                  </LockoutIcon>
                  <LockoutContent>
                    <LockoutTitle>Cuenta bloqueada temporalmente</LockoutTitle>
                    <LockoutMessage>
                      Demasiados intentos fallidos. Podrás intentar nuevamente en:
                    </LockoutMessage>
                    <LockoutTimer>
                      <Icon icon="lucide:clock" />
                      {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                    </LockoutTimer>
                  </LockoutContent>
                </LockoutAlert>
              )}

              {/* Indicador de intentos restantes */}
              {!isLocked && loginAttempts > 0 && (
                <AttemptsWarning>
                  <Icon icon="lucide:alert-triangle" />
                  <span>
                    {MAX_LOGIN_ATTEMPTS - loginAttempts} intento{MAX_LOGIN_ATTEMPTS - loginAttempts !== 1 ? 's' : ''} restante{MAX_LOGIN_ATTEMPTS - loginAttempts !== 1 ? 's' : ''}
                  </span>
                </AttemptsWarning>
              )}

              <Form onSubmit={handleSubmit(handleEmailLogin)}>
                <InputGroup>
                  <InputLabel>Correo electrónico</InputLabel>
                  <InputWrapper $hasError={!!errors.email}>
                    <InputIcon>
                      <Icon icon="lucide:mail" />
                    </InputIcon>
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      disabled={isLocked}
                      autoComplete="email"
                      {...register("email", { 
                        required: "El correo es requerido",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Ingresa un correo electrónico válido"
                        },
                        maxLength: {
                          value: 254,
                          message: "El correo no puede exceder 254 caracteres"
                        }
                      })}
                    />
                    {watchedEmail && !errors.email && (
                      <ValidationIcon $valid>
                        <Icon icon="lucide:check-circle" />
                      </ValidationIcon>
                    )}
                  </InputWrapper>
                  {errors.email && <InputError>{errors.email.message}</InputError>}
                </InputGroup>

                <InputGroup>
                  <InputLabel>Contraseña</InputLabel>
                  <InputWrapper $hasError={!!errors.password}>
                    <InputIcon>
                      <Icon icon="lucide:lock" />
                    </InputIcon>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      disabled={isLocked}
                      autoComplete="current-password"
                      {...register("password", { 
                        required: "La contraseña es requerida",
                        minLength: {
                          value: 6,
                          message: "La contraseña debe tener al menos 6 caracteres"
                        },
                        maxLength: {
                          value: 128,
                          message: "La contraseña no puede exceder 128 caracteres"
                        }
                      })}
                    />
                    <PasswordToggle 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLocked}
                      tabIndex={-1}
                    >
                      <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} />
                    </PasswordToggle>
                  </InputWrapper>
                  {errors.password && <InputError>{errors.password.message}</InputError>}
                </InputGroup>

                <PrimaryButton 
                  type="submit" 
                  disabled={isLoginPending || isLocked || !watchedEmail || !watchedPassword}
                >
                  {isLoginPending ? (
                    <>
                      <Icon icon="lucide:loader-2" className="spin" />
                      Verificando...
                    </>
                  ) : isLocked ? (
                    <>
                      <Icon icon="lucide:lock" />
                      Bloqueado
                    </>
                  ) : (
                    <>
                      Iniciar Sesión
                      <Icon icon="lucide:arrow-right" />
                    </>
                  )}
                </PrimaryButton>
              </Form>

              {/* Información de seguridad */}
              <SecurityInfo>
                <Icon icon="lucide:shield-check" />
                <span>Conexión segura · Los datos están encriptados</span>
              </SecurityInfo>
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
          <span>Minimarket "Minimarket"</span>
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

  ${props => props.$hasError && `
    input {
      border-color: #ef4444;
      background: #fef2f2;
    }
  `}
`;

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  font-size: 18px;
  color: #666;
  display: flex;
  z-index: 1;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 44px 14px 44px;
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #f5f5f5;
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

// Componentes de seguridad
const LockoutAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1px solid #fecaca;
  border-radius: 12px;
  animation: shake 0.5s ease-in-out;

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
`;

const LockoutIcon = styled.div`
  width: 40px;
  height: 40px;
  background: #dc2626;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  flex-shrink: 0;
`;

const LockoutContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LockoutTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #dc2626;
`;

const LockoutMessage = styled.span`
  font-size: 13px;
  color: #7f1d1d;
`;

const LockoutTimer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #dc2626;
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  width: fit-content;

  svg {
    font-size: 16px;
  }
`;

const AttemptsWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #92400e;

  svg {
    font-size: 18px;
    color: #f59e0b;
  }
`;

const ValidationIcon = styled.div`
  position: absolute;
  right: 14px;
  font-size: 18px;
  display: flex;
  color: ${props => props.$valid ? '#22c55e' : '#ef4444'};
  transition: all 0.2s;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  font-size: 18px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
  z-index: 1;

  &:hover:not(:disabled) {
    color: #111;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecurityInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  font-size: 12px;
  color: #888;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;

  svg {
    font-size: 14px;
    color: #22c55e;
  }
`;
