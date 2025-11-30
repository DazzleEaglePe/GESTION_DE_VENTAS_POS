import styled from "styled-components";
import { useThemeStore } from "../../store/ThemeStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { Dark, Light } from "../../styles/themes";
import { Icon } from "@iconify/react";

export function ToggleTema() {
  const { editarThemeUser, datausuarios } = useUsuariosStore();
  const { setTheme, theme } = useThemeStore();
  const queryClient = useQueryClient();

  const editarTemaUser = async () => {
    const themeUse = theme === "light" ? "dark" : "light";
    const themeStyle = datausuarios?.tema === "light" ? Dark : Light;
    setTheme({
      tema: themeUse,
      style: themeStyle,
    });
    const p = {
      id: datausuarios?.id,
      tema: themeUse,
    };
    await editarThemeUser(p);
  };

  const { mutate, isPending } = useMutation({
    mutationKey: ["editar tema"],
    mutationFn: editarTemaUser,
    onError: (error) => {
      console.log(`Error: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mostrar usuarios"]);
    },
  });

  const isDark = theme === "dark";

  return (
    <ToggleButton 
      onClick={mutate} 
      disabled={isPending}
      $isDark={isDark}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isPending ? (
        <Icon icon="lucide:loader-2" className="spinner" />
      ) : (
        <Icon icon={isDark ? "lucide:sun" : "lucide:moon"} />
      )}
    </ToggleButton>
  );
}

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: ${({ $isDark }) => ($isDark ? "#374151" : "#f3f4f6")};
  color: ${({ $isDark }) => ($isDark ? "#fbbf24" : "#6b7280")};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 20px;

  &:hover {
    background: ${({ $isDark }) => ($isDark ? "#4b5563" : "#e5e7eb")};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
