import styled from "styled-components";
import { SelectList } from "../../ui/lists/SelectList";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useModulosStore } from "../../../store/ModulosStore";
import { Check } from "../../ui/toggles/Check";
import { useRolesStore } from "../../../store/RolesStore";
import { usePermisosStore } from "../../../store/PermisosStore";
import { useEffect } from "react";
import { useAsignacionCajaSucursalStore } from "../../../store/AsignacionCajaSucursalStore";
import { BarLoader } from "react-spinners";
import { useUsuariosStore } from "../../../store/UsuariosStore";
export const PermisosUser = () => {
  const {
    mostrarPermisos,
    toggleModule,
    selectedModules,
    setSelectedModules,
    mostrarPermisosDefault,
    actualizarPermisos,
    datapermisos,
  } = usePermisosStore();
  const { accion, selectItem: selectItemAsignaciones } =
    useAsignacionCajaSucursalStore();
  const { mostrarModulos } = useModulosStore();
  const { mostrarRoles, rolesItemSelect, setRolesItemSelect,dataroles } = useRolesStore();
  const { itemSelect } = useUsuariosStore();

  const { data: datamodulos, isLoading: isLoadingModulos } = useQuery({
    queryKey: ["mostrar modulos"],
    queryFn: mostrarModulos,
  });

  const { data: dataPermisosDefault, isLoading: isLoadingPermisosDefault } =
    useQuery({
      queryKey: ["mostrar permisos default"],
      queryFn: mostrarPermisosDefault,
    });
  const { isLoading: isLoadingPermisosUser } = useQuery({
    queryKey: [
      "mostrar permisos por usuario",
      { id_usuario: itemSelect?.id_usuario },
    ],
    queryFn: () => mostrarPermisos({ id_usuario: itemSelect?.id_usuario }),
    enabled: !!itemSelect,
  });
  const mutation = useMutation({
    mutationKey: ["actualizar permisos"],
    mutationFn: () => actualizarPermisos(),
  });
  useEffect(() => {
    if (accion === "Nuevo") {
      // En nuevo: si cambian roles, actualizar selección por defecto
      const permisosPorRol =
        dataPermisosDefault
          ?.filter((permiso) => String(permiso.id_rol) === String(rolesItemSelect?.id))
          .map((permiso) => permiso.id_modulo) || [];
      setSelectedModules(permisosPorRol);
    }else{
       setRolesItemSelect({
          id: itemSelect.id_rol,
          nombre: itemSelect.rol,
       });
    }
  }, [accion, rolesItemSelect?.id, dataPermisosDefault]);
  useEffect(() => {
    if (accion !== "Nuevo" && datapermisos) {
      const permisosUsuario = datapermisos.map((p) => p.idmodulo);
      setSelectedModules(permisosUsuario);
    }
  }, [accion, datapermisos]);
  const isLoading =
    isLoadingModulos ||
   
    isLoadingPermisosDefault ||
    isLoadingPermisosUser;
  if (isLoading) return <BarLoader />;
  return (
    <Container>
      <RolSection>
        <RolLabel>Tipo de rol</RolLabel>
        <SelectList
          data={dataroles}
          displayField="nombre"
          onSelect={setRolesItemSelect}
          itemSelect={rolesItemSelect}
        />
      </RolSection>
      
      <ModulosSection>
        <ModulosLabel>Accesos habilitados</ModulosLabel>
        <ModulosList>
          {datamodulos?.map((module) => {
            const isChecked = itemSelect
              ? datapermisos?.some(
                  (p) => String(p.idmodulo) === String(module.id)
                )
              : selectedModules.includes(module.id);
            return (
              <ModuloItem key={module.id} onClick={() => toggleModule(module.id)}>
                <Check
                  checked={isChecked}
                  onChange={() => toggleModule(module.id)}
                />
                <ModuloName>{module.nombre}</ModuloName>
              </ModuloItem>
            );
          })}
        </ModulosList>
      </ModulosSection>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const RolSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const RolLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #555;
`;

const ModulosSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ModulosLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #555;
`;

const ModulosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
  
  &::-webkit-scrollbar {
    width: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background: #eee;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
`;

const ModuloItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s;
  
  &:hover {
    background: #f9f9f9;
    border-color: #ddd;
  }
`;

const ModuloName = styled.span`
  font-size: 13px;
  color: #333;
  font-weight: 450;
`;

// Legacy - no longer used but kept for compatibility
const Title = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
`;

const ListItem = styled.li`
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
`;

const Label = styled.span`
  font-size: 1rem;
  color: #555;
  margin-left: 15px;
`;
