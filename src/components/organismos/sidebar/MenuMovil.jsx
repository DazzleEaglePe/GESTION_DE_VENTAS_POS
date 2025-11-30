import styled from "styled-components";
import {
  LinksArray,
  SecondarylinksArray,
  ToggleTema,
  useAuthStore,
} from "../../../index";
import { NavLink } from "react-router-dom";
import { Icon } from "@iconify/react";

export const MenuMovil = ({ setState }) => {
  const { cerrarSesion } = useAuthStore();

  const handleLogout = () => {
    cerrarSesion();
    setState();
  };

  return (
    <Overlay onClick={setState}>
      <Container onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <LogoBox>M&L</LogoBox>
          <LogoText>Mathias y Luciana</LogoText>
          <CloseButton onClick={setState}>
            <Icon icon="lucide:x" />
          </CloseButton>
        </Header>

        {/* Navegación Principal */}
        <NavSection>
          <NavLabel>Menú</NavLabel>
          {LinksArray.map(({ icon, label, to }) => (
            <LinkItem key={label} onClick={setState}>
              <StyledNavLink
                to={to}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <LinkIcon>
                  <Icon icon={icon} />
                </LinkIcon>
                <LinkLabel>{label}</LinkLabel>
              </StyledNavLink>
            </LinkItem>
          ))}
        </NavSection>

        <Divider />

        {/* Navegación Secundaria */}
        <NavSection>
          <NavLabel>Sistema</NavLabel>
          {SecondarylinksArray.map(({ icon, label, to }) => (
            <LinkItem key={label} onClick={setState}>
              <StyledNavLink
                to={to}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <LinkIcon>
                  <Icon icon={icon} />
                </LinkIcon>
                <LinkLabel>{label}</LinkLabel>
              </StyledNavLink>
            </LinkItem>
          ))}
        </NavSection>

        {/* Footer */}
        <Footer>
          <LogoutButton onClick={handleLogout}>
            <Icon icon="lucide:log-out" />
            <span>Cerrar Sesión</span>
          </LogoutButton>
          <ThemeWrapper>
            <ToggleTema />
          </ThemeWrapper>
        </Footer>
      </Container>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background: ${({ theme }) => theme.bg};
  z-index: 1001;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.gray100 || '#f0f0f0'};
`;

const LogoBox = styled.div`
  min-width: 40px;
  height: 40px;
  background: #111;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  flex: 1;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ theme }) => theme.gray100 || '#f5f5f5'};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.textSecondary || '#666'};
  font-size: 20px;
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) => theme.gray200 || '#eee'};
    color: ${({ theme }) => theme.text};
  }
`;

const NavSection = styled.div`
  padding: 16px;
`;

const NavLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.textSecondary || '#999'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 12px;
  margin-bottom: 8px;
  display: block;
`;

const LinkItem = styled.div`
  margin: 4px 0;
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: ${({ theme }) => theme.textSecondary || '#666'};
  transition: all 0.15s ease;

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
`;

const LinkLabel = styled.span`
  font-size: 15px;
  font-weight: 500;
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.gray100 || '#f0f0f0'};
  margin: 0 20px;
`;

const Footer = styled.div`
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.gray100 || '#f0f0f0'};
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 12px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.textSecondary || '#999'};
  cursor: pointer;
  width: 100%;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.15s;

  &:hover {
    background: #fef2f2;
    color: #ef4444;
  }

  svg {
    font-size: 22px;
  }
`;

const ThemeWrapper = styled.div`
  margin-top: 12px;
  padding: 0 12px;
`;
