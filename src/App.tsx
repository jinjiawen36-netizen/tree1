import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#051005' }}>
      <Canvas>
        <ambientLight intensity={1} />
        <pointLight position={[10, 10, 10]} />
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="gold" metalness={1} roughness={0} />
        </mesh>
        <OrbitControls />
      </Canvas>
      <h1 style={{ position: 'absolute', color: 'gold', top: 20, left: 20 }}>
        如果看到金球，说明 3D 环境通了！
      </h1>
    </div>
  );
}