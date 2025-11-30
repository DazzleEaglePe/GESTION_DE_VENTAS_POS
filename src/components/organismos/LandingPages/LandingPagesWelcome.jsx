import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Device } from "../../../styles/breakpoints";
import ScrollReveal from "scrollreveal";
import { BtnLink } from "../../moleculas/BtnLink";
import { useUsuariosStore } from "../../../store/UsuariosStore";
import { Link } from "react-router-dom";

export const LandingPagesWelcome = () => {
  const { datausuarios } = useUsuariosStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    ScrollReveal().reveal(".fade-up", {
      origin: "bottom",
      distance: "30px",
      duration: 800,
      easing: "ease-out",
      interval: 100,
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLoggedIn = !!datausuarios?.id;

  return (
    <Container>
      {/* Navbar */}
      <Navbar $scrolled={scrolled}>
        <NavContent>
          <NavLogo to="/">
            <LogoBox>M&L</LogoBox>
            <LogoText>Minimarket</LogoText>
          </NavLogo>

          <NavLinks $open={menuOpen}>
            {isLoggedIn ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/pos">Punto de Venta</NavLink>
                <NavLink to="/inventario">Inventario</NavLink>
                <NavLink to="/reportes">Reportes</NavLink>
                <NavLink to="/configuracion">Configuración</NavLink>
                <NavDivider />
                <NavLink to="/miperfil">Mi Perfil</NavLink>
              </>
            ) : (
              <>
                <NavLinkScroll href="#caracteristicas">Características</NavLinkScroll>
                <NavLinkScroll href="#tecnologia">Tecnología</NavLinkScroll>
              </>
            )}
          </NavLinks>

          <NavActions>
            {isLoggedIn ? (
              <NavButton to="/pos">Ir al POS</NavButton>
            ) : (
              <NavButton to="/login">Iniciar Sesión</NavButton>
            )}
            <MenuToggle onClick={() => setMenuOpen(!menuOpen)}>
              <MenuIcon $open={menuOpen}>
                <span></span>
                <span></span>
                <span></span>
              </MenuIcon>
            </MenuToggle>
          </NavActions>
        </NavContent>
      </Navbar>

      {/* Hero */}
      <HeroSection>
        <HeroContent className="fade-up">
          <Logo>M&L</Logo>
          <Title>Minimarket Minimarket</Title>
          <Subtitle>Sistema de Gestión de Ventas</Subtitle>
          <Location>Ica, Perú — 2025</Location>
          
          <ButtonGroup>
            <BtnLink 
              url={isLoggedIn ? "/pos" : "/login"} 
              color={"#fff"} 
              bgcolor={"#111"} 
              titulo={isLoggedIn ? "Ir al Sistema" : "Iniciar Sesión"} 
            />
          </ButtonGroup>
        </HeroContent>
      </HeroSection>

      {/* Features */}
      <FeaturesSection id="caracteristicas">
        <FeaturesGrid>
          <FeatureItem className="fade-up">
            <FeatureNumber>01</FeatureNumber>
            <FeatureTitle>Punto de Venta</FeatureTitle>
            <FeatureDesc>Procesa ventas de forma rápida y sencilla</FeatureDesc>
          </FeatureItem>
          
          <FeatureItem className="fade-up">
            <FeatureNumber>02</FeatureNumber>
            <FeatureTitle>Inventario</FeatureTitle>
            <FeatureDesc>Control de stock en tiempo real</FeatureDesc>
          </FeatureItem>
          
          <FeatureItem className="fade-up">
            <FeatureNumber>03</FeatureNumber>
            <FeatureTitle>Reportes</FeatureTitle>
            <FeatureDesc>Análisis detallado de ventas</FeatureDesc>
          </FeatureItem>
          
          <FeatureItem className="fade-up">
            <FeatureNumber>04</FeatureNumber>
            <FeatureTitle>Clientes</FeatureTitle>
            <FeatureDesc>Gestión de clientes y proveedores</FeatureDesc>
          </FeatureItem>
        </FeaturesGrid>
      </FeaturesSection>

      {/* Info */}
      <InfoSection id="tecnologia" className="fade-up">
        <InfoContent>
          <InfoLabel>Plataforma</InfoLabel>
          <InfoText>
            Sistema integral diseñado para la gestión eficiente del minimarket. 
            Control total de ventas, inventario y finanzas.
          </InfoText>
        </InfoContent>
        <InfoDivider />
        <InfoContent>
          <InfoLabel>Tecnología</InfoLabel>
          <TechList>
            <TechItem>React.js</TechItem>
            <TechItem>PostgreSQL</TechItem>
            <TechItem>Supabase</TechItem>
          </TechList>
        </InfoContent>
      </InfoSection>

      {/* Footer */}
      <Footer>
        <FooterText>© 2025 Minimarket Minimarket</FooterText>
      </Footer>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: #fafafa;
`;

// Navbar Styles
const Navbar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: ${props => props.$scrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent'};
  backdrop-filter: ${props => props.$scrolled ? 'blur(10px)' : 'none'};
  border-bottom: ${props => props.$scrolled ? '1px solid #eee' : 'none'};
  transition: all 0.3s ease;
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const NavLogo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
`;

const LogoBox = styled.div`
  width: 36px;
  height: 36px;
  background: #111;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #111;
  display: none;

  @media ${Device.tablet} {
    display: block;
  }
`;

const NavLinks = styled.div`
  display: ${props => props.$open ? 'flex' : 'none'};
  flex-direction: column;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  gap: 8px;

  @media ${Device.tablet} {
    display: flex;
    flex-direction: row;
    position: static;
    background: transparent;
    padding: 0;
    border: none;
    gap: 32px;
  }
`;

const NavLink = styled(Link)`
  font-size: 14px;
  color: #666;
  text-decoration: none;
  padding: 8px 0;
  transition: color 0.2s;

  &:hover {
    color: #111;
  }

  @media ${Device.tablet} {
    padding: 0;
  }
`;

const NavLinkScroll = styled.a`
  font-size: 14px;
  color: #666;
  text-decoration: none;
  padding: 8px 0;
  transition: color 0.2s;

  &:hover {
    color: #111;
  }

  @media ${Device.tablet} {
    padding: 0;
  }
`;

const NavDivider = styled.div`
  width: 100%;
  height: 1px;
  background: #eee;

  @media ${Device.tablet} {
    width: 1px;
    height: 20px;
  }
`;

const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const NavButton = styled(Link)`
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: #111;
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: #333;
  }
`;

const MenuToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  cursor: pointer;

  @media ${Device.tablet} {
    display: none;
  }
`;

const MenuIcon = styled.div`
  width: 20px;
  height: 14px;
  position: relative;

  span {
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background: #111;
    transition: all 0.3s;

    &:nth-child(1) {
      top: ${props => props.$open ? '6px' : '0'};
      transform: ${props => props.$open ? 'rotate(45deg)' : 'none'};
    }

    &:nth-child(2) {
      top: 6px;
      opacity: ${props => props.$open ? '0' : '1'};
    }

    &:nth-child(3) {
      top: ${props => props.$open ? '6px' : '12px'};
      transform: ${props => props.$open ? 'rotate(-45deg)' : 'none'};
    }
  }
`;

const HeroSection = styled.section`
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 24px 60px;
  background: #fff;
  border-bottom: 1px solid #eee;
`;

const HeroContent = styled.div`
  text-align: center;
  max-width: 500px;
`;

const Logo = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: #111;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-radius: 12px;
  margin-bottom: 32px;
  letter-spacing: -0.5px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #111;
  margin-bottom: 8px;
  letter-spacing: -0.5px;

  @media ${Device.tablet} {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin-bottom: 4px;
`;

const Location = styled.p`
  font-size: 14px;
  color: #999;
  margin-bottom: 32px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
`;

const FeaturesSection = styled.section`
  padding: 60px 24px;
  max-width: 900px;
  margin: 0 auto;

  @media ${Device.tablet} {
    padding: 80px 24px;
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media ${Device.tablet} {
    grid-template-columns: repeat(2, 1fr);
    gap: 48px;
  }
`;

const FeatureItem = styled.div`
  padding: 24px 0;
  border-bottom: 1px solid #eee;

  @media ${Device.tablet} {
    border-bottom: none;
  }
`;

const FeatureNumber = styled.span`
  font-size: 12px;
  color: #999;
  font-weight: 500;
  display: block;
  margin-bottom: 12px;
`;

const FeatureTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin-bottom: 8px;
`;

const FeatureDesc = styled.p`
  font-size: 14px;
  color: #666;
  line-height: 1.5;
`;

const InfoSection = styled.section`
  background: #fff;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;

  @media ${Device.tablet} {
    flex-direction: row;
    align-items: flex-start;
    padding: 60px 24px;
  }
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoDivider = styled.div`
  width: 100%;
  height: 1px;
  background: #eee;

  @media ${Device.tablet} {
    width: 1px;
    height: 80px;
    margin: 0 48px;
  }
`;

const InfoLabel = styled.span`
  font-size: 12px;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 12px;
`;

const InfoText = styled.p`
  font-size: 15px;
  color: #444;
  line-height: 1.7;
`;

const TechList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TechItem = styled.span`
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 6px;
`;

const Footer = styled.footer`
  padding: 32px 24px;
  text-align: center;
`;

const FooterText = styled.p`
  font-size: 13px;
  color: #999;
`;
