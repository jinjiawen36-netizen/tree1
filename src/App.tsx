import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- 配置 ---
const CONFIG = {
  colors: {
    primary: '#004225', 
    gold: '#FFD700',    
  },
  counts: {
    foliage: 8000, // 稍微减少点数量保证流畅
    ornaments: 120,
  }
};

// --- 工具函数 ---
const getTreePosition = (yRatio: number) => {
  const y = (yRatio - 0.5) * 8;
  const radius = (1 - yRatio) * 3; 
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
};

const getScatteredPosition = () => {
  return new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 8 + 4);
};

// --- 针叶粒子 ---
const Foliage = ({ mode }: { mode: string }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions, scatterPos] = useMemo(() => {
    const p = [], s = [];
    for (let i = 0; i < CONFIG.counts.foliage; i++) {
      const tp = getTreePosition(Math.random());
      const sp = getScatteredPosition();
      p.push(tp.x, tp.y, tp.z);
      s.push(sp.x, sp.y, sp.z);
    }
    return [new Float32Array(p), new Float32Array(s)];
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    const target = mode === 'SCATTERED' ? 1 : 0;
    mat.uniforms.uProgress.value = THREE.MathUtils.lerp(mat.uniforms.uProgress.value, target, delta * 2);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScatter" count={scatterPos.length / 3} array={scatterPos} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ uProgress: { value: 0 } }}
        vertexShader={`
          attribute vec3 aScatter;
          uniform float uProgress;
          void main() {
            vec3 pos = mix(position, aScatter, uProgress);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = 4.0 * (10.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          void main() {
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            gl_FragColor = vec4(0.05, 0.4, 0.2, 1.0 - dist * 2.0); // 柔和翡翠绿
          }
        `}
      />
    </points>
  );
};

// --- 装饰物 ---
const Ornaments = ({ mode }: { mode: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();
  const items = useMemo(() => {
    return Array.from({ length: CONFIG.counts.ornaments }, () => ({
      tPos: getTreePosition(Math.random()),
      sPos: getScatteredPosition(),
      curPos: new THREE.Vector3().copy(getTreePosition(Math.random())),
    }));
  }, []);

  useFrame((state, delta) => {
    items.forEach((item, i) => {
      const target = mode === 'SCATTERED' ? item.sPos : item.tPos;
      item.curPos.lerp(target, delta * 3);
      dummy.position.copy(item.curPos);
      dummy.scale.setScalar(0.15);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, CONFIG.counts.ornaments]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color={CONFIG.colors.gold} metalness={0.8} roughness={0.1} />
    </instancedMesh>
  );
};

// --- 主场景 ---
export default function App() {
  const [mode, setMode] = useState<'TREE' | 'SCATTERED'>('TREE');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000805' }}>
      <Canvas shadow={false}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color={CONFIG.colors.gold} />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#00ff88" />
        
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        <Foliage mode={mode} />
        <Ornaments mode={mode} />

        <OrbitControls enablePan={false} />
      </Canvas>

      <div style={{ position: 'absolute', bottom: '40px', width: '100%', textAlign: 'center' }}>
        <button 
          onClick={() => setMode(m => m === 'TREE' ? 'SCATTERED' : 'TREE')}
          style={{
            padding: '15px 35px', background: 'transparent', 
            border: '2px solid gold', color: 'gold', 
            cursor: 'pointer', fontSize: '16px', borderRadius: '30px',
            textShadow: '0 0 10px gold', boxShadow: '0 0 15px rgba(255,215,0,0.3)'
          }}
        >
          {mode === 'TREE' ? '✨ 让美梦炸裂 ✨' : '🎄 让奇迹重聚 🎄'}
        </button>
      </div>
    </div>
  );
}