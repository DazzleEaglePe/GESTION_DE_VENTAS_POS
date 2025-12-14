import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import ConfettiExplosion from "react-confetti-explosion";
import Swal from "sweetalert2";

import { useProductosStore } from "../../store/ProductosStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { useUsuariosStore } from "../../store/UsuariosStore";
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
  
  // Estado para selección múltiple
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  const { dataProductos, setBuscador, generarCodigo, mostrarProductosInactivos, dataProductosInactivos, eliminarProductos, mostrarProductos, parametros } = useProductosStore();
  const { dataempresa } = useEmpresaStore();
  const { datausuarios } = useUsuariosStore();
  const queryClient = useQueryClient();

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
    setModoSeleccion(false);
    setProductosSeleccionados([]);
    if (tab === "inactivos") refetchInactivos();
  }

  function handleBusqueda(e) {
    setBusqueda(e.target.value);
    setBuscador(e.target.value);
  }

  // Toggle modo selección
  function toggleModoSeleccion() {
    setModoSeleccion(!modoSeleccion);
    if (modoSeleccion) {
      setProductosSeleccionados([]);
    }
  }

  // Toggle selección de un producto
  function toggleSeleccionProducto(producto) {
    if (producto.nombre === "General") return; // No permitir seleccionar "General"
    
    setProductosSeleccionados(prev => {
      const existe = prev.find(p => p.id === producto.id);
      if (existe) {
        return prev.filter(p => p.id !== producto.id);
      } else {
        return [...prev, producto];
      }
    });
  }

  // Seleccionar todos
  function seleccionarTodos() {
    const productosValidos = dataProductos?.filter(p => p.nombre !== "General") || [];
    setProductosSeleccionados(productosValidos);
  }

  // Deseleccionar todos
  function deseleccionarTodos() {
    setProductosSeleccionados([]);
  }

  // Desactivar productos en lote
  async function desactivarEnLote() {
    if (productosSeleccionados.length === 0) {
      toast.warning("Selecciona al menos un producto");
      return;
    }

    const result = await Swal.fire({
      title: "¿Desactivar productos?",
      html: `
        <p>Se desactivarán <strong>${productosSeleccionados.length}</strong> producto(s):</p>
        <div style="max-height: 150px; overflow-y: auto; text-align: left; padding: 10px; background: #f5f5f5; border-radius: 8px; margin-top: 10px;">
          ${productosSeleccionados.map(p => `<div style="padding: 4px 0; border-bottom: 1px solid #e5e5e5;">• ${p.nombre}</div>`).join('')}
        </div>
        <p style="margin-top: 12px; color: #666; font-size: 14px;">Podrás restaurarlos desde productos inactivos.</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: `Desactivar ${productosSeleccionados.length}`,
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      let exitosos = 0;
      let fallidos = 0;

      // Mostrar loading
      Swal.fire({
        title: "Desactivando productos...",
        html: `<p>Procesando <span id="progress">0</span> de ${productosSeleccionados.length}</p>`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      for (let i = 0; i < productosSeleccionados.length; i++) {
        const producto = productosSeleccionados[i];
        try {
          await eliminarProductos({
            id: producto.id,
            id_usuario: datausuarios?.id,
            forzarDesactivacion: true,
          });
          exitosos++;
        } catch (error) {
          console.error(`Error al desactivar ${producto.nombre}:`, error);
          fallidos++;
        }
        
        // Actualizar progreso
        const progressEl = document.getElementById('progress');
        if (progressEl) progressEl.textContent = i + 1;
      }

      // Refrescar datos
      await mostrarProductos(parametros);
      await refetchInactivos();
      queryClient.invalidateQueries(["mostrar productos"]);

      // Resultado final
      Swal.fire({
        icon: fallidos > 0 ? "warning" : "success",
        title: fallidos > 0 ? "Proceso completado con errores" : "¡Productos desactivados!",
        html: `
          <p><strong>${exitosos}</strong> producto(s) desactivado(s)</p>
          ${fallidos > 0 ? `<p style="color: #ef4444;"><strong>${fallidos}</strong> producto(s) con error</p>` : ''}
        `,
        timer: 3000,
        showConfirmButton: false,
      });

      // Limpiar selección
      setProductosSeleccionados([]);
      setModoSeleccion(false);
    }
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

      {/* Header Card */}
      <Header>
        <HeaderLeft>
          <IconWrapper>
            <Icon icon="lucide:package" />
          </IconWrapper>
          <HeaderInfo>
            <Title>Productos</Title>
            <Subtitle>
              {dataProductos?.length || 0} productos registrados
            </Subtitle>
          </HeaderInfo>
        </HeaderLeft>

        <HeaderRight>
          <SearchWrapper>
            <SearchIcon>
              <Icon icon="lucide:search" />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={handleBusqueda}
            />
            {busqueda && (
              <ClearSearchBtn onClick={() => setBusqueda("")}>
                <Icon icon="lucide:x" />
              </ClearSearchBtn>
            )}
          </SearchWrapper>

          {tabActiva === "activos" && (
            <AddButton onClick={nuevoRegistro}>
              <Icon icon="lucide:plus" />
              <span>Nuevo Producto</span>
            </AddButton>
          )}
        </HeaderRight>
      </Header>

      {/* Toolbar con tabs y acciones */}
      <Toolbar>
        <ToolbarLeft>
          <Tabs>
            <Tab $active={tabActiva === "activos"} onClick={() => cambiarTab("activos")}>
              <Icon icon="lucide:package" />
              <span>Activos</span>
              <TabBadge $active={tabActiva === "activos"}>{dataProductos?.length || 0}</TabBadge>
            </Tab>
            <Tab $active={tabActiva === "inactivos"} onClick={() => cambiarTab("inactivos")}>
              <Icon icon="lucide:package-x" />
              <span>Inactivos</span>
              <TabBadge $active={tabActiva === "inactivos"}>{dataProductosInactivos?.length || 0}</TabBadge>
            </Tab>
          </Tabs>
        </ToolbarLeft>

        {tabActiva === "activos" && (
          <ToolbarRight>
            <SelectModeButton 
              $active={modoSeleccion} 
              onClick={toggleModoSeleccion}
              title={modoSeleccion ? "Cancelar selección" : "Selección múltiple"}
            >
              <Icon icon={modoSeleccion ? "lucide:x" : "lucide:check-square"} />
              <span>{modoSeleccion ? "Cancelar" : "Seleccionar"}</span>
            </SelectModeButton>
          </ToolbarRight>
        )}
      </Toolbar>

      {/* Barra de selección múltiple */}
      {modoSeleccion && tabActiva === "activos" && (
        <SelectionBar>
          <SelectionInfo>
            <Icon icon="lucide:check-circle-2" />
            <span><strong>{productosSeleccionados.length}</strong> producto(s) seleccionado(s)</span>
          </SelectionInfo>
          <SelectionActions>
            <SelectAllBtn onClick={seleccionarTodos}>
              <Icon icon="lucide:check-check" />
              Seleccionar todos
            </SelectAllBtn>
            <SelectAllBtn onClick={deseleccionarTodos}>
              <Icon icon="lucide:square" />
              Deseleccionar
            </SelectAllBtn>
            <DesactivarLoteBtn 
              onClick={desactivarEnLote}
              disabled={productosSeleccionados.length === 0}
            >
              <Icon icon="lucide:power-off" />
              Desactivar seleccionados
            </DesactivarLoteBtn>
          </SelectionActions>
        </SelectionBar>
      )}

      {/* Content Card */}
      <ContentCard>
        <TableContainer>
          {tabActiva === "activos" ? (
            <TablaProductos
              setdataSelect={setDataSelect}
              setAccion={setAccion}
              SetopenRegistro={setOpenRegistro}
              data={dataProductos}
              modoSeleccion={modoSeleccion}
              productosSeleccionados={productosSeleccionados}
              onToggleSeleccion={toggleSeleccionProducto}
            />
          ) : (
            <TablaProductosInactivos data={dataProductosInactivos} />
          )}
        </TableContainer>
      </ContentCard>
    </Container>
  );
}

// Styles
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
  margin-bottom: 16px;
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
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-radius: 14px;

  svg {
    font-size: 26px;
    color: #0284c7;
  }
`;

const HeaderInfo = styled.div``;

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
    border-color: #0284c7;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
  }
`;

const ClearSearchBtn = styled.button`
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
  background: #0284c7;
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
    background: #0369a1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  flex-wrap: wrap;
  gap: 12px;
`;

const ToolbarLeft = styled.div`
  display: flex;
  gap: 8px;
`;

const ToolbarRight = styled.div`
  display: flex;
  gap: 8px;
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
  background: ${({ $active }) => ($active ? "#0284c7" : "#f8fafc")};
  color: ${({ $active }) => ($active ? "#fff" : "#64748b")};
  border: 1px solid ${({ $active }) => ($active ? "#0284c7" : "#e2e8f0")};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 18px; }

  &:hover {
    background: ${({ $active }) => ($active ? "#0284c7" : "#f1f5f9")};
    border-color: ${({ $active }) => ($active ? "#0284c7" : "#cbd5e1")};
  }
`;

const TabBadge = styled.span`
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $active }) => ($active ? "rgba(255,255,255,0.2)" : "#e2e8f0")};
  border-radius: 10px;
