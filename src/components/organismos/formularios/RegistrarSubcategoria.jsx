import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { useSubcategoriasStore } from "../../../store/SubcategoriasStore";
import { useEmpresaStore } from "../../../index";
import { toast } from "sonner";

export function RegistrarSubcategoria({ onClose, categoriaParent, onSuccess }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState("#43a047");
  const [loading, setLoading] = useState(false);

  const { insertarSubcategoria } = useSubcategoriasStore();
  const { dataempresa } = useEmpresaStore();

  const coloresPreset = [
    "#43a047", "#1e88e5", "#8e24aa", "#f4511e", 
    "#fdd835", "#00acc1", "#6d4c41", "#546e7a"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (!categoriaParent?.id) {
      toast.error("Debe seleccionar una categoría padre");
      return;
    }

    setLoading(true);

    try {
      const resultado = await insertarSubcategoria({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        color,
        id_empresa: dataempresa.id,
        id_categoria_padre: categoriaParent.id,
      });

      if (resultado.exito) {
        toast.success(`Subcategoría "${nombre}" creada exitosamente`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(resultado.mensaje || "Error al crear subcategoría");
      }
    } catch (error) {
      toast.error(error.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderInfo>
            <IconWrapper>
              <Icon icon="lucide:folder-plus" />
            </IconWrapper>
            <div>
              <Title>Nueva Subcategoría</Title>
              <Subtitle>
                En: <strong>{categoriaParent?.nombre || "Sin selección"}</strong>
              </Subtitle>
            </div>
          </HeaderInfo>
          <CloseButton onClick={onClose}>
            <Icon icon="lucide:x" />
          </CloseButton>
        </Header>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Nombre de la subcategoría *</Label>
            <Input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Celulares, Laptops, Camisetas..."
              autoFocus
            />
          </FormGroup>

          <FormGroup>
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe brevemente esta subcategoría..."
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <Label>Color identificador</Label>
            <ColorPicker>
              {coloresPreset.map((c) => (
                <ColorOption
                  key={c}
                  $color={c}
                  $selected={color === c}
                  type="button"
                  onClick={() => setColor(c)}
                />
              ))}
              <ColorInputWrapper>
                <ColorInput
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </ColorInputWrapper>
            </ColorPicker>
          </FormGroup>

          <Preview>
            <PreviewLabel>Vista previa:</PreviewLabel>
            <PreviewChip $color={color}>
              <Icon icon="lucide:folder" />
              {nombre || "Nombre subcategoría"}
            </PreviewChip>
          </Preview>

          <ButtonGroup>
            <CancelButton type="button" onClick={onClose}>
              Cancelar
            </CancelButton>
            <SubmitButton type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Icon icon="lucide:loader-2" className="spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Icon icon="lucide:plus" />
                  Crear Subcategoría
                </>
              )}
            </SubmitButton>
          </ButtonGroup>
        </Form>
      </Modal>
    </Overlay>
  );
}

// Estilos
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #e8f5e9;
  border-radius: 10px;
  
  svg {
    font-size: 22px;
    color: #43a047;
  }
`;

const Title = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.8rem;
  color: #64748b;
  margin: 2px 0 0 0;
  
  strong {
    color: #43a047;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #64748b;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: #f1f5f9;
    color: #1a1a2e;
  }
  
  svg {
    font-size: 20px;
  }
`;

const Form = styled.form`
  padding: 24px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #43a047;
    box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.1);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #43a047;
    box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.1);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const ColorPicker = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const ColorOption = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${(props) => props.$color};
  border: 3px solid ${(props) => (props.$selected ? "#1a1a2e" : "transparent")};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const ColorInputWrapper = styled.div`
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px dashed #cbd5e1;
`;

const ColorInput = styled.input`
  position: absolute;
  width: 150%;
  height: 150%;
  top: -25%;
  left: -25%;
  cursor: pointer;
  border: none;
`;

const Preview = styled.div`
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 24px;
`;

const PreviewLabel = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  display: block;
  margin-bottom: 8px;
`;

const PreviewChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: ${(props) => props.$color}15;
  color: ${(props) => props.$color};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid ${(props) => props.$color}30;
  
  svg {
    font-size: 16px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 12px 20px;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e2e8f0;
    color: #1a1a2e;
  }
`;

const SubmitButton = styled.button`
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
  transition: all 0.2s;
  
  svg {
    font-size: 18px;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  &:hover:not(:disabled) {
    background: #388e3c;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
