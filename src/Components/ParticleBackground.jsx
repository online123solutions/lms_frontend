import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const ParticleBackground = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine); // ✅ Slim build fixes the checkVersion error
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: true, zIndex: -1 },
        background: {
          color: "#f5f7fa",
        },
        particles: {
          number: { value: 40 },
          shape: {
            type: "image",
            image: [
              {
                src: "/main.webp",
                width: 40,
                height: 40,
              },
              {
                src: "/main.png",
                width: 35,
                height: 35,
              },
            ],
          },
          size: {
            value: 20,
            random: true,
          },
          move: {
            enable: true,
            speed: 2,
            direction: "none",
            outModes: { default: "bounce" },
          },
          opacity: { value: 0.7 },
        },
      }}
    />
  );
};

export default ParticleBackground;
