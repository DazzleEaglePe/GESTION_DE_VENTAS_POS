import { NavLink, Outlet } from "react-router-dom";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { Toaster } from "sonner";

export const EmpresaTemplate = () => {
  return (
    <Container>
      <Toaster richColors position="top-center" />
      <PageContainer>
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <SidebarIconWrapper>
              <Icon icon="lucide:settings" />
            </SidebarIconWrapper>
            <SidebarTitle>Configuración</SidebarTitle>
          </SidebarHeader>
          
          <SidebarSection>
            <SectionLabel>
              <Icon icon="lucide:building" />
              Empresa
            </SectionLabel>
            <NavItem to="empresabasicos">
              <Icon icon="lucide:info" />
              <span>Datos básicos</span>
            </NavItem>
            <NavItem to="monedaconfig">
              <Icon icon="lucide:coins" />
              <span>Moneda</span>
            </NavItem>
          </SidebarSection>
        </Sidebar>

        {/* Content */}
        <Content>
          <Outlet />
        </Content>
      </PageContainer>
    </Container>
  );
};

const Container = styled.div`
  min-height: calc(100vh - 50px);
  margin-top: 50px;
  padding: 30px;
  background: #f5f5f5;

  @media (max-width: 768px) {
    padding: 20px 15px;
  }
`;

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 900px) {
    flex-direction: row;
  }
`;

const Sidebar = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 20px;
  height: fit-content;

  @media (min-width: 900px) {
    width: 260px;
    min-width: 260px;
    position: sticky;
    top: 80px;
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
`;

const SidebarIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 10px;

  svg {
    font-size: 20px;
    color: #f59e0b;
  }
`;

const SidebarTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
`;

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;

  svg {
    font-size: 14px;
  }
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s ease;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: #f8fafc;
    color: #1a1a2e;
  }

  &.active {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;

    svg {
      color: #f59e0b;
    }
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;