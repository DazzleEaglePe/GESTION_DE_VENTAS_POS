import styled from "styled-components";
import { Device } from "../../styles/breakpoints";
import { PantallaCierreCaja } from "../organismos/POSDesign/CajaDesign/PantallaCierreCaja";
import {
  AreaDetalleventaPos,
  AreaTecladoPos,
  FooterPos,
  HeaderPos,
  useVentasStore,
} from "../../index";
import { PantallaCobro } from "../organismos/POSDesign/PantallaCobro";
import { Toaster } from "sonner";
import { PantallaIngresoSalidaDinero } from "../organismos/POSDesign/CajaDesign/PantallaIngresoSalidaDinero";
import { useCierreCajaStore } from "../../store/CierreCajaStore";
import { MenuFlotante } from "../organismos/POSDesign/MenuFlotante";
import { SelectAlmacenModal } from "../organismos/POSDesign/SelectAlmacenModal";
import { useStockStore } from "../../store/StockStore";
import { useBuscarProductosQuery } from "../../tanstack/ProductosStack";
import { useMostrarAlmacenesXSucursalQuery } from "../../tanstack/AlmacenesStack";
import { useMostrarStockXAlmacenesYProductoQuery } from "../../tanstack/StockStack";
import { useMostrarMetodosPagoQuery } from "../../tanstack/MetodosPagoStack";
import { useMostrarSerializacionesVentasQuery } from "../../tanstack/SerializacionStack";
import { useMostrasrImpresorasPorCajaQuery } from "../../tanstack/ImpresorasStack";

export function POSTemplate() {
  const { statePantallaCobro } = useVentasStore();
  const { stateIngresoSalida, stateCierreCaja } = useCierreCajaStore();
  const { stateModal } = useStockStore();
  useBuscarProductosQuery();
  const { isLoading: isLoadingAlmacenXSucursal } =
    useMostrarAlmacenesXSucursalQuery();
  const { isLoading: isLoadingStockPorProductoYAlmacen } =
    useMostrarStockXAlmacenesYProductoQuery();
   
  const { isLoading: isLoadingSerializacionesVentas } = useMostrarSerializacionesVentasQuery();
  const { isLoading: isLoadingImpresoras } = useMostrasrImpresorasPorCajaQuery();

  return (
    <Container>
      {stateModal && <SelectAlmacenModal />}
      {statePantallaCobro && <PantallaCobro />}

      <HeaderPos />
      <Main>
        <Toaster position="top-center" richColors />
        <AreaDetalleventaPos />
        <AreaTecladoPos />
      </Main>
      <FooterPos />
      <MenuFlotante />
      {stateIngresoSalida && <PantallaIngresoSalidaDinero />}
      {stateCierreCaja && <PantallaCierreCaja />}
    </Container>
  );
}

const Container = styled.div`
  height: calc(100vh - 60px);
  padding: 16px;
  display: grid;
  gap: 12px;
  background: #fafafa;
  grid-template:
    "header" auto
    "main" 1fr;

  @media ${Device.desktop} {
    grid-template:
      "header header" auto
      "main main" 1fr
      "footer footer" 60px;
  }
`;

const Main = styled.div`
  grid-area: main;
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
  overflow: hidden;
  gap: 16px;

  @media ${Device.desktop} {
    flex-direction: row;
  }
`;
