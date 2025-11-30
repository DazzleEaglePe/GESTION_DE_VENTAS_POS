import styled from "styled-components";
import {
  LinksArray,
  SecondarylinksArray,
  ToggleTema,
  useAuthStore,
} from "../../../index";
import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";


export function Sidebar({ state, setState }) {
  const { cerrarSesion } = useAuthStore();

  const handleCerrarSesion = async () => {
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "Se cerrará tu sesión actual",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#111",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: 'swal-minimal',
        title: 'swal-title-minimal',
        confirmButton: 'swal-btn-confirm',
        cancelButton: 'swal-btn-cancel',
      }
    });

    if (result.isConfirmed) {
      await cerrarSesion();
    }
  };

  return (
    <Main $isopen={state.toString()}>
      <ToggleButton 
        $isopen={state.toString()} 
        onClick={() => setState(!state)}
        title={state ? "Colapsar menú" : "Expandir menú"}
      >
        <Icon icon="lucide:chevrons-left" />
      </ToggleButton>
      
      <Container $isopen={state.toString()}>
        {/* Logo */}
        <LogoSection $isopen={state.toString()}>
          <LogoBox>M&L</LogoBox>
          <LogoText $isopen={state.toString()}>Mathias y Luciana</LogoText>
        </LogoSection>

        {/* Navegación Principal */}
        <NavSection $isopen={state.toString()}>
          <NavLabel $isopen={state.toString()}>Menú</NavLabel>
          {LinksArray.map(({ icon, label, to }) => (
            <LinkItem key={label}>
              <StyledNavLink
                to={to}
                className={({ isActive }) => isActive ? 'active' : ''}
                $isopen={state.toString()}
                title={!state ? label : undefined}
              >
                <LinkIcon>
                  <Icon icon={icon} />
                </LinkIcon>
                <LinkLabel $isopen={state.toString()}>{label}</LinkLabel>
              </StyledNavLink>
            </LinkItem>
          ))}
        </NavSection>

        <Divider />

        {/* Navegación Secundaria */}
        <NavSection $isopen={state.toString()}>
          <NavLabel $isopen={state.toString()}>Sistema</NavLabel>
          {SecondarylinksArray.map(({ icon, label, to }) => (
            <LinkItem key={label}>
              <StyledNavLink
                to={to}
                className={({ isActive }) => isActive ? 'active' : ''}
                $isopen={state.toString()}
                title={!state ? label : undefined}
              >
                <LinkIcon>
                  <Icon icon={icon} />
                </LinkIcon>
                <LinkLabel $isopen={state.toString()}>{label}</LinkLabel>
              </StyledNavLink>
            </LinkItem>
          ))}
        </NavSection>

        {/* Cerrar Sesión */}
        <LogoutSection $isopen={state.toString()}>
          <LogoutButton 
            onClick={handleCerrarSesion} 
            $isopen={state.toString()}
            title={!state ? "Cerrar Sesión" : undefined}
          >
            <LinkIcon>
              <Icon icon="lucide:log-out" />
            </LinkIcon>
            <LinkLabel $isopen={state.toString()}>Cerrar Sesión</LinkLabel>
          </LogoutButton>
        </LogoutSection>

        {/* Toggle Tema */}
        <ThemeSection $isopen={state.toString()}>
          <ToggleTema />
        </ThemeSection>
      </Container>
    </Main>
  );
}

const Main = styled.div`
  position: relative;
`;

const ToggleButton = styled.button`
  position: fixed;
  top: 28px;
  left: ${({ $isopen }) => $isopen === "true" ? '244px' : '68px'};
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #111;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  svg {
    font-size: 16px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${({ $isopen }) => $isopen === "true" ? 'rotate(0deg)' : 'rotate(180deg)'};
  }
`;

const Container = styled.div`
  background: ${({ theme }) => theme.bg};
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  height: 100vh;
  width: ${({ $isopen }) => $isopen === "true" ? '260px' : '80px'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid ${({ theme }) => theme.gray100 || '#eee'};
  display: flex;
  flex-direction: column;
  align-items: ${({ $isopen }) => $isopen === "true" ? 'stretch' : 'center'};
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #ddd;
    border-radius: 4px;
  }
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.gray100 || '#f5f5f5'};
  justify-content: center;
  min-height: 81px;
  width: 100%;
  box-sizing: border-box;
`;

const LogoBox = styled.div`
  width: 40px;
  height: 40px;
  background: #111;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -0.5px;
  flex-shrink: 0;
`;

const LogoText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  opacity: ${({ $isopen }) => $isopen === "true" ? 1 : 0};
  width: ${({ $isopen }) => $isopen === "true" ? 'auto' : 0};
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const NavSection = styled.div`
  padding: ${({ $isopen }) => $isopen === "true" ? '16px 12px' : '16px 0'};
  flex: 0;
  width: 100%;
  box-sizing: border-box;
`;

const NavLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.textSecondary || '#999'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 8px;
  margin-bottom: 8px;
  display: block;
  opacity: ${({ $isopen }) => $isopen === "true" ? 1 : 0};
  height: ${({ $isopen }) => $isopen === "true" ? 'auto' : 0};
  overflow: hidden;
  transition: all 0.2s ease;
`;

const LinkItem = styled.div`
  margin: 4px 0;
  display: flex;
  justify-content: center;
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  text-decoration: none;
  color: ${({ theme }) => theme.textSecondary || '#666'};
  transition: all 0.15s ease;
  justify-content: ${({ $isopen }) => $isopen === "true" ? 'flex-start' : 'center'};
  width: ${({ $isopen }) => $isopen === "true" ? '100%' : '48px'};
  position: relative;

  &:hover {
    background: ${({ theme }) => theme.gray100 || '#f5f5f5'};
    color: ${({ theme }) => theme.text};
  }

  &.active {
    background: #111;
    color: #fff;
  }
`;

const LinkIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const LinkLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  opacity: ${({ $isopen }) => $isopen === "true" ? 1 : 0};
  width: ${({ $isopen }) => $isopen === "true" ? 'auto' : 0};
  overflow: hidden;
  transition: all 0.2s ease;
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.gray100 || '#f0f0f0'};
  margin: 0 16px;
  width: calc(100% - 32px);
`;

const LogoutSection = styled.div`
  padding: ${({ $isopen }) => $isopen === "true" ? '16px 12px' : '16px 0'};
  margin-top: auto;
  border-top: 1px solid ${({ theme }) => theme.gray100 || '#f5f5f5'};
  width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.textSecondary || '#999'};
  cursor: pointer;
  width: ${({ $isopen }) => $isopen === "true" ? '100%' : '48px'};
  transition: all 0.15s ease;
  justify-content: ${({ $isopen }) => $isopen === "true" ? 'flex-start' : 'center'};
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background: #fef2f2;
    color: #ef4444;
  }
`;

const ThemeSection = styled.div`
  padding: 12px;
  border-top: 1px solid ${({ theme }) => theme.gray100 || '#f5f5f5'};
  display: flex;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
`;