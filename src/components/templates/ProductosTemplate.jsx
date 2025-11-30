import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import ConfettiExplosion from "react-confetti-explosion";

import { useProductosStore } from "../../store/ProductosStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { RegistrarProductos } from "../organismos/formularios/RegistrarProductos";
import { TablaProductos } from "../organismos/tablas/TablaProductos";
import { TablaProductosInactivos } from "../organismos/tablas/TablaProductosInactivos";

export function ProductosTemplate() {
  const [openRegistro, setOpenRegistro] = useState(false);
  const [accion, setAccion] = useState("");
  const [dataSelect, setDataSelect] = useState([]);
  const [isExploding, setIsExploding] = useState(false);
  const [tabActiva, setTabActiva] = useState("activos");
  const [busqueda, setBusqueda] = useState("");

  const { dataProductos, setBuscador, generarCodigo, mostrarProductosInactivos, dataProductosInactivos } = useProductosStore();
  const { dataempresa } = useEmpresaStore();

  const { refetch: refetchInactivos } = useQuery({
    queryKey: ["mostrar productos inactivos", dataempresa?.id],
    queryFn: () => mostrarProductosInactivos({ id_empresa: dataempresa?.id }),
    enabled: false,
    refetchOnWindowFocus: false,
  });

  function nuevoRegistro() {
    setOpenRegistro(true);
    setAccion("Nuevo");
    setDataSelect([]);
    setIsExploding(false);
    generarCodigo();
  }

  function cambiarTab(tab) {
    setTabActiva(tab);
    if (tab === "inactivos") refetchInactivos();
  }

  function handleBusqueda(e) {
    setBusqueda(e.target.value);
    setBuscador(e.target.value);
  }

  return (
    <Container>
      <Toaster position="top-center" richColors />
      {isExploding && <ConfettiExplosion />}

      {openRegistro && (
        <RegistrarProductos
          setIsExploding={setIsExploding}
          onClose={() => setOpenRegistro(false)}
          dataSelect={dataSelect}
          accion={accion}
          state={openRegistro}
        />
      )}

      {/* Header */}
      <Header>
        <HeaderInfo>
          <Title>Productos</Title>
          <Subtitle>Gestiona el catálogo de productos</Subtitle>
        </HeaderInfo>
        {tabActiva === "activos" && (
          <AddButton onClick={nuevoRegistro}>
            <Icon icon="lucide:plus" />
            Nuevo producto
          </AddButton>
        )}
      </Header>

      {/* Content Card */}
      <Card>
        {/* Tabs & Search */}
        <CardHeader>
          <Tabs>
            <Tab $active={tabActiva === "activos"} onClick={() => cambiarTab("activos")}>
              <Icon icon="lucide:package" />
              Activos
              <TabBadge $active={tabActiva === "activos"}>{dataProductos?.length || 0}</TabBadge>
            </Tab>
            <Tab $active={tabActiva === "inactivos"} onClick={() => cambiarTab("inactivos")}>
              <Icon icon="lucide:package-x" />
              Inactivos
              <TabBadge $active={tabActiva === "inactivos"}>{dataProductosInactivos?.length || 0}</TabBadge>
            </Tab>
          </Tabs>

          {tabActiva === "activos" && (
            <SearchBox>
              <Icon icon="lucide:search" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={handleBusqueda}
              />
            </SearchBox>
          )}
        </CardHeader>

        {/* Table */}
        <TableContainer>
          {tabActiva === "activos" ? (
            <TablaProductos
              setdataSelect={setDataSelect}
              setAccion={setAccion}
              SetopenRegistro={setOpenRegistro}
              data={dataProductos}
            />
          ) : (
            <TablaProductosInactivos data={dataProductosInactivos} />
          )}
        </TableContainer>
      </Card>
    </Container>
  );
}

// Styles
const Container = styled.div`
  min-height: 100vh;
  padding: 32px 24px;
  background: #f5f5f5;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto 24px;
`;

const HeaderInfo = styled.div``;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #111;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #666;
  margin: 0;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  svg { font-size: 20px; }

  &:hover {
    background: #222;
    transform: translateY(-1px);
  }
`;

const Card = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  gap: 16px;
  flex-wrap: wrap;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  background: ${({ $active }) => ($active ? "#111" : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : "#666")};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 18px; }

  &:hover {
    background: ${({ $active }) => ($active ? "#111" : "#f5f5f5")};
  }
`;

const TabBadge = styled.span`
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $active }) => ($active ? "rgba(255,255,255,0.2)" : "#f0f0f0")};
  border-radius: 10px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fafafa;
  border: 2px solid #e5e5e5;
  border-radius: 10px;
  min-width: 280px;
  transition: all 0.15s;

  svg { font-size: 18px; color: #999; }

  input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;

    &::placeholder { color: #bbb; }
  }

  &:focus-within {
    border-color: #111;
    background: #fff;
  }
`;

const TableContainer = styled.div`
  padding: 0;
`;
