import styled from "styled-components";
import { v } from "../../../styles/variables";
import { InputText, Btn1 } from "../../../index";
import { useForm } from "react-hook-form";
import { BtnClose } from "../../ui/buttons/BtnClose";
import { useGlobalStore } from "../../../store/GlobalStore";
import { useProductosStore } from "../../../store/ProductosStore";
import { useMovStockStore } from "../../../store/MovStockStore";
import { useInsertarMovStockMutation } from "../../../tanstack/MovStockStack";
import { useAlmacenesStore } from "../../../store/AlmacenesStore";
import { useStockStore } from "../../../store/StockStore";
import { useSucursalesStore } from "../../../store/SucursalesStore";
import { useQuery } from "@tanstack/react-query";

export function RegistrarInventario() {
  const { setStateClose } = useGlobalStore();
  const { productosItemSelect } = useProductosStore();
  const { tipo, setTipo } = useMovStockStore();
  const { almacenSelectItem, mostrarAlmacenesXSucursal } = useAlmacenesStore();
  const { mostrarStockXAlmacenYProducto, dataStockXAlmacenYProducto } = useStockStore();
  const { sucursalItemSelect } = useSucursalesStore();

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm();

  // Cargar almacenes de la sucursal
  useQuery({
    queryKey: ["mostrar almacenes X sucursal", sucursalItemSelect?.id],
    queryFn: () => mostrarAlmacenesXSucursal({ id_sucursal: sucursalItemSelect?.id }),
    enabled: !!sucursalItemSelect?.id,
  });

  // Cargar stock actual del producto en el almacén seleccionado
  useQuery({
    queryKey: [
      "mostrar stock X almacen Y producto",
      almacenSelectItem?.id,
      productosItemSelect?.id,
    ],
    queryFn: () =>
      mostrarStockXAlmacenYProducto({
        id_almacen: almacenSelectItem?.id,
        id_producto: productosItemSelect?.id,
      }),
    enabled: !!almacenSelectItem?.id && !!productosItemSelect?.id,
  });

  const mutation = useInsertarMovStockMutation();

  const handlesub = (data) => {
    mutation.mutate(data);
  };

  return (
    <Container>
      {mutation.isPending ? (
        <div className="sub-contenedor">
          <span>guardando...🔼</span>
        </div>
      ) : (
        <div className="sub-contenedor">
          <div className="headers">
            <section>
              <h1>Registrar Inventario</h1>
            </section>
            <section>
              <BtnClose funcion={() => setStateClose(false)} />
            </section>
          </div>

          {productosItemSelect?.nombre ? (
            <form className="formulario" onSubmit={handleSubmit(handlesub)}>
              <section className="form-subcontainer">
                {/* Info del producto seleccionado */}
                <div className="producto-info">
                  <p>
                    <strong>Producto:</strong> {productosItemSelect?.nombre}
                  </p>
                  <p>
                    <strong>Stock actual:</strong>{" "}
                    {dataStockXAlmacenYProducto?.stock ?? 0}
                  </p>
                  <p>
                    <strong>Almacén:</strong>{" "}
                    {almacenSelectItem?.nombre ?? "No seleccionado"}
                  </p>
                </div>

                {/* Tipo de movimiento */}
                <article className="tipo-movimiento">
                  <label>Tipo de movimiento:</label>
                  <div className="radio-group">
                    <label className={tipo === "ingreso" ? "active" : ""}>
                      <input
                        type="radio"
                        name="tipo"
                        value="ingreso"
                        checked={tipo === "ingreso"}
                        onChange={() => setTipo("ingreso")}
                      />
                      Ingreso
                    </label>
                    <label className={tipo === "egreso" ? "active" : ""}>
                      <input
                        type="radio"
                        name="tipo"
                        value="egreso"
                        checked={tipo === "egreso"}
                        onChange={() => setTipo("egreso")}
                      />
                      Egreso
                    </label>
                  </div>
                </article>

                {/* Cantidad */}
                <article>
                  <InputText icono={<v.iconoflechaderecha />}>
                    <input
                      className="form__field"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Cantidad"
                      {...register("cantidad", {
                        required: true,
                        min: 0.01,
                      })}
                    />
                    <label className="form__label">Cantidad</label>
                    {errors.cantidad?.type === "required" && (
                      <p>Campo requerido</p>
                    )}
                    {errors.cantidad?.type === "min" && (
                      <p>La cantidad debe ser mayor a 0</p>
                    )}
                  </InputText>
                </article>

                {/* Precio de compra */}
                <article>
                  <InputText icono={<v.iconoflechaderecha />}>
                    <input
                      className="form__field"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={productosItemSelect?.precio_compra ?? 0}
                      placeholder="Precio de compra"
                      {...register("precio_compra", {
                        required: true,
                        min: 0,
                      })}
                    />
                    <label className="form__label">Precio de compra</label>
                    {errors.precio_compra?.type === "required" && (
                      <p>Campo requerido</p>
                    )}
                  </InputText>
                </article>

                {/* Precio de venta */}
                <article>
                  <InputText icono={<v.iconoflechaderecha />}>
                    <input
                      className="form__field"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={productosItemSelect?.precio_venta ?? 0}
                      placeholder="Precio de venta"
                      {...register("precio_venta", {
                        required: true,
                        min: 0,
                      })}
                    />
                    <label className="form__label">Precio de venta</label>
                    {errors.precio_venta?.type === "required" && (
                      <p>Campo requerido</p>
                    )}
                  </InputText>
                </article>

                <Btn1
                  icono={<v.iconoguardar />}
                  titulo="Guardar"
                  bgcolor="#F9D70B"
                />
              </section>
            </form>
          ) : (
            <div className="sin-producto">
              <p>⚠️ Selecciona un producto primero para registrar inventario</p>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}

const Container = styled.div`
  transition: 0.5s;
  top: 0;
  left: 0;
  position: fixed;
  display: flex;
  width: 100%;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);

  .sub-contenedor {
    position: relative;
    width: 500px;
    max-width: 85%;
    border-radius: 20px;
    background: ${({ theme }) => theme.body};
    box-shadow: -10px 15px 30px rgba(10, 9, 9, 0.4);
    padding: 13px 36px 20px 36px;
    z-index: 100;
    max-height: 80vh;
    overflow-y: auto;

    .headers {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h1 {
        font-size: 25px;
        font-weight: 700;
        text-transform: uppercase;
      }
      span {
        font-size: 20px;
        cursor: pointer;
      }
    }

    .producto-info {
      background: ${({ theme }) => theme.bg3};
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 10px;

      p {
        margin: 5px 0;
        font-size: 14px;
      }
    }

    .sin-producto {
      text-align: center;
      padding: 30px;
      color: ${({ theme }) => theme.text};

      p {
        font-size: 16px;
      }
    }

    .tipo-movimiento {
      margin-bottom: 15px;

      label {
        display: block;
        margin-bottom: 10px;
        font-weight: 600;
      }

      .radio-group {
        display: flex;
        gap: 15px;

        label {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          background: ${({ theme }) => theme.bg3};
          transition: all 0.3s;

          &.active {
            background: ${({ theme }) => theme.bg4 || "#4CAF50"};
            color: white;
          }

          input[type="radio"] {
            display: none;
          }
        }
      }
    }

    .formulario {
      .form-subcontainer {
        gap: 20px;
        display: flex;
        flex-direction: column;
      }
    }
  }
`;