`;

const SelectModeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  background: ${({ $active }) => ($active ? "#fef2f2" : "#f8fafc")};
  color: ${({ $active }) => ($active ? "#dc2626" : "#64748b")};
  border: 1px solid ${({ $active }) => ($active ? "#fecaca" : "#e2e8f0")};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  svg { font-size: 16px; }

  &:hover {
    background: ${({ $active }) => ($active ? "#fee2e2" : "#f1f5f9")};
    border-color: ${({ $active }) => ($active ? "#fca5a5" : "#cbd5e1")};
  }
`;

const SelectionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #fbbf24;
  border-radius: 12px;
  flex-wrap: wrap;
  gap: 12px;
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #92400e;
  font-size: 14px;

  svg {
    font-size: 20px;
    color: #d97706;
  }
`;

const SelectionActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const SelectAllBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  background: #fff;
  color: #666;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 16px; }

  &:hover {
    background: #f5f5f5;
    border-color: #d5d5d5;
  }
`;

const DesactivarLoteBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  svg { font-size: 16px; }

  &:hover:not(:disabled) {
    background: #dc2626;
  }

  &:disabled {
    background: #fca5a5;
    cursor: not-allowed;
  }
`;

const ContentCard = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const TableContainer = styled.div`
  padding: 0;
`;
