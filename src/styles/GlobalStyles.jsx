import { createGlobalStyle } from "styled-components";
export const GlobalStyles = createGlobalStyle`
    body{
        margin:0;
        padding:0;
        box-sizing:border-box;
        background-color:${({ theme }) => theme.bgtotal};
        font-family:"Poppins",sans-serif;
        color:#fff;
    }
    
    body::-webkit-scrollbar {
  width: 12px;
  background: rgba(24, 24, 24, 0.2);
}

body::-webkit-scrollbar-thumb {
  background: rgba(148, 148, 148, 0.9);
  border-radius: 10px;
  filter: blur(10px);
}

    /* SweetAlert2 - Minimalista Neutro */
    .swal2-popup-neutral {
      background: #ffffff !important;
      border-radius: 12px !important;
      border: 1px solid #e5e7eb !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
      padding: 24px !important;
    }

    .swal2-title-neutral {
      color: #111827 !important;
      font-size: 1.25rem !important;
      font-weight: 600 !important;
    }

    .swal2-input-neutral {
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      color: #111827 !important;
      font-size: 0.875rem !important;
      padding: 12px !important;
      transition: all 0.2s ease !important;
    }

    .swal2-input-neutral:focus {
      border-color: #111827 !important;
      box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.1) !important;
      outline: none !important;
    }

    .swal2-inputLabel-neutral {
      color: #6b7280 !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      margin-bottom: 8px !important;
    }

    .swal2-confirm-neutral {
      background: #111827 !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 10px 20px !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }

    .swal2-confirm-neutral:hover {
      background: #1f2937 !important;
    }

    .swal2-confirm-danger-neutral {
      background: #dc2626 !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 10px 20px !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }

    .swal2-confirm-danger-neutral:hover {
      background: #b91c1c !important;
    }

    .swal2-cancel-neutral {
      background: transparent !important;
      color: #6b7280 !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      padding: 10px 20px !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      margin-right: 8px !important;
    }

    .swal2-cancel-neutral:hover {
      background: #f9fafb !important;
      border-color: #d1d5db !important;
    }

    .swal2-icon.swal2-question {
      border-color: #111827 !important;
      color: #111827 !important;
    }

`;
