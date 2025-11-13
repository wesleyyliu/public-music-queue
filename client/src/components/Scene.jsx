// Scene.jsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Scene() {
  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0, // stays behind UI
      }}
      camera={{ position: [0, 0, 5], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} />

      {/* Example: rotating box */}
      <mesh rotation={[0.4, 0.2, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>

      <OrbitControls />
    </Canvas>
  );
}

export default Scene;
