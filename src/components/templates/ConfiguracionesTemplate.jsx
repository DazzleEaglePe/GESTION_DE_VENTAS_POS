import styled from "styled-components";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { usePermisosStore } from "../../store/PermisosStore";
import { useUsuariosStore } from "../../store/UsuariosStore";

// Mapeo de módulos a iconos de Iconify (lucide)
const iconMap = {
  "Categorias de productos": "lucide:tags",
  "Productos": "lucide:package",
  "Empresa": "lucide:building-2",
  "Clientes": "lucide:users",
  "Proveedores": "lucide:truck",
  "Métodos de pago": "lucide:credit-card",
  "Sucursales y cajas": "lucide:store",
  "Usuarios": "lucide:user-cog",
  "Impresoras": "lucide:printer",
  "Almacenes": "lucide:warehouse",
  "Configuración de ticket": "lucide:receipt",
  "Serialización de comprobantes": "lucide:file-text",
};

// Colores suaves para cada módulo
const colorMap = {
  "Categorias de productos": { bg: "#e8f5e9", icon: "#43a047" },
  "Productos": { bg: "#e3f2fd", icon: "#1976d2" },
  "Empresa": { bg: "#fce4ec", icon: "#c2185b" },
  "Clientes": { bg: "#fff3e0", icon: "#ef6c00" },
  "Proveedores": { bg: "#f3e5f5", icon: "#7b1fa2" },
  "Métodos de pago": { bg: "#e0f2f1", icon: "#00897b" },
  "Sucursales y cajas": { bg: "#fff8e1", icon: "#ffa000" },
  "Usuarios": { bg: "#e8eaf6", icon: "#3949ab" },
  "Impresoras": { bg: "#fafafa", icon: "#616161" },
  "Almacenes": { bg: "#efebe9", icon: "#6d4c41" },
  "Configuración de ticket": { bg: "#e1f5fe", icon: "#0288d1" },
  "Serialización de comprobantes": { bg: "#f1f8e9", icon: "#689f38" },
};

const defaultColor = { bg: "#f5f5f5", icon: "#757575" };
const defaultIcon = "lucide:settings";

