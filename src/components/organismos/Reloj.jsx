import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Device } from "../../styles/breakpoints";

export function Reloj() {
  const [hora, setHora] = useState("");
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    const mostrarReloj = () => {
      const fechaActual = new Date();
      const horaActual = fechaActual.getHours();
      const minutosActual = fechaActual.getMinutes();
      const segundosActual = fechaActual.getSeconds();
      const mesActual = fechaActual.getMonth();
      const diaActual = fechaActual.getDate();
      const añoActual = fechaActual.getFullYear();

      const dias = [
        "domingo",
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
      ];
      const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];

      const mes = meses[mesActual];
      const hr = horaActual > 12 ? horaActual - 12 : horaActual;
      const am = horaActual < 12 ? "AM" : "PM";

      const formattedHora = horaActual < 10 ? "0" + horaActual : horaActual;
      const formattedMinutos =
        minutosActual < 10 ? "0" + minutosActual : minutosActual;
      const formattedSegundos =
        segundosActual < 10 ? "0" + segundosActual : segundosActual;

      setHora(`${hr}:${formattedMinutos}:${formattedSegundos}${am}`);
      setFecha(
        `${dias[fechaActual.getDay()]} ${diaActual} ${mes} del ${añoActual}`
      );
    };

    const intervalId = setInterval(mostrarReloj, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Container>
      <TimeRow>
        <Icon icon="lucide:clock" />
        <Time>{hora}</Time>
      </TimeRow>
      <Date>{fecha}</Date>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`;

const TimeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #111;

  svg {
    font-size: 16px;
    color: #666;
  }
`;

const Time = styled.span`
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const Date = styled.span`
  font-size: 12px;
  color: #666;
  text-transform: capitalize;
`;