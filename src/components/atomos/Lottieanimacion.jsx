import Lottie from "lottie-react";

export function Lottieanimacion({ alto, ancho, animacion }) {
  return (
    <>
      <Lottie 
        animationData={animacion} 
        loop={true}
        autoplay={true}
        style={{ height: `${alto}px`, width: `${ancho}px` }} 
      />
    </>
  );
}
