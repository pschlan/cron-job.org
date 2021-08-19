import { useEffect, useState } from "react";

function isMobileScreenSize() {
  return window.innerWidth < 768;
}

export default function useViewport() {
  const [isMobile, setIsMobile] = useState(isMobileScreenSize());

  useEffect(() => {
    const listener = () => {
      setIsMobile(isMobileScreenSize());
    };
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  });

  return {
    isMobile
  };
}
