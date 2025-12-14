import { useState, useEffect } from "react";
import styled from "styled-components";
import {
  ConvertirCapitalize,
  useClientesProveedoresStore,
} from "../../../index";
import { useForm } from "react-hook-form";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import Swal from "sweetalert2";

export function RegistrarClientesProveedores({
  onClose,
  dataSelect,
  accion,
  setIsExploding,
}) {
  const { insertarCliPro, editarCliPro, tipo, selectCliPro } = useClientesProveedoresStore();
  const { dataempresa } = useEmpresaStore();
  
  // Determinar tipo de persona basado en datos existentes
  const detectarTipoPersona = () => {
    if (dataSelect?.identificador_fiscal && dataSelect.identificador_fiscal.length === 11) {
      return "empresa";
    }
    return "persona";
  };
  
  const [tipoPersona, setTipoPersona] = useState(detectarTipoPersona());
  const [documentoBusqueda, setDocumentoBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [datosEncontrados, setDatosEncontrados] = useState(false);

  const {
    register,
    formState: { errors, isDirty },
    handleSubmit,
    setValue,
    reset,
    watch,
  } = useForm({
    defaultValues: {
      nombres: dataSelect?.nombres || "",
      direccion: dataSelect?.direccion || "",
      telefono: dataSelect?.telefono || "",
      email: dataSelect?.email || "",
      identificador_nacional: dataSelect?.identificador_nacional || "",
      identificador_fiscal: dataSelect?.identificador_fiscal || "",
    },
  });

  // Verificar si hay cambios sin guardar
  const tienesCambiosSinGuardar = () => {
    const valores = watch();
    // Verificar si algún campo tiene datos
    return isDirty || 
      documentoBusqueda.length > 0 ||
      valores.nombres?.length > 0 ||
      valores.direccion?.length > 0 ||
      valores.telefono?.length > 0 ||
      valores.email?.length > 0 ||
      valores.identificador_nacional?.length > 0 ||
      valores.identificador_fiscal?.length > 0;
  };

  // Función para manejar el cierre con confirmación
  const handleCerrarConConfirmacion = async () => {
    if (tienesCambiosSinGuardar()) {
      const result = await Swal.fire({
        title: '¿Salir sin guardar?',
        text: 'Tienes cambios sin guardar. Si sales ahora, perderás la información ingresada.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#111',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Seguir editando',
        reverseButtons: true,
      });
      
      if (result.isConfirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Token de Decolecta (https://decolecta.com)
  const API_TOKEN = "sk_12031.q9OJ2tjOoSoC0DJf08alYyCDA9UCHMCg";
  const API_BASE = "https://api.decolecta.com/v1";
  const CORS_PROXY = "https://corsproxy.io/?";

  // Limpiar formulario al cambiar tipo de persona
  const handleTipoPersonaChange = (nuevoTipo) => {
    if (nuevoTipo !== tipoPersona) {
      setTipoPersona(nuevoTipo);
      setDocumentoBusqueda("");
      setDatosEncontrados(false);
      reset({
        nombres: "",
        direccion: "",
        telefono: "",
        email: "",
        identificador_nacional: "",
        identificador_fiscal: "",
      });
    }
  };

  const handleBuscar = () => {
    if (tipoPersona === "persona") {
      buscarPorDNI();
    } else {
      buscarPorRUC();
    }
  };

  // Función para buscar por DNI - Persona Natural
  const buscarPorDNI = async () => {
    const dni = documentoBusqueda.trim();
    if (!dni || dni.length !== 8) {
      toast.error("El DNI debe tener 8 dígitos");
      return;
    }
    
    setBuscando(true);
    try {
      const apiUrl = `${API_BASE}/reniec/dni?numero=${dni}`;
      const response = await fetch(CORS_PROXY + encodeURIComponent(apiUrl), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${API_TOKEN}`,
        },
      });
      
      const data = await response.json();
      
      if (data.first_name) {
        const nombreCompleto = data.full_name || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`;
        setValue("nombres", nombreCompleto);
        setValue("identificador_nacional", dni);
        setValue("identificador_fiscal", ""); // Limpiar RUC
        setDatosEncontrados(true);
        toast.success("✓ Persona encontrada");
      } else {
        toast.error(data.error || data.message || "No se encontró información");
        setDatosEncontrados(false);
      }
    } catch (error) {
      console.error("Error DNI:", error);
      toast.error("Error de conexión. Ingresa los datos manualmente.");
      setDatosEncontrados(false);
    } finally {
      setBuscando(false);
    }
  };

  // Función para buscar por RUC - Empresa
  const buscarPorRUC = async () => {
    const ruc = documentoBusqueda.trim();
    if (!ruc || ruc.length !== 11) {
      toast.error("El RUC debe tener 11 dígitos");
      return;
    }
    
    setBuscando(true);
    try {
      const apiUrl = `${API_BASE}/sunat/ruc?numero=${ruc}`;
      const response = await fetch(CORS_PROXY + encodeURIComponent(apiUrl), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${API_TOKEN}`,
        },
      });
      
      const data = await response.json();
      console.log("RUC Response:", data);
      
      if (data.razon_social || data.razonSocial || data.nombre_o_razon_social) {
        const razonSocial = data.razon_social || data.razonSocial || data.nombre_o_razon_social;
        const direccion = data.direccion || data.direccion_completa || data.domicilio_fiscal || "";
        
        setValue("nombres", razonSocial);
        setValue("direccion", direccion);
        setValue("identificador_fiscal", ruc);
        setValue("identificador_nacional", ""); // Limpiar DNI
        setDatosEncontrados(true);
        toast.success("✓ Empresa encontrada");
      } else {
        toast.error(data.error || data.message || "No se encontró información");
        setDatosEncontrados(false);
      }
    } catch (error) {
      console.error("Error RUC:", error);
      toast.error("Error de conexión. Ingresa los datos manualmente.");
      setDatosEncontrados(false);
    } finally {
      setBuscando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBuscar();
    }
  };

  const { isPending, mutate: doInsertar } = useMutation({
    mutationFn: insertar,
    mutationKey: "insertar clientes proveedores mutation",
    onError: (err) => toast.error(`Error: ${err.message}`),
    onSuccess: () => {
      toast.success(accion === "Editar" ? "Actualizado correctamente" : "Registrado correctamente");
      cerrarFormulario();
    },
  });

  const handlesub = (data) => {
    doInsertar(data);
  };

  const cerrarFormulario = () => {
    onClose();
    setIsExploding?.(true);
  };

  async function insertar(data) {
    // Generar identificador único para evitar duplicados con campos vacíos
    const uniqueId = `NA-${Date.now()}`;
    
    if (accion === "Editar") {
      const p = {
        _id: dataSelect.id,
        _nombres: ConvertirCapitalize(data.nombres),
        _id_empresa: dataempresa?.id,
        _direccion: data.direccion || "",
        _telefono: data.telefono || "",
        _email: data.email || "",
        _identificador_nacional: tipoPersona === "persona" ? data.identificador_nacional : uniqueId,
        _identificador_fiscal: tipoPersona === "empresa" ? data.identificador_fiscal : uniqueId,
        _tipo: tipo,
      };
      await editarCliPro(p);
    } else {
      const p = {
        _nombres: ConvertirCapitalize(data.nombres),
        _id_empresa: dataempresa?.id,
        _direccion: data.direccion || "",
        _telefono: data.telefono || "",
        _email: data.email || "",
        _identificador_nacional: tipoPersona === "persona" ? data.identificador_nacional : uniqueId,
        _identificador_fiscal: tipoPersona === "empresa" ? data.identificador_fiscal : uniqueId,
        _tipo: tipo,
      };
      await insertarCliPro(p);
      
      // Auto-seleccionar el cliente recién creado (crear objeto local)
      const nuevoCliente = {
        nombres: ConvertirCapitalize(data.nombres),
        direccion: data.direccion || "",
        telefono: data.telefono || "",
        email: data.email || "",
        identificador_nacional: tipoPersona === "persona" ? data.identificador_nacional : "",
        identificador_fiscal: tipoPersona === "empresa" ? data.identificador_fiscal : "",
      };
      selectCliPro(nuevoCliente);
    }
  }

  return (
    <Overlay onClick={handleCerrarConConfirmacion}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <ModalHeader>
          <HeaderTitle>
            <HeaderIcon>
              <Icon icon="lucide:user-plus" width="20" />
            </HeaderIcon>
            <span>{accion === "Editar" ? `Editar ${tipo}` : `Nuevo ${tipo}`}</span>
          </HeaderTitle>
          <CloseButton onClick={handleCerrarConConfirmacion}>
            <Icon icon="lucide:x" width="20" />
          </CloseButton>
        </ModalHeader>

        {/* Selector de tipo de persona */}
        <TipoPersonaSection>
          <TipoPersonaContainer>
            <TipoPersonaOption 
              $active={tipoPersona === "persona"}
              onClick={() => handleTipoPersonaChange("persona")}
            >
              <TipoPersonaIcon $active={tipoPersona === "persona"}>
                <Icon icon="lucide:user" width="20" />
              </TipoPersonaIcon>
              <TipoPersonaInfo>
                <TipoPersonaTitle>Persona Natural</TipoPersonaTitle>
                <TipoPersonaDesc>DNI - 8 dígitos</TipoPersonaDesc>
              </TipoPersonaInfo>
              {tipoPersona === "persona" && (
                <TipoPersonaCheck>
                  <Icon icon="lucide:check" width="16" />
                </TipoPersonaCheck>
              )}
            </TipoPersonaOption>

            <TipoPersonaOption 
              $active={tipoPersona === "empresa"}
              onClick={() => handleTipoPersonaChange("empresa")}
            >
              <TipoPersonaIcon $active={tipoPersona === "empresa"}>
                <Icon icon="lucide:building-2" width="20" />
              </TipoPersonaIcon>
              <TipoPersonaInfo>
                <TipoPersonaTitle>Empresa</TipoPersonaTitle>
                <TipoPersonaDesc>RUC - 11 dígitos</TipoPersonaDesc>
              </TipoPersonaInfo>
              {tipoPersona === "empresa" && (
                <TipoPersonaCheck>
                  <Icon icon="lucide:check" width="16" />
                </TipoPersonaCheck>
              )}
            </TipoPersonaOption>
          </TipoPersonaContainer>
        </TipoPersonaSection>

        {/* Búsqueda por documento */}
        <SearchSection>
          <SearchGroup>
            <SearchInputWrapper>
              <SearchInputIcon>
                <Icon icon={tipoPersona === "persona" ? "lucide:id-card" : "lucide:building"} width="16" />
              </SearchInputIcon>
              <SearchInput
                type="text"
                value={documentoBusqueda}
                onChange={(e) => setDocumentoBusqueda(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                placeholder={tipoPersona === "persona" ? "Buscar por DNI..." : "Buscar por RUC..."}
                maxLength={tipoPersona === "persona" ? 8 : 11}
              />
              {documentoBusqueda && (
                <SearchCounter $complete={
                  (tipoPersona === "persona" && documentoBusqueda.length === 8) ||
                  (tipoPersona === "empresa" && documentoBusqueda.length === 11)
                }>
                  {documentoBusqueda.length}/{tipoPersona === "persona" ? 8 : 11}
                </SearchCounter>
              )}
            </SearchInputWrapper>
            <SearchButton 
              type="button" 
              onClick={handleBuscar}
              disabled={buscando || !documentoBusqueda || 
                (tipoPersona === "persona" && documentoBusqueda.length !== 8) ||
                (tipoPersona === "empresa" && documentoBusqueda.length !== 11)
              }
            >
              {buscando ? (
                <Icon icon="lucide:loader-2" width="18" className="spin" />
              ) : (
                <Icon icon="lucide:search" width="18" />
              )}
            </SearchButton>
          </SearchGroup>
          <SearchHint>
            <Icon icon="lucide:info" width="12" />
            Ingresa el {tipoPersona === "persona" ? "DNI" : "RUC"} y presiona Enter para autocompletar
          </SearchHint>
        </SearchSection>

        {/* Form */}
        <Form onSubmit={handleSubmit(handlesub)}>
          {/* Datos según tipo de persona */}
          <FormSection>
            <SectionTitle>
              <Icon icon={tipoPersona === "persona" ? "lucide:user" : "lucide:building-2"} width="14" />
              {tipoPersona === "persona" ? "Datos de la persona" : "Datos de la empresa"}
            </SectionTitle>

            {tipoPersona === "persona" ? (
              /* PERSONA NATURAL */
              <FormGrid>
                <InputGroup>
                  <Label>
                    <Icon icon="lucide:id-card" width="12" />
                    DNI *
                  </Label>
                  <InputWrapper $hasError={errors.identificador_nacional} $success={datosEncontrados}>
                    <Input
                      type="text"
                      placeholder="12345678"
                      maxLength={8}
                      {...register("identificador_nacional", { 
                        required: tipoPersona === "persona",
                        minLength: 8,
                        maxLength: 8 
                      })}
                    />
                    {datosEncontrados && (
                      <InputIcon $success>
                        <Icon icon="lucide:check-circle" width="16" />
                      </InputIcon>
                    )}
                  </InputWrapper>
                  {errors.identificador_nacional && <ErrorText>DNI requerido (8 dígitos)</ErrorText>}
                </InputGroup>

                <InputGroup>
                  <Label>
                    <Icon icon="lucide:phone" width="12" />
                    Teléfono
                  </Label>
                  <InputWrapper>
                    <Input
                      type="text"
                      placeholder="999 999 999"
                      {...register("telefono")}
                    />
                  </InputWrapper>
                </InputGroup>

                <InputGroup $fullWidth>
                  <Label>
                    <Icon icon="lucide:user" width="12" />
                    Nombre completo *
                  </Label>
                  <InputWrapper $hasError={errors.nombres} $success={datosEncontrados}>
                    <Input
                      type="text"
                      placeholder="Nombres y apellidos"
                      {...register("nombres", { required: true })}
                    />
                  </InputWrapper>
                  {errors.nombres && <ErrorText>Campo requerido</ErrorText>}
                </InputGroup>

                <InputGroup $fullWidth>
                  <Label>
                    <Icon icon="lucide:mail" width="12" />
                    Email
                  </Label>
                  <InputWrapper>
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      {...register("email")}
                    />
                  </InputWrapper>
                </InputGroup>
              </FormGrid>
            ) : (
              /* EMPRESA */
              <FormGrid>
                <InputGroup>
                  <Label>
                    <Icon icon="lucide:hash" width="12" />
                    RUC *
                  </Label>
                  <InputWrapper $hasError={errors.identificador_fiscal} $success={datosEncontrados}>
                    <Input
                      type="text"
                      placeholder="20123456789"
                      maxLength={11}
                      {...register("identificador_fiscal", { 
                        required: tipoPersona === "empresa",
                        minLength: 11,
                        maxLength: 11 
                      })}
                    />
                    {datosEncontrados && (
                      <InputIcon $success>
                        <Icon icon="lucide:check-circle" width="16" />
                      </InputIcon>
                    )}
                  </InputWrapper>
                  {errors.identificador_fiscal && <ErrorText>RUC requerido (11 dígitos)</ErrorText>}
                </InputGroup>

                <InputGroup>
                  <Label>
                    <Icon icon="lucide:phone" width="12" />
                    Teléfono
                  </Label>
                  <InputWrapper>
                    <Input
                      type="text"
                      placeholder="01 234 5678"
                      {...register("telefono")}
                    />
                  </InputWrapper>
                </InputGroup>

                <InputGroup $fullWidth>
                  <Label>
                    <Icon icon="lucide:building-2" width="12" />
                    Razón Social *
                  </Label>
                  <InputWrapper $hasError={errors.nombres} $success={datosEncontrados}>
                    <Input
                      type="text"
                      placeholder="Nombre de la empresa"
                      {...register("nombres", { required: true })}
                    />
                  </InputWrapper>
                  {errors.nombres && <ErrorText>Campo requerido</ErrorText>}
                </InputGroup>

                <InputGroup $fullWidth>
                  <Label>
                    <Icon icon="lucide:map-pin" width="12" />
                    Dirección fiscal
                  </Label>
                  <InputWrapper $success={datosEncontrados && watch("direccion")}>
                    <Input
                      type="text"
                      placeholder="Dirección completa"
                      {...register("direccion")}
                    />
                  </InputWrapper>
                </InputGroup>

                <InputGroup $fullWidth>
                  <Label>
                    <Icon icon="lucide:mail" width="12" />
                    Email
                  </Label>
                  <InputWrapper>
                    <Input
                      type="email"
                      placeholder="empresa@ejemplo.com"
                      {...register("email")}
                    />
                  </InputWrapper>
                </InputGroup>
              </FormGrid>
            )}
          </FormSection>

          {/* Actions */}
          <FormActions>
            <CancelButton type="button" onClick={handleCerrarConConfirmacion}>
              Cancelar
            </CancelButton>
            <SubmitButton type="submit" disabled={isPending}>
              {isPending ? (
                <Icon icon="lucide:loader-2" width="18" className="spin" />
              ) : (
                <>
                  <Icon icon="lucide:check" width="18" />
                  {accion === "Editar" ? "Actualizar" : "Guardar"}
                </>
              )}
            </SubmitButton>
          </FormActions>
        </Form>
      </Modal>
    </Overlay>
  );
}

/* Styled Components - Minimalista */
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #111;
`;

const HeaderIcon = styled.div`
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover {
    background: #f5f5f5;
    color: #111;
  }
`;

/* Tipo Persona Section - NEW */
const TipoPersonaSection = styled.div`
  padding: 16px 24px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
`;

const TipoPersonaContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const TipoPersonaOption = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: ${props => props.$active ? '#111' : '#fff'};
  border: 1px solid ${props => props.$active ? '#111' : '#e5e5e5'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  color: ${props => props.$active ? '#fff' : '#111'};
  
  &:hover {
    border-color: ${props => props.$active ? '#111' : '#ccc'};
  }
`;

const TipoPersonaIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${props => props.$active ? 'rgba(255,255,255,0.15)' : '#f5f5f5'};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$active ? '#fff' : '#666'};
  flex-shrink: 0;
`;

const TipoPersonaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const TipoPersonaTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: inherit;
`;

const TipoPersonaDesc = styled.span`
  font-size: 11px;
  opacity: 0.7;
`;

const TipoPersonaCheck = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
`;

/* Search Section */
const SearchSection = styled.div`
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SearchGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const SearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInputIcon = styled.div`
  position: absolute;
  left: 12px;
  color: #888;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const SearchCounter = styled.span`
  position: absolute;
  right: 12px;
  font-size: 11px;
  font-weight: 500;
  color: ${props => props.$complete ? '#22c55e' : '#aaa'};
  transition: color 0.15s;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 50px 0 40px;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  background: #fafafa;
  font-size: 14px;
  color: #111;
  outline: none;
  transition: all 0.15s;
  
  &:focus {
    border-color: #111;
    background: #fff;
  }
  
  &::placeholder {
    color: #aaa;
  }
`;

const SearchButton = styled.button`
  width: 48px;
  height: 44px;
  border: none;
  background: #111;
  color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  
  &:hover:not(:disabled) {
    background: #000;
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SearchHint = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #999;
`;

/* Form */
const Form = styled.form`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  ${props => props.$fullWidth && `
    grid-column: span 2;
  `}
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  border: 1px solid ${props => props.$hasError ? '#ef4444' : props.$success ? '#22c55e' : '#e5e5e5'};
  border-radius: 10px;
  background: ${props => props.$success ? '#f0fdf4' : '#fff'};
  transition: all 0.15s;
  
  &:focus-within {
    border-color: ${props => props.$hasError ? '#ef4444' : '#111'};
    background: #fff;
  }
`;

const Input = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #111;
  outline: none;
  border-radius: 10px;
  
  &::placeholder {
    color: #bbb;
  }
`;

const InputIcon = styled.div`
  position: absolute;
  right: 12px;
  color: ${props => props.$success ? '#22c55e' : '#888'};
  display: flex;
  align-items: center;
`;

const ErrorText = styled.span`
  font-size: 11px;
  color: #ef4444;
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #eee;
  margin-top: auto;
`;

const CancelButton = styled.button`
  flex: 1;
  height: 44px;
  border: 1px solid #eee;
  background: #fff;
  color: #666;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover {
    border-color: #ddd;
    background: #fafafa;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  height: 44px;
  border: none;
  background: #111;
  color: #fff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;
  
  &:hover:not(:disabled) {
    background: #000;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;
