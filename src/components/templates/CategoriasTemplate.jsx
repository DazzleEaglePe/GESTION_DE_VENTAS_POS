import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import { useCategoriasStore, useEmpresaStore } from "../../index";
import { useSubcategoriasStore } from "../../store/SubcategoriasStore";
import { RegistrarCategorias } from "../organismos/formularios/RegistrarCategorias";
import { RegistrarSubcategoria } from "../organismos/formularios/RegistrarSubcategoria";
import ConfettiExplosion from "react-confetti-explosion";
import Swal from "sweetalert2";

export function CategoriasTemplate() {
  const [openRegistro, setOpenRegistro] = useState(false);
  const [openSubcategoria, setOpenSubcategoria] = useState(false);
  const [categoriaParaSubcategoria, setCategoriaParaSubcategoria] = useState(null);
  const { datacategorias, setBuscador, buscador, eliminarCategoria, validarEliminarCategoria, mostrarCategorias } = useCategoriasStore();
  const { dataempresa } = useEmpresaStore();
  const { obtenerCategoriasJerarquicas, arbolCategorias } = useSubcategoriasStore();
  const [accion, setAccion] = useState("");
  const [dataSelect, setDataSelect] = useState([]);
  const [isExploding, setIsExploding] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  // Cargar jerarquía de categorías
  useEffect(() => {
    if (dataempresa?.id) {
      obtenerCategoriasJerarquicas({ id_empresa: dataempresa.id });
    }
  }, [dataempresa?.id, datacategorias]);

  function nuevoRegistro() {
    setOpenRegistro(true);
    setAccion("Nuevo");
    setDataSelect([]);
    setIsExploding(false);
  }

  function editarCategoria(item) {
    if (item.nombre === "General") {
      Swal.fire({
        title: "Acción no permitida",
        text: "Esta categoría es un valor por defecto y no puede modificarse.",
        icon: "warning",
        confirmButtonColor: "#111",
      });
      return;
    }
    setOpenRegistro(true);
    setDataSelect(item);
    setAccion("Editar");
  }

  async function eliminar(p) {
    if (p.nombre === "General") {
      Swal.fire({
        title: "Acción no permitida",
        text: "Esta categoría es un valor por defecto y no puede modificarse.",
        icon: "warning",
        confirmButtonColor: "#111",
      });
      return;
    }

    // Verificar si tiene subcategorías
    if (p.hijos && p.hijos.length > 0) {
      Swal.fire({
        title: "No se puede eliminar",
        html: `
          <p>Esta categoría tiene <strong>${p.hijos.length}</strong> subcategoría(s).</p>
          <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
            Debe eliminar o mover las subcategorías primero.
          </p>
        `,
        icon: "warning",
        confirmButtonColor: "#111",
      });
      return;
    }

    try {
      const validacion = await validarEliminarCategoria({ id: p.id });

      if (validacion?.productos_asociados > 0) {
        Swal.fire({
          title: "No se puede eliminar",
          html: `
            <p>Esta categoría tiene <strong>${validacion.productos_asociados}</strong> producto(s) asociado(s).</p>
            <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
              Debe reasignar o eliminar los productos antes de poder eliminar esta categoría.
            </p>
          `,
          icon: "warning",
          confirmButtonColor: "#111",
        });
        return;
      }

      const result = await Swal.fire({
        title: "¿Eliminar categoría?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        const resultado = await eliminarCategoria({ id: p.id, icono: p.icono });

        if (resultado.exito) {
          Swal.fire({
            icon: "success",
            title: "Eliminado",
            text: resultado.mensaje,
            timer: 2000,
            showConfirmButton: false,
          });
          // Refrescar jerarquía
          obtenerCategoriasJerarquicas({ id_empresa: dataempresa.id });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: resultado.mensaje,
          });
        }
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Ocurrió un error al procesar la solicitud",
      });
    }
  }

  function abrirModalSubcategoria(categoria) {
    setCategoriaParaSubcategoria(categoria);
    setOpenSubcategoria(true);
  }

  function toggleExpand(id) {
    setExpandedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  function expandirTodos() {
    const expanded = {};
    const expandRecursive = (categorias) => {
      categorias?.forEach(cat => {
        if (cat.hijos && cat.hijos.length > 0) {
          expanded[cat.id] = true;
          expandRecursive(cat.hijos);
        }
      });
    };
    expandRecursive(arbolCategorias);
    setExpandedCategories(expanded);
  }

  function colapsarTodos() {
    setExpandedCategories({});
  }

  // Filtrar categorías por búsqueda (buscar en toda la jerarquía)
  const filtrarCategorias = (categorias, termino) => {
    if (!termino) return categorias;
    
    const buscar = termino.toLowerCase();
    const resultados = [];
    
    const buscarRecursivo = (cats) => {
      cats?.forEach(cat => {
        if (cat.nombre.toLowerCase().includes(buscar)) {
          resultados.push({ ...cat, hijos: [] }); // Sin hijos para búsqueda plana
        }
        if (cat.hijos && cat.hijos.length > 0) {
          buscarRecursivo(cat.hijos);
        }
      });
    };
    
    buscarRecursivo(categorias);
    return resultados;
  };

  // Usar árbol si no hay búsqueda, sino mostrar lista plana filtrada
  const usarArbol = !buscador && arbolCategorias?.length > 0;
  const categoriasAMostrar = usarArbol 
    ? arbolCategorias 
    : filtrarCategorias(arbolCategorias, buscador);

  // Componente recursivo para renderizar categorías
  const renderCategoria = (categoria, nivel = 0) => {
    const tieneHijos = categoria.hijos && categoria.hijos.length > 0;
    const estaExpandido = expandedCategories[categoria.id];
    const esSubcategoria = nivel > 0;

    return (
      <CategoriaItem key={categoria.id} $nivel={nivel}>
        <CategoriaRow $esSubcategoria={esSubcategoria}>
          <CategoriaLeft>
            {tieneHijos ? (
              <ExpandButton onClick={() => toggleExpand(categoria.id)}>
                <Icon icon={estaExpandido ? "lucide:chevron-down" : "lucide:chevron-right"} />
              </ExpandButton>
            ) : (
              <ExpandPlaceholder />
            )}
            
            <CategoriaIcono $color={categoria.color} $esSubcategoria={esSubcategoria}>
              {categoria.icono && categoria.icono !== "-" ? (
                <img src={categoria.icono} alt={categoria.nombre} />
              ) : (
                <Icon icon={esSubcategoria ? "lucide:folder" : "lucide:folders"} />
              )}
            </CategoriaIcono>
            
            <CategoriaInfo>
              <CategoriaNombre $esSubcategoria={esSubcategoria}>
                {categoria.nombre}
              </CategoriaNombre>
              {tieneHijos && (
                <CategoriaContador>
                  {categoria.hijos.length} subcategoría{categoria.hijos.length !== 1 ? "s" : ""}
                </CategoriaContador>
              )}
              {esSubcategoria && !tieneHijos && (
                <CategoriaContador>Subcategoría</CategoriaContador>
              )}
            </CategoriaInfo>
          </CategoriaLeft>

          <CategoriaAcciones>
            <AccionBtn 
              $color="#43a047" 
              title="Agregar subcategoría"
              onClick={() => abrirModalSubcategoria(categoria)}
            >
              <Icon icon="lucide:folder-plus" />
            </AccionBtn>
            <AccionBtn 
              $color="#1e88e5" 
              title="Editar"
              onClick={() => editarCategoria(categoria)}
            >
              <Icon icon="lucide:pencil" />
            </AccionBtn>
            <AccionBtn 
              $color="#ef4444" 
              title="Eliminar"
              onClick={() => eliminar(categoria)}
            >
              <Icon icon="lucide:trash-2" />
            </AccionBtn>
          </CategoriaAcciones>
        </CategoriaRow>

        {tieneHijos && estaExpandido && (
          <SubcategoriasContainer>
            {categoria.hijos.map(hijo => renderCategoria(hijo, nivel + 1))}
          </SubcategoriasContainer>
        )}
      </CategoriaItem>
    );
  };

  const handleRefresh = async () => {
    await mostrarCategorias({ id_empresa: dataempresa.id });
    await obtenerCategoriasJerarquicas({ id_empresa: dataempresa.id });
  };

  return (
    <Container>
      {openRegistro && (
        <RegistrarCategorias
          setIsExploding={setIsExploding}
          onClose={() => {
            setOpenRegistro(false);
            handleRefresh();
          }}
          dataSelect={dataSelect}
          accion={accion}
        />
      )}

      {openSubcategoria && (
        <RegistrarSubcategoria
          onClose={() => setOpenSubcategoria(false)}
          categoriaParent={categoriaParaSubcategoria}
          onSuccess={() => {
            handleRefresh();
            setIsExploding(true);
          }}
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

      {/* Toolbar */}
      <Toolbar>
        <ToolbarLeft>
          <ToolbarBtn onClick={expandirTodos} title="Expandir todos">
            <Icon icon="lucide:unfold-vertical" />
            <span>Expandir</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={colapsarTodos} title="Colapsar todos">
            <Icon icon="lucide:fold-vertical" />
            <span>Colapsar</span>
          </ToolbarBtn>
        </ToolbarLeft>
        <ToolbarRight>
          <LeyendaItem>
            <Icon icon="lucide:folder-plus" />
            <span>Agregar sub</span>
          </LeyendaItem>
        </ToolbarRight>
      </Toolbar>

      {/* Content */}
      <Content>
        {categoriasAMostrar.length === 0 ? (
          <EmptyState>
            <Icon icon="lucide:folder-open" />
            <h3>{buscador ? "Sin resultados" : "No hay categorías"}</h3>
            <p>{buscador ? `No se encontraron categorías con "${buscador}"` : "Crea tu primera categoría para comenzar"}</p>
          </EmptyState>
        ) : (
          <CategoriasLista>
            {categoriasAMostrar.map(cat => renderCategoria(cat, 0))}
          </CategoriasLista>
        )}
      </Content>
    </Container>
  );
}

// Estilos
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

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
`;

const ToolbarLeft = styled.div`
  display: flex;
  gap: 8px;
`;

const ToolbarRight = styled.div`
  display: flex;
  gap: 16px;
`;

const ToolbarBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  
  svg {
    font-size: 14px;
  }
  
  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #1a1a2e;
  }
`;

const LeyendaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #64748b;
  
  svg {
    font-size: 14px;
    color: #43a047;
  }
`;

const Content = styled.div`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
`;

const CategoriasLista = styled.div`
  padding: 8px;
`;

const CategoriaItem = styled.div`
  margin-left: ${props => props.$nivel * 24}px;
`;

const CategoriaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  transition: background 0.2s;
  background: ${props => props.$esSubcategoria ? '#fafafa' : 'transparent'};
  
  &:hover {
    background: ${props => props.$esSubcategoria ? '#f1f5f9' : '#f8fafc'};
  }
`;

const CategoriaLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #f1f5f9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  svg {
    font-size: 16px;
    color: #64748b;
  }
  
  &:hover {
    background: #e2e8f0;
  }
`;

const ExpandPlaceholder = styled.div`
  width: 28px;
`;

const CategoriaIcono = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$esSubcategoria ? '36px' : '42px'};
  height: ${props => props.$esSubcategoria ? '36px' : '42px'};
  background: ${props => props.$color ? `${props.$color}15` : '#f1f5f9'};
  border-radius: 10px;
  border: 1px solid ${props => props.$color ? `${props.$color}30` : '#e2e8f0'};
  
  img {
    width: ${props => props.$esSubcategoria ? '22px' : '28px'};
    height: ${props => props.$esSubcategoria ? '22px' : '28px'};
    object-fit: cover;
    border-radius: 6px;
  }
  
  svg {
    font-size: ${props => props.$esSubcategoria ? '16px' : '20px'};
    color: ${props => props.$color || '#64748b'};
  }
`;

const CategoriaInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const CategoriaNombre = styled.span`
  font-weight: ${props => props.$esSubcategoria ? '400' : '500'};
  color: #1a1a2e;
  font-size: ${props => props.$esSubcategoria ? '0.9rem' : '0.95rem'};
`;

const CategoriaContador = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
`;

const CategoriaAcciones = styled.div`
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${CategoriaRow}:hover & {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    opacity: 1;
  }
`;

const AccionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: ${props => `${props.$color}10`};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  svg {
    font-size: 16px;
    color: ${props => props.$color};
  }
  
  &:hover {
    background: ${props => `${props.$color}20`};
    transform: scale(1.05);
  }
`;

const SubcategoriasContainer = styled.div`
  border-left: 2px solid #e2e8f0;
  margin-left: 14px;
  padding-left: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  
  svg {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  h3 {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0 0 8px 0;
    color: #1a1a2e;
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;
