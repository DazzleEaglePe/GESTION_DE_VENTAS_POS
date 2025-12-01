import styled from "styled-components";
import {
  useProductosStore,
  useVentasStore,
  useUsuariosStore,
  useEmpresaStore,
  useAlmacenesStore,
  useDetalleVentasStore,
} from "../../../index";
import { Device } from "../../../styles/breakpoints";
import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";

import { useFormattedDate } from "../../../hooks/useFormattedDate";
import { useCierreCajaStore } from "../../../store/CierreCajaStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStockStore } from "../../../store/StockStore";
import { useEliminarVentasIncompletasMutate, useMostrarVentaPendienteQuery } from "../../../tanstack/VentasStack";
import { Reloj } from "../Reloj";
import { ListaDesplegable } from "../ListaDesplegable";

export function HeaderPos() {
  const [stateLectora, setStateLectora] = useState(true);
  const [cantidadInput, setCantidadInput] = useState(1);
  const [stateTeclado, setStateTeclado] = useState(false);
  const [stateListaproductos, setStateListaproductos] = useState(false);
  const { setBuscador, dataProductos, selectProductos, buscador } =
    useProductosStore();
  
  const { datausuarios } = useUsuariosStore();
  const { dataStockXAlmacenesYProducto, setStateModal } = useStockStore();

  const { idventa, insertarVentas, resetState } = useVentasStore();

  const { dataempresa } = useEmpresaStore();
  const { dataCierreCaja } = useCierreCajaStore();
  const { almacenSelectItem, dataAlmacenesXsucursal, setAlmacenSelectItem } =
    useAlmacenesStore();
  const { insertarDetalleVentas } = useDetalleVentasStore();
  const queryClient = useQueryClient();

  const buscadorRef = useRef(null);
  const fechaactual = useFormattedDate();

  function focusclick() {
    buscadorRef.current.focus();
    buscadorRef.current.value.trim() === ""
      ? setStateListaproductos(false)
      : setStateListaproductos(true);
  }
  function buscar(e) {
    setBuscador(e.target.value);
    let texto = e.target.value;
    if (texto.trim() === "" || stateLectora) {
      setStateListaproductos(false);
    } else {
      setStateListaproductos(true);
    }
  }

  async function insertarventas() {
    if (idventa === 0) {
      const pventas = {
        fecha: fechaactual,
        id_usuario: datausuarios?.id,
        id_sucursal: dataCierreCaja?.caja?.id_sucursal,
        id_empresa: dataempresa?.id,
        id_cierre_caja: dataCierreCaja?.id,
      };

      const result = await insertarVentas(pventas);
      if (result?.id > 0) {
        await insertarDVentas(result?.id);
      }
    } else {
      await insertarDVentas(idventa);
    }
    setBuscador("");
    buscadorRef.current.focus();
    setCantidadInput(1);
  }
  async function insertarDVentas(idventa) {
    const productosItemSelect =
      useProductosStore.getState().productosItemSelect;
    
    // Obtener el almacén seleccionado o el primero disponible
    const almacenActual = almacenSelectItem?.id || almacenSelectItem?.id_almacen || dataAlmacenesXsucursal?.[0]?.id;
    
    if (!almacenActual) {
      toast.error("No hay almacén seleccionado. Por favor seleccione un almacén.");
      return;
    }
    
    const pDetalleVentas = {
      _id_venta: idventa,
      _cantidad: parseFloat(cantidadInput) || 1,
      _precio_venta: productosItemSelect.precio_venta,
      _descripcion: productosItemSelect.nombre,
      _id_producto: productosItemSelect.id,
      _precio_compra: productosItemSelect.precio_compra,
      _id_sucursal: dataCierreCaja?.caja?.id_sucursal,
      _id_almacen: almacenActual,
    };
    console.log("pDetalleVentas", pDetalleVentas);
    await insertarDetalleVentas(pDetalleVentas);
  }
  const { mutate: mutationInsertarVentas } = useMutation({
    mutationKey: ["insertar ventas"],
    mutationFn: insertarventas,
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
      
      // Si la venta no existe, resetear el estado para crear una nueva
      if (error.code === "VENTA_NO_EXISTE" || error.message.includes("no existe")) {
        resetState();
        toast.info("Se reinició la venta. Intente agregar el producto nuevamente.");
      }
      
      queryClient.invalidateQueries(["mostrar Stock XAlmacenes YProducto"]);
      if (dataStockXAlmacenesYProducto) {
        setStateModal(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mostrar detalle venta"]);
    },
  });
  //validar cantidad
  const ValidarCantidad = (e) => {
    const value = Math.max(0, parseFloat(e.target.value));
    setCantidadInput(value);
  };
  
  // Recuperar venta pendiente al cargar el POS
  const { data: ventaPendiente, isLoading: isLoadingVentaPendiente } = useMostrarVentaPendienteQuery();
  
  // Mutación opcional para eliminar ventas incompletas (ya no se usa automáticamente)
  const { mutate: eliminarVentasIncompletas } = useEliminarVentasIncompletasMutate();
  
  useEffect(() => {
    buscadorRef.current.focus();
    // Ya no eliminamos automáticamente, ahora recuperamos la venta pendiente
  }, []);

  // Efecto para notificar cuando se recupera una venta pendiente
  useEffect(() => {
    if (ventaPendiente?.id && !isLoadingVentaPendiente) {
      const cantidadProductos = ventaPendiente.detalle_venta?.[0]?.count || 0;
      if (cantidadProductos > 0) {
        toast.info(`Se recuperó tu venta pendiente con ${cantidadProductos} producto(s)`, {
          duration: 3000,
        });
      }
    }
  }, [ventaPendiente, isLoadingVentaPendiente]);

  useEffect(() => {
    let timeout;
    const texto = buscador.trim();
    const isCodigoDeBarras = /^[0-9]{3,}$/.test(texto);
    if (isCodigoDeBarras) {
      setStateListaproductos(false);
      timeout = setTimeout(() => {
        const productoEncontrado = dataProductos?.find(
          (p) => p.codigo_barras === texto
        );
        if (productoEncontrado) {
          selectProductos(productoEncontrado);
          mutationInsertarVentas();
          setBuscador("");
        } else {
          toast.error("Producto no encontrado");
          setBuscador("");
        }
      }, 100);
    } else {
      if (texto.length > 1) {
        timeout = setTimeout(() => {
          setStateListaproductos(true);
        }, 200);
      } else {
        setStateListaproductos(false);
      }
    }
  }, [buscador]);

  return (
    <Header>
      <TopBar>
        <span><strong>SUCURSAL:</strong> {dataCierreCaja.caja?.sucursales?.nombre}</span>
        <Divider />
        <span><strong>CAJA:</strong> {dataCierreCaja.caja?.descripcion}</span>
      </TopBar>

      <MainHeader>
        <UserInfo>
          <UserName>{datausuarios?.nombres}</UserName>
          <UserRole>
            <Icon icon="lucide:shield-check" />
            {datausuarios?.roles?.nombre}
          </UserRole>
        </UserInfo>

        <ClockWrapper>
          <Reloj />
        </ClockWrapper>
      </MainHeader>

      <SearchSection>
        <QuantityInput>
          <input
            type="number"
            min="1"
            value={cantidadInput}
            onChange={ValidarCantidad}
            placeholder="1"
          />
        </QuantityInput>

        <SearchWrapper>
          <SearchIcon>
            <Icon icon="lucide:search" />
          </SearchIcon>
          <SearchInput
            value={buscador}
            ref={buscadorRef}
            onChange={buscar}
            type="search"
            placeholder="buscar..."
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && stateListaproductos) {
                e.preventDefault();
                document.querySelector("[tabindex='0'").focus();
              }
            }}
          />
          <ListaDesplegable
            funcioncrud={mutationInsertarVentas}
            top="52px"
            funcion={selectProductos}
            setState={() => setStateListaproductos(!stateListaproductos)}
            data={dataProductos}
            state={stateListaproductos}
          />
        </SearchWrapper>
      </SearchSection>
    </Header>
  );
}

const Header = styled.div`
  grid-area: header;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media ${Device.desktop} {
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 16px;
  }
`;

const TopBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #111;
  color: #fff;
  font-size: 13px;

  strong {
    color: #999;
  }
`;

const Divider = styled.span`
  width: 1px;
  height: 16px;
  background: #333;
`;

const MainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const UserName = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #111;
`;

const UserRole = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;

  svg {
    font-size: 14px;
    color: #16a34a;
  }
`;

const ClockWrapper = styled.div`
  text-align: right;
`;

const SearchSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const QuantityInput = styled.div`
  width: 70px;
  flex-shrink: 0;

  input {
    width: 100%;
    height: 48px;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    background: #fafafa;
    outline: none;
    transition: all 0.15s;

    &:focus {
      border-color: #111;
      background: #fff;
    }
  }
`;

const SearchWrapper = styled.div`
  flex: 1;
  position: relative;
  max-width: 500px;

  @media ${Device.desktop} {
    max-width: 400px;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 18px;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 48px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  padding: 0 16px 0 46px;
  font-size: 15px;
  background: #fafafa;
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
