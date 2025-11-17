import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";

function Scene() {
  return (
    <div style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        {/* Stars background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Optional orbit controls */}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}

export default Scene;
