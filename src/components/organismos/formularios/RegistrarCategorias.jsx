import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Icon } from "@iconify/react";
import { useForm } from "react-hook-form";
import { CirclePicker } from "react-color";
import { useMutation } from "@tanstack/react-query";
import { useCategoriasStore, ConvertirCapitalize } from "../../../index";
import { useEmpresaStore } from "../../../store/EmpresaStore";

export function RegistrarCategorias({
  onClose,
  dataSelect,
  accion,
  setIsExploding,
}) {
  const { insertarCategorias, editarCategoria } = useCategoriasStore();
  const { dataempresa } = useEmpresaStore();
  const [currentColor, setColor] = useState("#43a047");
  const [file, setFile] = useState([]);
  const ref = useRef(null);
  const [fileurl, setFileurl] = useState();
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm();

  const { isPending, mutate: doInsertar } = useMutation({
    mutationFn: insertar,
    mutationKey: "insertar categorias",
    onError: (err) => console.log("Error:", err.message),
    onSuccess: () => {
      onClose();
      setIsExploding(true);
    },
  });

  async function insertar(data) {
    if (accion === "Editar") {
      const p = {
        _nombre: ConvertirCapitalize(data.descripcion),
        _id_empresa: dataempresa.id,
        _color: currentColor,
        _id: dataSelect.id,
      };
      await editarCategoria(p, dataSelect.icono, file);
    } else {
      const p = {
        _nombre: ConvertirCapitalize(data.descripcion),
        _color: currentColor,
        _icono: "-",
        _id_empresa: dataempresa.id,
      };
      await insertarCategorias(p, file);
    }
  }

  function abrirImagenes() {
    ref.current.click();
  }

  function prepararImagen(e) {
    const filelocal = e.target.files;
    if (!filelocal || !filelocal.length) return;

    const fileReaderlocal = new FileReader();
    fileReaderlocal.readAsDataURL(filelocal[0]);
    setFile(filelocal[0]);

    fileReaderlocal.onload = function load() {
      setFileurl(fileReaderlocal.result);
    };
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = () => setFileurl(reader.result);
      reader.readAsDataURL(droppedFile);
    }
  }

  function removeImage() {
    setFileurl(null);
    setFile([]);
  }

  useEffect(() => {
    if (accion === "Editar") {
      setColor(dataSelect.color);
      setFileurl(dataSelect.icono);
    }
  }, [accion, dataSelect]);

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <ModalHeader>
          <HeaderInfo>
            <HeaderIcon $isEdit={accion === "Editar"}>
              <Icon icon={accion === "Editar" ? "lucide:pencil" : "lucide:plus"} />
            </HeaderIcon>
            <div>
              <ModalTitle>
                {accion === "Editar" ? "Editar Categoría" : "Nueva Categoría"}
              </ModalTitle>
              <ModalSubtitle>
                {accion === "Editar"
                  ? "Modifica los datos de la categoría"
                  : "Completa los datos para crear una categoría"}
              </ModalSubtitle>
            </div>
          </HeaderInfo>
          <CloseButton onClick={onClose}>
            <Icon icon="lucide:x" />
          </CloseButton>
        </ModalHeader>

        {/* Content */}
        <ModalContent>
          {isPending ? (
            <LoadingState>
              <Icon icon="lucide:loader" className="spin" />
              <span>Guardando...</span>
            </LoadingState>
          ) : (
            <Form onSubmit={handleSubmit(doInsertar)}>
              {/* Image Upload */}
              <FormGroup>
                <Label>
                  <Icon icon="lucide:image" />
                  Icono (opcional)
                </Label>
                <ImageUpload
                  $isDragging={isDragging}
                  $hasImage={fileurl && fileurl !== "-"}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={abrirImagenes}
                >
                  {fileurl && fileurl !== "-" ? (
                    <ImagePreview>
                      <img src={fileurl} alt="Preview" />
                      <RemoveImageButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage();
                        }}
                      >
                        <Icon icon="lucide:x" />
                      </RemoveImageButton>
                    </ImagePreview>
                  ) : (
                    <UploadPlaceholder>
                      <Icon icon="lucide:upload-cloud" />
                      <span>Arrastra una imagen o haz clic para seleccionar</span>
                    </UploadPlaceholder>
                  )}
                  <input
                    type="file"
                    ref={ref}
                    onChange={prepararImagen}
                    accept="image/*"
                  />
                </ImageUpload>
              </FormGroup>

              {/* Category Name */}
              <FormGroup>
                <Label>
                  <Icon icon="lucide:tag" />
                  Nombre de la categoría
                </Label>
                <InputWrapper $hasError={errors.descripcion}>
                  <Input
                    type="text"
                    placeholder="Ej: Bebidas, Lácteos, Snacks..."
                    defaultValue={dataSelect?.nombre}
                    {...register("descripcion", { required: true })}
                  />
                </InputWrapper>
                {errors.descripcion && (
                  <ErrorMessage>
                    <Icon icon="lucide:alert-circle" />
                    Este campo es requerido
                  </ErrorMessage>
                )}
              </FormGroup>

              {/* Color Picker */}
              <FormGroup>
                <Label>
                  <Icon icon="lucide:palette" />
                  Color de la categoría
                </Label>
                <ColorSection>
                  <ColorPreview $color={currentColor}>
                    <span>{currentColor}</span>
                  </ColorPreview>
                  <ColorPickerWrapper>
                    <CirclePicker
                      onChange={(color) => setColor(color.hex)}
                      color={currentColor}
                      colors={[
                        "#f44336", "#e91e63", "#9c27b0", "#673ab7",
                        "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
                        "#009688", "#43a047", "#8bc34a", "#cddc39",
                        "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
                        "#795548", "#607d8b"
                      ]}
                      circleSize={28}
                      circleSpacing={10}
                    />
                  </ColorPickerWrapper>
                </ColorSection>
              </FormGroup>

              {/* Actions */}
              <FormActions>
                <CancelButton type="button" onClick={onClose}>
                  Cancelar
                </CancelButton>
                <SubmitButton type="submit" disabled={isPending}>
                  <Icon icon={accion === "Editar" ? "lucide:check" : "lucide:plus"} />
                  {accion === "Editar" ? "Guardar Cambios" : "Crear Categoría"}
                </SubmitButton>
              </FormActions>
            </Form>
          )}
        </ModalContent>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 0 24px;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.$isEdit ? "#e3f2fd" : "#e8f5e9"};
  color: ${props => props.$isEdit ? "#1976d2" : "#43a047"};
  flex-shrink: 0;

  svg {
    font-size: 24px;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
`;

const ModalSubtitle = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 4px 0 0 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #f5f5f5;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e5e5e5;
    color: #1a1a2e;
  }

  svg {
    font-size: 20px;
  }
`;

const ModalContent = styled.div`
  padding: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;

  svg {
    font-size: 16px;
    color: #64748b;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  border: 2px solid ${props => props.$hasError ? "#ef4444" : "#e2e8f0"};
  border-radius: 12px;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${props => props.$hasError ? "#ef4444" : "#43a047"};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? "rgba(239, 68, 68, 0.1)" : "rgba(67, 160, 71, 0.1)"};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: 12px;
  font-size: 0.9375rem;
  color: #1a1a2e;
  background: transparent;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
  }
`;

const ErrorMessage = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: #ef4444;

  svg {
    font-size: 14px;
  }
`;

const ImageUpload = styled.div`
  border: 2px dashed ${props => props.$isDragging ? "#43a047" : props.$hasImage ? "#e2e8f0" : "#e2e8f0"};
  border-radius: 12px;
  background: ${props => props.$isDragging ? "rgba(67, 160, 71, 0.05)" : "#fafafa"};
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;

  &:hover {
    border-color: #43a047;
    background: rgba(67, 160, 71, 0.02);
  }

  input {
    display: none;
  }
`;

const UploadPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 20px;
  color: #64748b;

  svg {
    font-size: 32px;
    color: #94a3b8;
  }

  span {
    font-size: 0.875rem;
    text-align: center;
  }
`;

const ImagePreview = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;

  img {
    max-width: 120px;
    max-height: 120px;
    object-fit: contain;
    border-radius: 8px;
  }
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }

  svg {
    font-size: 14px;
  }
`;

const ColorSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ColorPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.$color}15;
  border: 2px solid ${props => props.$color};
  border-radius: 12px;

  &::before {
    content: "";
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${props => props.$color};
  }

  span {
    font-size: 0.875rem;
    font-weight: 500;
    color: ${props => props.$color};
    font-family: monospace;
    text-transform: uppercase;
  }
`;

const ColorPickerWrapper = styled.div`
  padding: 8px 0;

  .circle-picker {
    justify-content: flex-start !important;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 8px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 14px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1a1a2e;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  background: #43a047;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #388e3c;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    font-size: 18px;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: #64748b;

  .spin {
    font-size: 32px;
    color: #43a047;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  span {
    font-size: 0.9375rem;
  }
`;
