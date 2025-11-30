import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import Earth from "./Earth";

function Scene() {
  return (
    <div
      style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0 }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        {/* Lighting */}
        <hemisphereLight
          skyColor={"#ffffff"}
          groundColor={"#444444"}
          intensity={0.9}
        />
        <directionalLight position={[5, 5, 5]} intensity={1.0} castShadow />

        <directionalLight position={[-5, 2, -5]} intensity={0.5} />

        <directionalLight position={[0, -5, 5]} intensity={0.3} />

        {/* Stars background */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Earth model */}
        <Earth />

        {/* Optional orbit controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={1.75} // closest zoom
          maxDistance={4} // farthest zoom
        />
      </Canvas>
    </div>
  );
}

export default Scene;
