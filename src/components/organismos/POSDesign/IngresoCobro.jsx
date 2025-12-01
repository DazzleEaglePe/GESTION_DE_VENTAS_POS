import styled from "styled-components";

import { Icon } from "@iconify/react/dist/iconify.js";
import { InputText } from "../formularios/InputText";
import { FormatearNumeroDinero } from "../../../utils/Conversiones";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Btn1 } from "../../moleculas/Btn1";
import { useUsuariosStore } from "../../../store/UsuariosStore";
import { useSucursalesStore } from "../../../store/SucursalesStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useVentasStore } from "../../../store/VentasStore";
import { useDetalleVentasStore } from "../../../store/DetalleVentasStore";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PanelBuscador } from "./PanelBuscador";
import { useClientesProveedoresStore } from "../../../store/ClientesProveedoresStore";
import { useMetodosPagoStore } from "../../../store/MetodosPagoStore";
import { useCierreCajaStore } from "../../../store/CierreCajaStore";
import { useMovCajaStore } from "../../../store/MovCajaStore";
import { useFormattedDate } from "../../../hooks/useFormattedDate";
import { useAsignacionCajaSucursalStore } from "../../../store/AsignacionCajaSucursalStore";
import { useSerializacionStore } from "../../../store/SerializacionStore";
import { useImpresorasStore } from "../../../store/ImpresorasStore";
import ticket from "../../../reports/TicketVenta";
import { RegistrarClientesProveedores } from "../formularios/RegistrarClientesProveedores";
import { useGlobalStore } from "../../../store/GlobalStore";
export const IngresoCobro = forwardRef((props, ref) => {
  const fechaActual = useFormattedDate();
  const {
    tipocobro,
    items,
    setStatePantallaCobro,
    resetState,
    confirmarVenta,
    dataventaconfirmada,
  } = useVentasStore();
  const { total } = useDetalleVentasStore();
  //Valores a calcular
  const [stateBuscadorClientes, setStateBuscadorClientes] = useState(false);
  const [precioVenta, setPrecioVenta] = useState(total);
  const [valoresPago, setValoresPago] = useState({});
  const [valorTarjeta, setValorTarjeta] = useState(
    tipocobro === "tarjeta" ? total : 0
  );
  const [valorEfectivo, setValorEfectivo] = useState(
    tipocobro === "efectivo" ? total : 0
  );
  const [valorCredito, setValorCredito] = useState(
    tipocobro === "credito" ? total : 0
  );
  //Valores a mostrar
  const [vuelto, setVuelto] = useState(0);
  const [restante, setRestante] = useState(0);
  //datos de tipos de pago
  const { dataMetodosPago } = useMetodosPagoStore();
  //datos de la store
  const { datausuarios } = useUsuariosStore();
  const { sucursalesItemSelectAsignadas } = useAsignacionCajaSucursalStore();
  const { dataempresa } = useEmpresaStore();
  const { idventa, insertarVentas } = useVentasStore();
  const { datadetalleventa } = useDetalleVentasStore();
  const { dataComprobantes, itemComprobanteSelect, setItemComprobanteSelect } =
    useSerializacionStore();
  //mostrar data de impresoras
  const { dataImpresorasPorCaja } = useImpresorasStore();
  //#region Clientes
  const {
    buscarCliPro,
    setBuscador,
    buscador,
    selectCliPro,
    cliproItemSelect,
  } = useClientesProveedoresStore();
  const queryClient = useQueryClient();
  const { data: dataBuscadorcliente, isLoading: isloadingBuscadorCliente } =
    useQuery({
      queryKey: ["buscar cliente", [dataempresa?.id, "cliente", buscador]],
      queryFn: () =>
        buscarCliPro({
          id_empresa: dataempresa?.id,
          tipo: "cliente",
          buscador: buscador,
        }),
      enabled: !!dataempresa,
      refetchOnWindowFocus: false,
    });
  //#endregion
  //Mostrar cierres de caja
  const { dataCierreCaja } = useCierreCajaStore();
  // Función para calcular vuelto y restante
  //Movientos de caja
  const { insertarMovCaja } = useMovCajaStore();
  const calcularVueltoYRestante = () => {
    const totalPagado = Object.values(valoresPago).reduce(
      (acc, curr) => acc + curr,
      0
    );
    const totalSinEfectivo = totalPagado - (valoresPago["Efectivo"] || 0);
    // Si el total sin efectivo excede el precio de venta, no permitir el exceso
    if (totalSinEfectivo > precioVenta) {
      setVuelto(0);
      setRestante(precioVenta - totalSinEfectivo); //Restante negativo para indicar que se excede sin efectivo
    } else {
      // Permitir el exceso solo si es en efectivo
      if (totalPagado >= precioVenta) {
        const exceso = totalPagado - precioVenta;
        setVuelto(valoresPago["Efectivo"] ? exceso : 0);
        setRestante(0);
      } else {
        // Si el total pagado no cubre el precio de venta, calcular el restante
        setVuelto(0);
        setRestante(precioVenta - totalPagado);
      }
    }
  };
  //Manejadores de cambio
  const handleChangePago = (tipo, valor) => {
    setValoresPago((prev) => ({
      ...prev,
      [tipo]: parseFloat(valor) || 0,
    }));
    console.log(valoresPago);
    //{100,50,10}
  };
  // Exponiendo la función mutation a través de ref
  useImperativeHandle(ref, () => ({
    mutateAsync: mutation.mutateAsync,
  }));
  //Funcion para realizar la venta
  const mutation = useMutation({
    mutationKey: "insertar ventas",
    mutationFn: ConfirmarVenta,
    onSuccess: () => {
      if (restante != 0) {
        return;
      }
      resetState();
      queryClient.invalidateQueries(["mostrar detalle venta"]);
      queryClient.invalidateQueries(["venta pendiente"]);
      toast.success("🎉 venta generada correctamente!!!");
    },
  });
  async function ConfirmarVenta() {
    if (restante === 0) {
      const pventas = {
        _id_venta: idventa,
        _id_usuario: datausuarios?.id,
        _vuelto: vuelto,
        _id_tipo_comprobante: itemComprobanteSelect?.id_tipo_comprobante,
        _serie: itemComprobanteSelect?.serie,
        _id_sucursal: dataCierreCaja?.caja?.id_sucursal,
        _id_cliente: cliproItemSelect?.id || null,
        _fecha: fechaActual,
        _monto_total: total,
      };
      console.log("confirmarVenta", pventas);
      const dataVentaConfirmada = await confirmarVenta(pventas);
      const nuevosMetodosPago = [];
      // Insertar en MovCaja solo los métodos de pago con monto mayor a 0
      for (const [tipo, monto] of Object.entries(valoresPago)) {
        if (monto > 0) {
          const metodoPago = dataMetodosPago.find(
            (item) => item.nombre === tipo
          );
          const pmovcaja = {
            tipo_movimiento: "ingreso",
            monto: monto,
            id_metodo_pago: metodoPago?.id,
            descripcion: `Pago de venta con ${tipo}`,
            id_usuario: datausuarios?.id,
            id_cierre_caja: dataCierreCaja?.id,
            id_ventas: idventa,
            vuelto: tipo === "Efectivo" ? vuelto : 0,
          };
          await insertarMovCaja(pmovcaja);
          nuevosMetodosPago.push({ tipo, monto, vuelto });
        }
      }
      const pPrint = {
        dataempresa: dataempresa,
        productos: datadetalleventa,
        dataventas: dataVentaConfirmada,
        nombreComprobante: itemComprobanteSelect?.tipo_comprobantes?.nombre,
        nombrecajero: datausuarios?.nombres,
        dataCliente: cliproItemSelect,
        metodosPago: nuevosMetodosPago,
      };
      dataImpresorasPorCaja?.state
        ? imprimirDirectoTicket(pPrint)
        : imprimirConVentanaEmergente(pPrint);
    } else {
      toast.warning("Falta completar el pago, el restante tiene que ser 0");
    }
  }
  const imprimirConVentanaEmergente = async (p) => {
    console.log("pprint", p);
    await ticket("print", p);
  };
  const imprimirDirectoTicket = async (p) => {
    if (dataImpresorasPorCaja?.name === "-") {
      return toast.error(
        "Impresora no reconocida, configura tu impresora desde modulo de configuración"
      );
    }
    const response = await ticket("b64", p);
    // Convertir el contenido base64 en un archivo Blob
    const binaryString = atob(response.content);
    const binaryLen = binaryString.length;
    const bytes = new Uint8Array(binaryLen);
    for (let i = 0; i < binaryLen; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    // Crear un archivo simulando un archivo subido
    const file = new File([blob], "GeneratedTicket.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("printerName", dataImpresorasPorCaja?.name);
    const responseApi = await fetch("http://localhost:5075/api/print-ticket", {
      method: "POST",
      body: formData,
    });
    if (responseApi.ok) {
      toast.success("El PDF se envió a imprimir correctamente.");

    }else{
      const error = await responseApi.text();
      toast.error("Error al imprimir" + error);
    }

  };
  const { setTipo: setTipocliente } = useClientesProveedoresStore();
  const { setStateClose, setAccion, stateClose, accion, setIsExploding } =
    useGlobalStore();
  function registrarNuevoCliente() {
    const tipo = "cliente";
    setTipocliente(tipo);
    setAccion("Nuevo");
    setStateClose(true);
  }
  //useEffect para recalcular cuando los valores cambian
  useEffect(() => {
    if (tipocobro !== "Mixto" && valoresPago[tipocobro] != total) {
      setValoresPago((prev) => ({
        ...prev,
        [tipocobro]: total,
      }));
    }
  }, [tipocobro, total]);
  useEffect(() => {
    calcularVueltoYRestante();
  }, [precioVenta, tipocobro, valoresPago]);
  return (
    <Container>
      {mutation.isPending ? (
        <span>guardando...🐖</span>
      ) : (
        <>
          {mutation.isError && <span>error: {mutation.error.message}</span>}
          <section className="area1">
            <span className="tipocobro">{tipocobro}</span>
            <section>
              <span>
                {itemComprobanteSelect?.tipo_comprobantes?.nombre}:{" "}
                <strong>
                  {itemComprobanteSelect?.serie}-
                  {itemComprobanteSelect?.correlativo}{" "}
                </strong>{" "}
              </span>
            </section>

            <section className="areacomprobantes">
              {dataComprobantes?.map((item, index) => {
                return (
                  <article className="box" key={index}>
                    <Btn1
                      titulo={item?.tipo_comprobantes?.nombre}
                      border="0"
                      height="70px"
                      width="100%"
                      funcion={() => setItemComprobanteSelect(item)}
                    />
                  </article>
                );
              })}
            </section>
            <span>cliente</span>
            <EditButton
              onClick={() => setStateBuscadorClientes(!stateBuscadorClientes)}
            >
              <Icon className=" icono" icon="lets-icons:edit-fill" />
            </EditButton>
            <span className="cliente">{cliproItemSelect?.nombres}</span>
          </section>
          <Linea />
          <section className="area2">
            {dataMetodosPago?.map((item, index) => {
              return (tipocobro === "Mixto" && item.nombre !== "Mixto") ||
                (tipocobro === item.nombre && item.nombre !== "Mixto") ? (
                <InputText textalign="center" key={index}>
                  <input
                    onChange={(e) =>
                      handleChangePago(item.nombre, e.target.value)
                    }
                    defaultValue={tipocobro === item.nombre ? total : ""}
                    className="form__field"
                    type="number"
                    disabled={
                      tipocobro === "Mixto" || tipocobro === "Efectivo"
                        ? false
                        : true
                    }
                  />
                  <label className="form__label">{item.nombre} </label>
                </InputText>
              ) : null;
            })}
          </section>
          <Linea />
          <section className="area3">
            <article className="etiquetas">
              <span className="total">Total: </span>
              <span>Vuelto: </span>
              <span>Restante: </span>
            </article>
            <article>
              <span className="total">
                {FormatearNumeroDinero(
                  total,
                  dataempresa?.currency,
                  dataempresa?.iso
                )}
              </span>
              <span>
                {FormatearNumeroDinero(
                  vuelto,
                  dataempresa?.currency,
                  dataempresa?.iso
                )}
              </span>
              <span>
                {FormatearNumeroDinero(
                  restante,
                  dataempresa?.currency,
                  dataempresa?.iso
                )}
              </span>
            </article>
          </section>
          <Linea />
          <section className="area4">
            <Btn1
              funcion={() => mutation.mutateAsync()}
              border="2px"
              titulo="COBRAR (enter)"
              bgcolor="#0aca21"
              color="#ffffff"
              width="100%"
            />
          </section>
          {stateBuscadorClientes && (
            <PanelBuscador
              funcion={registrarNuevoCliente}
              selector={selectCliPro}
              setBuscador={setBuscador}
              displayField="nombres"
              data={dataBuscadorcliente}
              setStateBuscador={() =>
                setStateBuscadorClientes(!stateBuscadorClientes)
              }
            />
          )}
          {stateClose && (
            <RegistrarClientesProveedores
              setIsExploding={setIsExploding}
              accion={accion}
              onClose={() => setStateClose(false)}
            />
          )}
        </>
      )}
    </Container>
  );
});
const Container = styled.div`
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 380px;
  padding: 24px;
  border-radius: 16px;
  gap: 16px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  color: #111;
  align-items: center;
  font-size: 18px;

  input {
    color: #111 !important;
    font-weight: 600;
  }

  .area1 {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    
    .areacomprobantes {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 10px;
      width: 100%;
      .box {
        flex: 1 1 40%;
        display: flex;
        gap: 10px;
      }
    }
    .tipocobro {
      position: absolute;
      right: 10px;
      top: 10px;
      background-color: rgba(233, 6, 184, 0.15);
      padding: 6px 12px;
      color: #e61eb1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
    }
    .cliente {
      font-weight: 600;
      font-size: 15px;
      color: #333;
    }
  }
  .area2 {
    width: 100%;
    input {
      font-size: 36px;
      text-align: center;
    }
  }
  .area3 {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 8px;

    article {
      display: flex;
      flex-direction: column;
    }
    .total {
      font-weight: 700;
    }
    .etiquetas {
      text-align: end;
    }
  }
  .area4 {
    width: 100%;
    margin-top: 8px;
  }
`;

const Linea = styled.span`
  width: 100%;
  border-bottom: 1px dashed #e5e5e5;
  margin: 8px 0;
`;
const EditButton = styled.button`
  background-color: #3b82f6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background-color: #2563eb;
    transform: scale(1.05);
  }

  .icono {
    font-size: 16px;
    color: #fff;
  }
`;