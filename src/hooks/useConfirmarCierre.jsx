import Swal from "sweetalert2";

/**
 * Hook para confirmar antes de cerrar un modal con cambios sin guardar
 * @param {Function} onClose - Función para cerrar el modal
 * @param {Function} verificarCambios - Función que retorna true si hay cambios sin guardar
 * @returns {Function} handleCerrar - Función para manejar el cierre con confirmación
 */
export const useConfirmarCierre = (onClose, verificarCambios) => {
  const handleCerrar = async () => {
    if (verificarCambios && verificarCambios()) {
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

  return handleCerrar;
};

export default useConfirmarCierre;
