import styled from "styled-components";
import { DatePicker } from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useDashboardStore } from "../../../store/DashboardStore";
const { RangePicker } = DatePicker;
export const DateRangeFilter = () => {
  const [dates, setDates] = useState([
    dayjs("1900-01-01"),
    dayjs("9999-12-31"),
  ]);

  const [singleDate, setSingleDate] = useState(null);
  const [activeRange, setActiveRange] = useState("Todo");

  const { setRangoFechas, fechaInicio, fechaFin,limpiarFechas } = useDashboardStore();

  //para mostrar todas las fechas
  const setSiempreRange = () => {
    const startDate = dayjs("1900-01-01");
    const endDate = dayjs("9999-12-31");
    setDates([startDate, endDate]);
    setActiveRange("Todo");
    setRangoFechas(
      startDate.format("YYYY-MM-DD"),
      endDate.format("YYYY-MM-DD")
    );
  };
  const handleDateChange = (val) => {
    setDates(val || []);
    if (val) {
      setRangoFechas(val[0].format("YYYY-MM-DD"), val[1].format("YYYY-MM-DD"));
    }
  };
  const handleSingleDateChange = (date) => {
    setSingleDate(date);
    setDates([]);
    if (date) {
      setRangoFechas(date.format("YYYY-MM-DD"), date.format("YYYY-MM-DD"));
    }
    setActiveRange("Por Día");
  };
  // Función para establecer un rango predefinido
  const setPresetRange = (days, rangeName) => {
    const startDate = dayjs().subtract(days, "day").startOf("day");
    const endDate = dayjs().endOf("day");
    setDates([startDate, endDate]);
    setRangoFechas(
      startDate.format("YYYY-MM-DD"),
      endDate.format("YYYY-MM-DD")
    );
    setActiveRange(rangeName);
  };
  const selectToday = () => {
    const today = dayjs().startOf("day");
    setSingleDate(today);
    setDates([]);
    setRangoFechas(today.format("YYYY-MM-DD"), today.format("YYYY-MM-DD"));
    setActiveRange("Hoy");
  };
  useEffect(()=>{
    setSiempreRange()
  },[])

  return (
    <Container>
     
      <ButtonGroup>
        <TimeRangeButton
          onClick={setSiempreRange}
          isActive={activeRange === "Todo"}
        >
          Todo
        </TimeRangeButton>
        <TimeRangeButton
          isActive={activeRange === "7 días"}
          onClick={() => setPresetRange(7, "7 días")}
        >
          Últimos días 7 dias
        </TimeRangeButton>
        <TimeRangeButton
          isActive={activeRange === "30 días"}
          onClick={() => setPresetRange(30, "30 días")}
        >
          Últimos 30 días
        </TimeRangeButton>
        <TimeRangeButton
          isActive={activeRange === "12 meses"}
          onClick={() => setPresetRange(365, "12 meses")}
        >
          Últimos 12 meses
        </TimeRangeButton>
        <TimeRangeButton isActive={activeRange === "Hoy"} onClick={selectToday}>
          Hoy
        </TimeRangeButton>
        <TimeRangeButton
          isActive={activeRange === "Por Día"}
          onClick={() => setActiveRange("Por Día")}
        >
          Por Día
        </TimeRangeButton>
        <TimeRangeButton
          isActive={activeRange === "Limpiar"}
          onClick={()=>{
            setDates([])
            setSingleDate(null)
            limpiarFechas()
            setActiveRange("Rango")
          }}
        >
          Limpiar
        </TimeRangeButton>


      </ButtonGroup>
      {(activeRange === "30 días" ||
        activeRange === "12 meses" ||
        activeRange === "7 días") && (
        <StyledRangePicker format="YYYY-MM-DD" onChange={handleDateChange} value={dates} />
      )}
      {activeRange === "Por Día" && (
        <StyledDatePicker format="YYYY-MM-DD" onChange={handleSingleDateChange} />
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const TimeRangeButton = styled.button`
  color: ${({ isActive }) => isActive ? '#111' : '#6b7280'};
  background-color: ${({ isActive }) => isActive ? '#f3f4f6' : 'transparent'};
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  font-weight: ${({ isActive }) => isActive ? '600' : '500'};
  transition: all 0.15s ease;
  
  &:hover {
    background-color: #f3f4f6;
    color: #111;
  }
`;

const StyledRangePicker = styled(RangePicker)`
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  
  .ant-picker-input > input {
    color: #111;
    font-weight: 500;
    font-size: 13px;
  }
  
  .ant-picker-input input::placeholder {
    color: #9ca3af;
  }
  
  .ant-picker-suffix {
    color: #6b7280;
  }
  
  &:hover {
    border-color: #d1d5db;
  }
  
  &:focus,
  &.ant-picker-focused {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`;

const StyledDatePicker = styled(DatePicker)`
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  
  .ant-picker-input > input {
    color: #111;
    font-weight: 500;
    font-size: 13px;
  }
  
  .ant-picker-input input::placeholder {
    color: #9ca3af;
  }
  
  .ant-picker-suffix {
    color: #6b7280;
  }
  
  &:hover {
    border-color: #d1d5db;
  }
  
  &:focus,
  &.ant-picker-focused {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`;
