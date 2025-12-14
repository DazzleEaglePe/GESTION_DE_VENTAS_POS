import { create } from "zustand";
import { supabase, MostrarUsuarios, ObtenerIdAuthSupabase } from "../index";
import { useQueryClient } from "@tanstack/react-query";

export const useAuthStore = create((set) => ({
  loginGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  },
  cerrarSesion: async () => {
    await supabase.auth.signOut();
 
  },
  loginEmail: async (p) => {
    // Validación básica antes de enviar
    if (!p.email || !p.password) {
      throw new Error("El correo y la contraseña son requeridos");
    }

    // Validar formato de email
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(p.email)) {
      throw new Error("El formato del correo electrónico no es válido");
    }

    // Validar longitud mínima de contraseña
    if (p.password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: p.email.trim().toLowerCase(),
      password: p.password,
    });

    if (error) {
      // Mapeo de errores más específico
      switch (error.status) {
        case 400:
          if (error.message?.includes("Invalid login credentials")) {
            throw new Error("Correo o contraseña incorrectos");
          }
          if (error.message?.includes("Email not confirmed")) {
            throw new Error("Por favor confirma tu correo electrónico antes de iniciar sesión");
          }
          throw new Error("Credenciales inválidas. Verifica tu correo y contraseña");
        case 422:
          throw new Error("El formato de los datos ingresados no es válido");
        case 429:
          throw new Error("Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente");
        case 500:
          throw new Error("Error del servidor. Por favor intenta más tarde");
        default:
          throw new Error(error.message || "Error al iniciar sesión. Intenta nuevamente");
      }
    }

    if (!data?.user) {
      throw new Error("No se pudo obtener la información del usuario");
    }

    return data.user;
  },
  crearUserYLogin:async(p)=>{
    const { data, error } = await supabase.auth.signUp({
      email: p.email,
      password: p.password,
      
    })
    return data.user
  },
  // obtenerIdAuthSupabase: async () => {
  //     const response = await ObtenerIdAuthSupabase();
  //     return response;
  //   },
}));
