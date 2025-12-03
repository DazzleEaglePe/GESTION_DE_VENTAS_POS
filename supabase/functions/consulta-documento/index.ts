// Supabase Edge Function para consultar DNI/RUC
// Despliega con: supabase functions deploy consulta-documento

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// APIs alternativas - puedes cambiar el token por uno tuyo
// Regístrate gratis en: https://apis.net.pe/app o https://apiperu.dev
const APIS_NET_PE_TOKEN = "sk_12031.q9OJ2tjOoSoC0DJf08alYyCDA9UCHMCg"; // Obtener en https://apis.net.pe/app

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tipo, numero } = await req.json();

    if (!tipo || !numero) {
      return new Response(
        JSON.stringify({ success: false, message: "Tipo y número son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let apiUrl = "";
    if (tipo === "dni") {
      if (numero.length !== 8) {
        return new Response(
          JSON.stringify({ success: false, message: "El DNI debe tener 8 dígitos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      apiUrl = `https://api.apis.net.pe/v2/reniec/dni?numero=${numero}`;
    } else if (tipo === "ruc") {
      if (numero.length !== 11) {
        return new Response(
          JSON.stringify({ success: false, message: "El RUC debe tener 11 dígitos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      apiUrl = `https://api.apis.net.pe/v2/sunat/ruc?numero=${numero}`;
    } else {
      return new Response(
        JSON.stringify({ success: false, message: "Tipo inválido. Use 'dni' o 'ruc'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Llamar a la API externa
    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${APIS_NET_PE_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, message: data.message || "Error en la consulta" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatear respuesta según el tipo
    let resultado;
    if (tipo === "dni") {
      resultado = {
        success: true,
        data: {
          nombres: data.nombres || "",
          apellido_paterno: data.apellidoPaterno || "",
          apellido_materno: data.apellidoMaterno || "",
          nombre_completo: data.nombreCompleto || `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`,
          dni: numero,
        },
      };
    } else {
      resultado = {
        success: true,
        data: {
          razon_social: data.razonSocial || data.nombre || "",
          ruc: numero,
          direccion: data.direccion || "",
          estado: data.estado || "",
          condicion: data.condicion || "",
          departamento: data.departamento || "",
          provincia: data.provincia || "",
          distrito: data.distrito || "",
        },
      };
    }

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
