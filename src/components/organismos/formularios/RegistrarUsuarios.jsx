import styled from "styled-components";
import { useEffect, useState } from "react";
import {
  InputText,
  useSucursalesStore,
  useEmpresaStore,
  useUsuariosStore,
  Device,
} from "../../../index";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCajasStore } from "../../../store/CajasStore";
import { Icon } from "@iconify/react/dist/iconify.js";
import { SelectList } from "../../ui/lists/SelectList";
import { BarLoader } from "react-spinners";
import { PermisosUser } from "../UsuariosDesign/PermisosUser";
import { useRolesStore } from "../../../store/RolesStore";
import { useAsignacionCajaSucursalStore } from "../../../store/AsignacionCajaSucursalStore";
import Swal from "sweetalert2";
export function RegistrarUsuarios({ accion, dataSelect, onClose }) {
  const queryClient = useQueryClient();
  const [editandoAsignacion, setEditandoAsignacion] = useState(false);
  const {
    cajaSelectItem,
    mostrarCajaXSucursal,
    setCajaSelectItem,
  } = useCajasStore();
  const { insertarUsuario, itemSelect, editarUsuarios } = useUsuariosStore();
  const { dataempresa } = useEmpresaStore();
  const { mostrarSucursales, sucursalesItemSelect, selectSucursal } =
    useSucursalesStore();
  const { rolesItemSelect } = useRolesStore();
  const { verificarCajaAbiertaUsuario, actualizarAsignacionUsuario } = useAsignacionCajaSucursalStore();
  const { data: dataSucursales, isLoading: isloadingSucursales } = useQuery({
    queryKey: ["mostrar sucursales", { id_empresa: dataempresa?.id }],
    queryFn: () => mostrarSucursales({ id_empresa: dataempresa?.id }),
    enabled: !!dataempresa,
  });
  const { data: dataCaja, isLoading: isloadingCajas } = useQuery({
    queryKey: [
      "mostrar caja por sucursal",
      { id_sucursal: sucursalesItemSelect?.id },
    ],
    queryFn: () =>
      mostrarCajaXSucursal({ id_sucursal: sucursalesItemSelect?.id }),
    enabled: !!sucursalesItemSelect?.id, // Validar que id existe y no es undefined
  });
  const {
    register,
    formState: { errors, isDirty },
    handleSubmit,
  } = useForm({
    defaultValues: {
      nombres: itemSelect?.usuario || "",
      email: itemSelect?.email || "",
      nro_doc: itemSelect?.nro_doc || "",
      telefono: itemSelect?.telefono || "",
      pass: "",
    },
  });

  // Inicializar sucursal y caja cuando se edita un usuario
  useEffect(() => {
    if (accion === "Editar" && itemSelect && dataSucursales?.length > 0) {
      // Buscar y seleccionar la sucursal del usuario
      const sucursalUsuario = dataSucursales.find(
        (s) => s.id === itemSelect.id_sucursal || s.nombre === itemSelect.sucursal
      );
      if (sucursalUsuario) {
        selectSucursal(sucursalUsuario);
      }
    } else if (accion === "Nuevo") {
      // Limpiar selecciones para nuevo usuario
      selectSucursal(null);
      setCajaSelectItem(null);
    }
  }, [accion, itemSelect, dataSucursales]);

  // Inicializar la caja cuando se carguen las cajas de la sucursal seleccionada
  useEffect(() => {
    if (accion === "Editar" && itemSelect && dataCaja?.length > 0) {
      const cajaUsuario = dataCaja.find(
        (c) => c.id === itemSelect.id_caja || c.descripcion === itemSelect.caja
      );
      if (cajaUsuario) {
        setCajaSelectItem(cajaUsuario);
      }
    }
  }, [accion, itemSelect, dataCaja]);

  const handleCerrarConConfirmacion = async () => {
    if (isDirty) {
      const result = await Swal.fire({
        title: '¿Salir sin guardar?',
        text: 'Si sales ahora, perderás la información ingresada.',
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
  const insertar = async (data) => {
    if (accion === "Editar") {
      // Actualizar datos básicos del usuario
      const p = {
        id: itemSelect?.id_usuario,
        nombres: data.nombres,
        nro_doc: data.nro_doc,
        telefono: data.telefono,
        id_rol: rolesItemSelect?.id,
      };
      console.log("pEditar", p);
      await editarUsuarios(p);
      
      // Si se está editando la asignación, actualizar sucursal/caja
      if (editandoAsignacion && sucursalesItemSelect?.id && cajaSelectItem?.id) {
        const resultAsignacion = await actualizarAsignacionUsuario({
          id_usuario: itemSelect?.id_usuario,
          id_sucursal: sucursalesItemSelect?.id,
          id_caja: cajaSelectItem?.id,
        });
        
        if (!resultAsignacion?.success) {
          throw new Error(resultAsignacion?.mensaje || "Error al actualizar asignación");
        }
      }
    } else {
      const p = {
        
        nombres: data.nombres,
        nro_doc: data.nro_doc,
        telefono: data.telefono,
        id_rol: rolesItemSelect?.id,
        correo: data.email,
        //datos asignacion caja y sucursal
        id_sucursal: sucursalesItemSelect?.id,
        id_caja: cajaSelectItem?.id,
        //datos credenciales
        email: data.email,
        pass: data.pass,
      };
      await insertarUsuario(p);
    }
  };
  
  // Función para habilitar edición de asignación
  const habilitarEdicionAsignacion = async () => {
    // Verificar si tiene caja abierta
    const result = await verificarCajaAbiertaUsuario({ id_usuario: itemSelect?.id_usuario });
    
    if (result?.tiene_caja_abierta) {
      Swal.fire({
        icon: "warning",
        title: "No se puede cambiar",
        html: `
          <p>${result.mensaje}</p>
          <p style="color: #666; margin-top: 10px; font-size: 14px;">
            Primero debe cerrar la caja para poder cambiar la asignación.
          </p>
        `,
        confirmButtonColor: "#111",
      });
      return;
    }
    
    setEditandoAsignacion(true);
    // Limpiar selección de caja para obligar a seleccionar una nueva
    setCajaSelectItem(null);
  };
  
  const { isPending, mutate: doInsertar } = useMutation({
    mutationKey: ["insertar usuarios"],
    mutationFn: insertar,
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
    onSuccess: () => {
      toast.success(accion === "Editar" ? "Usuario actualizado correctamente" : "Usuario registrado correctamente");
      queryClient.invalidateQueries(["mostrar usuarios asignados"]);
      onClose();
    },
  });

  const manejadorInsertar = (data) => {
    if (!rolesItemSelect?.id) {
      toast.error("Selecciona un rol para el usuario");
      return;
    }
    // Validaciones para nuevo usuario O si está editando asignación
    if (accion !== "Editar" || editandoAsignacion) {
      if (!sucursalesItemSelect?.id) {
        toast.error("Selecciona una sucursal para el usuario");
        return;
      }
      if (!cajaSelectItem?.id) {
        toast.error("Selecciona una caja para el usuario");
        return;
      }
    }
    doInsertar(data);
  };
  const isLoading = isloadingSucursales || isloadingCajas;
  if (isLoading) return <BarLoader color="#6d6d6d" />;
  return (
    <Overlay onClick={handleCerrarConConfirmacion}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        {isPending ? (
          <LoadingState>
            <BarLoader color="#111" width={100} />
            <span>Guardando usuario...</span>
          </LoadingState>
        ) : (
          <Form onSubmit={handleSubmit(manejadorInsertar)}>
            {/* Header compacto */}
            <ModalHeader>
              <HeaderLeft>
                <ModalTitle>
                  {accion === "Editar" ? "Editar usuario" : "Nuevo usuario"}
                </ModalTitle>
                <ModalSubtitle>
                  {accion === "Editar" 
                    ? "Modifica la información del usuario" 
                    : "Completa los datos para registrar"}
                </ModalSubtitle>
              </HeaderLeft>
              <CloseButton type="button" onClick={handleCerrarConConfirmacion}>
                <Icon icon="lucide:x" />
              </CloseButton>
            </ModalHeader>

            {/* Body con grid 2 columnas */}
            <ModalBody>
              {/* Columna izquierda */}
              <LeftColumn>
                {/* Información personal */}
                <Section>
                  <SectionLabel>
                    <Icon icon="lucide:user" />
                    Información personal
                  </SectionLabel>
                  
                  <FieldsContainer>
                    <InputGroup>
                      <Label>Correo electrónico</Label>
                      <InputWrapper $disabled={accion === "Editar"}>
                        <InputIcon><Icon icon="lucide:mail" /></InputIcon>
                        <Input
                          disabled={accion === "Editar"}
                          type="email"
                          placeholder="usuario@email.com"
                          {...register("email", { required: true })}
                        />
                        {accion === "Editar" && <LockIcon><Icon icon="lucide:lock" /></LockIcon>}
                      </InputWrapper>
                      {errors.email && <ErrorText>Requerido</ErrorText>}
                    </InputGroup>

                    {accion !== "Editar" && (
                      <InputGroup>
                        <Label>Contraseña</Label>
                        <InputWrapper>
                          <InputIcon><Icon icon="lucide:key" /></InputIcon>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...register("pass", { required: true })}
                          />
                        </InputWrapper>
                        {errors.pass && <ErrorText>Requerido</ErrorText>}
                      </InputGroup>
                    )}

                    <InputGroup>
                      <Label>Nombre completo</Label>
                      <InputWrapper>
                        <InputIcon><Icon icon="lucide:user" /></InputIcon>
                        <Input
                          type="text"
                          placeholder="Juan Pérez"
                          {...register("nombres", { required: true })}
                        />
                      </InputWrapper>
                      {errors.nombres && <ErrorText>Requerido</ErrorText>}
                    </InputGroup>

                    <InputRow>
                      <InputGroup>
                        <Label>Nro. documento</Label>
                        <InputWrapper>
                          <InputIcon><Icon icon="lucide:id-card" /></InputIcon>
                          <Input
                            type="number"
                            placeholder="12345678"
                            {...register("nro_doc", { required: true })}
                          />
                        </InputWrapper>
                      </InputGroup>

                      <InputGroup>
                        <Label>Teléfono</Label>
                        <InputWrapper>
                          <InputIcon><Icon icon="lucide:phone" /></InputIcon>
                          <Input
                            type="text"
                            placeholder="999 999 999"
                            {...register("telefono", { required: true })}
                          />
                        </InputWrapper>
                      </InputGroup>
                    </InputRow>
                  </FieldsContainer>
                </Section>

                {/* Asignación */}
                <Section>
                  <SectionLabelRow>
                    <SectionLabel>
                      <Icon icon="lucide:building-2" />
                      Asignación
                    </SectionLabel>
                    {accion === "Editar" && !editandoAsignacion && (
                      <EditAsignacionBtn type="button" onClick={habilitarEdicionAsignacion}>
                        <Icon icon="lucide:pencil" />
                        Cambiar
                      </EditAsignacionBtn>
                    )}
                  </SectionLabelRow>
                  
                  <FieldsContainer>
                    <InputRow>
                      <InputGroup>
                        <Label>Sucursal</Label>
                        {accion === "Editar" && !editandoAsignacion ? (
                          <ReadOnlyField>
                            <Icon icon="lucide:building" />
                            {itemSelect?.sucursal || "Sin asignar"}
                          </ReadOnlyField>
                        ) : (
                          <SelectWrapper>
                            <SelectList
                              onSelect={(item) => {
                                selectSucursal(item);
                                // Limpiar caja al cambiar sucursal
                                setCajaSelectItem(null);
                              }}
                              itemSelect={sucursalesItemSelect}
                              displayField="nombre"
                              data={dataSucursales}
                              placeholder="Seleccionar sucursal..."
                              isLoading={isloadingSucursales}
                            />
                          </SelectWrapper>
                        )}
                      </InputGroup>

                      <InputGroup>
                        <Label>Caja asignada</Label>
                        {accion === "Editar" && !editandoAsignacion ? (
                          <ReadOnlyField>
                            <Icon icon="lucide:monitor" />
                            {itemSelect?.caja || "Sin asignar"}
                          </ReadOnlyField>
                        ) : (
                          <SelectWrapper>
                            <SelectList
                              onSelect={setCajaSelectItem}
                              itemSelect={cajaSelectItem}
                              displayField="descripcion"
                              data={dataCaja || []}
                              placeholder={!sucursalesItemSelect?.id ? "Primero selecciona sucursal" : "Seleccionar caja..."}
                              isLoading={isloadingCajas}
                            />
                          </SelectWrapper>
                        )}
                      </InputGroup>
                    </InputRow>
                    
                    {editandoAsignacion && (
                      <AsignacionNote>
                        <Icon icon="lucide:info" />
                        Selecciona la nueva sucursal y caja para este usuario
                      </AsignacionNote>
                    )}
                  </FieldsContainer>
                </Section>
              </LeftColumn>

              {/* Columna derecha - Permisos */}
              <RightColumn>
                <Section $noBorder>
                  <SectionLabel>
                    <Icon icon="lucide:shield-check" />
                    Rol y permisos
                  </SectionLabel>
                  <PermisosWrapper>
                    <PermisosUser />
                  </PermisosWrapper>
                </Section>
              </RightColumn>
            </ModalBody>

            {/* Footer */}
            <ModalFooter>
              <CancelButton type="button" onClick={handleCerrarConConfirmacion}>
                Cancelar
              </CancelButton>
              <SubmitButton type="submit">
                <Icon icon={accion === "Editar" ? "lucide:save" : "lucide:user-plus"} />
                {accion === "Editar" ? "Guardar" : "Crear usuario"}
              </SubmitButton>
            </ModalFooter>
          </Form>
        )}
      </ModalContainer>
    </Overlay>
  );
}

// =====================
// STYLED COMPONENTS - Diseño minimalista estilo MiPerfil
// =====================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  padding: 16px;
`;

const ModalContainer = styled.div`
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #666;
  font-size: 14px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 90vh;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
`;

const HeaderLeft = styled.div``;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 2px;
`;

const ModalSubtitle = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  
  svg {
    font-size: 18px;
    color: #666;
  }
  
  &:hover {
    background: #eee;
  }
`;

const ModalBody = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  overflow-y: auto;
  flex: 1;
  
  @media ${Device.laptop} {
    grid-template-columns: 1fr 1fr;
  }
`;

const LeftColumn = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid #eee;
  
  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid #eee;
  }
`;

const RightColumn = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  
  ${props => !props.$noBorder && `
    padding-bottom: 20px;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }
  `}
`;

const SectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const SectionLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  
  svg {
    font-size: 16px;
    color: #666;
  }
`;

const EditAsignacionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  
  svg {
    font-size: 14px;
  }
  
  &:hover {
    background: #e0f2fe;
    border-color: #7dd3fc;
  }
`;

const AsignacionNote = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  margin-top: 8px;
  
  svg {
    font-size: 16px;
    color: #d97706;
  }
`;

const FieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const InputRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #555;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: ${props => props.$disabled ? '#f5f5f5' : '#fafafa'};
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  transition: all 0.15s;
  
  &:focus-within {
    border-color: #111;
    background: #fff;
  }
`;

const InputIcon = styled.div`
  padding-left: 12px;
  color: #999;
  
  svg {
    font-size: 16px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #111;
  
  &::placeholder {
    color: #aaa;
  }
  
  &:focus {
    outline: none;
  }
  
  &:disabled {
    cursor: not-allowed;
    color: #888;
  }
`;

const LockIcon = styled.div`
  padding-right: 12px;
  color: #ccc;
  
  svg {
    font-size: 14px;
  }
`;

const ErrorText = styled.span`
  font-size: 11px;
  color: #e53935;
`;

const SelectWrapper = styled.div`
  > div {
    border-radius: 8px;
    border: 2px solid #e5e5e5;
    background: #fafafa;
    
    &:hover {
      border-color: #ccc;
    }
  }
`;

const ReadOnlyField = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f5f5f5;
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  
  svg {
    font-size: 16px;
    color: #999;
  }
`;

const PermisosWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 320px;
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #eee;
`;

const CancelButton = styled.button`
  padding: 10px 18px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover {
    background: #f5f5f5;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: #111;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;
  
  svg {
    font-size: 16px;
  }
  
  &:hover {
    background: #333;
  }
`;