export function ConfiguracionesTemplate() {
  const { dataPermisosConfiguracion } = usePermisosStore();
  const { datausuarios } = useUsuariosStore();
  
  // Solo administradores pueden ver elementos eliminados
  // Verificamos con varias condiciones por seguridad
  const rolNombre = datausuarios?.roles?.nombre?.toLowerCase() || "";
  const esAdmin = rolNombre.includes("admin") || rolNombre === "administrador";

  if (!dataPermisosConfiguracion || !Array.isArray(dataPermisosConfiguracion)) {
    return (
      <Container>
        <EmptyState>
          <Icon icon="lucide:loader" className="spin" />
          <p>Cargando módulos de configuración...</p>
        </EmptyState>
      </Container>
    );
  }

  if (dataPermisosConfiguracion.length === 0) {
    return (
      <Container>
        <EmptyState>
          <Icon icon="lucide:lock" style={{ fontSize: 48, color: "#ccc" }} />
          <h3>No tienes acceso a módulos de configuración</h3>
          <p>Contacta al administrador para obtener permisos</p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Icon icon="lucide:settings" />
        <div>
          <h1>Configuración</h1>
          <p>Administra los módulos de tu sistema</p>
        </div>
      </Header>

      <CardsGrid>
        {dataPermisosConfiguracion.map((item, index) => {
          const moduleName = item.modulos.nombre;
          const icon = iconMap[moduleName] || defaultIcon;
          const colors = colorMap[moduleName] || defaultColor;
          const linkTo = item.modulos.link;
          // Si state es undefined o true, el módulo está habilitado
          const isDisabled = item.modulos.state === false;
          
          return (
            <Card
              to={linkTo}
              key={index}
              $disabled={isDisabled}
            >
              <IconWrapper $bgColor={colors.bg}>
                <Icon icon={icon} style={{ color: colors.icon, fontSize: 28 }} />
              </IconWrapper>
              <CardContent>
                <h3>{moduleName}</h3>
                <p>{item.modulos.descripcion}</p>
              </CardContent>
              <ArrowIcon>
                <Icon icon="lucide:chevron-right" />
              </ArrowIcon>
            </Card>
          );
        })}
        
        {/* Card especial para Elementos Eliminados - Solo para admins */}
        {/* {esAdmin && (
          <Card to="/configuracion/eliminados">
            <IconWrapper $bgColor="#fef2f2">
              <Icon icon="lucide:trash-2" style={{ color: "#dc2626", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Elementos Eliminados</h3>
              <p>Recupera registros eliminados del sistema</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
        
        {/* Card especial para Auditoría - Solo para admins */}
        {/* {esAdmin && (
          <Card to="/configuracion/auditoria">
            <IconWrapper $bgColor="#eef2ff">
              <Icon icon="lucide:activity" style={{ color: "#6366f1", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Registro de Actividad</h3>
              <p>Historial de operaciones del sistema</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
        
        {/* Card especial para Historial de Precios - Solo para admins */}
        {/* {esAdmin && (
          <Card to="/configuracion/historial-precios">
            <IconWrapper $bgColor="#fef3c7">
              <Icon icon="lucide:history" style={{ color: "#d97706", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Historial de Precios</h3>
              <p>Seguimiento de cambios de precios</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
        
        {/* Card especial para Transferencias entre Almacenes - Solo para admins */}
        {/* {esAdmin && (
          <Card to="/configuracion/transferencias">
            <IconWrapper $bgColor="#f3e8ff">
              <Icon icon="lucide:arrow-left-right" style={{ color: "#8b5cf6", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Transferencias</h3>
              <p>Movimiento de productos entre almacenes</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
        
        {/* ===== FASE 3: MEJORAS / DIFERENCIACIÓN ===== */}
        
        {/* Card especial para Variantes de Productos */}
        {/* {esAdmin && (
          <Card to="/configuracion/variantes">
            <IconWrapper $bgColor="#eef2ff">
              <Icon icon="lucide:layers" style={{ color: "#6366f1", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Variantes de Productos</h3>
              <p>Atributos como talla, color, material</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
        
        {/* Card especial para Multi-Precios */}
        {/* {esAdmin && (
          <Card to="/configuracion/multiprecios">
            <IconWrapper $bgColor="#ecfdf5">
              <Icon icon="lucide:badge-dollar-sign" style={{ color: "#10b981", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Multi-Precios</h3>
              <p>Precios por volumen y tipo de cliente</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
        
        {/* Card especial para Productos Compuestos (Kits) */}
        {/* {esAdmin && (
          <Card to="/configuracion/productos-compuestos">
            <IconWrapper $bgColor="#fffbeb">
              <Icon icon="lucide:boxes" style={{ color: "#f59e0b", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Productos Compuestos</h3>
              <p>Kits, combos y paquetes</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
        
        {/* Card especial para Control de Seriales */}
        {/* {esAdmin && (
          <Card to="/configuracion/seriales">
            <IconWrapper $bgColor="#faf5ff">
              <Icon icon="lucide:barcode" style={{ color: "#a855f7", fontSize: 28 }} />
            </IconWrapper>
            <CardContent>
              <h3>Control de Seriales</h3>
              <p>Seguimiento de números de serie</p>
            </CardContent>
            <ArrowIcon>
              <Icon icon="lucide:chevron-right" />
            </ArrowIcon>
          </Card>
        )} */}
      </CardsGrid>
    </Container>
  );
}

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
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
  padding: 20px 25px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  > svg {
    font-size: 32px;
    color: #6366f1;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 4px 0 0 0;
  }

  @media (max-width: 768px) {
    padding: 16px 20px;
    
    > svg {
      font-size: 28px;
    }

    h1 {
      font-size: 1.25rem;
    }
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const Card = styled(Link)`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  opacity: ${props => props.$disabled ? 0.5 : 1};
  pointer-events: ${props => props.$disabled ? 'none' : 'auto'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

    h3 {
      color: #6366f1;
    }
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 16px;
    gap: 14px;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${props => props.$bgColor || '#f5f5f5'};
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    border-radius: 12px;

    svg {
      font-size: 24px !important;
    }
  }
`;

const CardContent = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0;
    transition: color 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 4px 0 0 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    h3 {
      font-size: 0.9375rem;
    }

    p {
      font-size: 0.75rem;
    }
  }
`;

const ArrowIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  transition: all 0.2s ease;
  flex-shrink: 0;

  svg {
    font-size: 20px;
  }

  ${Card}:hover & {
    color: #6366f1;
    transform: translateX(4px);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  .spin {
    font-size: 32px;
    color: #6366f1;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a1a2e;
    margin: 16px 0 8px 0;
  }

  p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
  }
`;
