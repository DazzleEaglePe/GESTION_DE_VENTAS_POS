import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";

export function NavigationLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Iniciar loader al cambiar de ruta
    setIsNavigating(true);
    setProgress(30);

    // Simular progreso
    const timer1 = setTimeout(() => setProgress(60), 100);
    const timer2 = setTimeout(() => setProgress(90), 200);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 200);
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname]);

  if (!isNavigating) return null;

  return (
    <LoaderContainer>
      <ProgressBar $progress={progress} />
    </LoaderContainer>
  );
}

const LoaderContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 99999;
  background: transparent;
`;

const ProgressBar = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #6c5ce7, #a29bfe, #6c5ce7);
  background-size: 200% 100%;
  animation: shimmer 1s infinite linear;
  width: ${(props) => props.$progress}%;
  transition: width 0.2s ease-out;
  box-shadow: 0 0 10px rgba(108, 92, 231, 0.5);

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;
