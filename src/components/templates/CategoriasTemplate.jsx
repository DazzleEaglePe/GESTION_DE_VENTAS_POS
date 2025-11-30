import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useCategoriasStore } from "../../index";
import { TablaCategorias } from "../organismos/tablas/TablaCategorias";
import { RegistrarCategorias } from "../organismos/formularios/RegistrarCategorias";
import ConfettiExplosion from "react-confetti-explosion";

export function CategoriasTemplate() {
  const [openRegistro, setOpenRegistro] = useState(false);
  const { datacategorias, setBuscador, buscador } = useCategoriasStore();
  const [accion, setAccion] = useState("");
  const [dataSelect, setDataSelect] = useState([]);
  const [isExploding, setIsExploding] = useState(false);

  function nuevoRegistro() {
    setOpenRegistro(true);
    setAccion("Nuevo");
    setDataSelect([]);
    setIsExploding(false);
  }

  return (
    <Container>
      {openRegistro && (
        <RegistrarCategorias
          setIsExploding={setIsExploding}
          onClose={() => setOpenRegistro(false)}
          dataSelect={dataSelect}
          accion={accion}
        />
      )}

      {isExploding && <ConfettiExplosion />}

      {/* Header */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:tags" />
          </IconWrapper>
          <div>
            <Title>Categorías</Title>
            <Subtitle>
              {datacategorias?.length || 0} categorías registradas
            </Subtitle>
          </div>
        </HeaderLeft>

        <HeaderRight>
          <SearchWrapper>
            <SearchIcon>
              <Icon icon="lucide:search" />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Buscar categoría..."
              value={buscador}
              onChange={(e) => setBuscador(e.target.value)}
            />
            {buscador && (
              <ClearButton onClick={() => setBuscador("")}>
                <Icon icon="lucide:x" />
              </ClearButton>
            )}
          </SearchWrapper>

          <AddButton onClick={nuevoRegistro}>
            <Icon icon="lucide:plus" />
            <span>Nueva Categoría</span>
          </AddButton>
        </HeaderRight>
      </Header>

      {/* Content */}
      <Content>
        <TablaCategorias
          setdataSelect={setDataSelect}
          setAccion={setAccion}
          SetopenRegistro={setOpenRegistro}
          data={datacategorias}
        />
      </Content>
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
  width: 48px;
  height: 48px;
  background: #e8f5e9;
  border-radius: 12px;

  svg {
    font-size: 24px;
    color: #43a047;
  }
`;

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

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  color: #94a3b8;
  display: flex;
  align-items: center;

  svg {
    font-size: 18px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-width: 280px;
  padding: 12px 40px 12px 44px;
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
    border-color: #43a047;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.1);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #64748b;
    background: #f1f5f9;
  }

  svg {
    font-size: 16px;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #43a047;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg {
    font-size: 18px;
  }

  &:hover {
    background: #388e3c;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Content = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;
