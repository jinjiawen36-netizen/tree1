import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- 1. 配置与艺术指导参数 ---
const CONFIG = {
  colors: {
    primary: '#004225', // 祖母绿
    gold: '#FFD700',    // 金属金
  },
  counts: {
    foliage: 15000, 
    ornaments: 200,
  }
};

// --- 2. 数学工具函数 ---
const getTreePosition = (yRatio: number) => {
  const y = (yRatio - 0.5) * 8;
  const radius = (1 - yRatio) * 3; 
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
};

const getScatteredPosition = () => {
  return new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 10 + 5);
};

// --- 3. 针叶粒子组件 ---
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
    mat.uniforms.uTime.value = state.clock.elapsedTime;
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
        uniforms={{ uTime: { value: 0 }, uProgress: { value: 0 } }}
        vertexShader={`
          attribute vec3 aScatter;
          uniform float uProgress;
          void main() {
            vec3 pos = mix(position, aScatter, uProgress);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = 3.0 * (10.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          void main() {
            if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
            gl_FragColor = vec4(0.0, 0.26, 0.15, 1.0); // 翡翠绿
          }
        `}
      />
    </points>
  );
};

// --- 4. 装饰物系统 ---
const Ornaments = ({ mode }: { mode: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();
  const items = useMemo(() => {
    return Array.from({ length: CONFIG.counts.ornaments }, () => ({
      tPos: getTreePosition(Math.random()),
      sPos: getScatteredPosition(),
      curPos: new THREE.Vector3(),
    }));
  }, []);

  useFrame((state, delta) => {
    items.forEach((item, i) => {
      const target = mode === 'SCATTERED' ? item.sPos : item.tPos;
      item.curPos.lerp(target, delta * 2);
      dummy.position.copy(item.curPos);
      dummy.scale.setScalar(0.2);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, CONFIG.counts.ornaments]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color={CONFIG.colors.gold} metalness={0.9} roughness={0.1} />
    </instancedMesh>
  );
};

// --- 5. 主场景 ---
export default function App() {
  const [mode, setMode] = useState<'TREE' | 'SCATTERED'>('TREE');

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color={CONFIG.colors.gold} />
        <Environment preset="city" />

        <Foliage mode={mode} />
        <Ornaments mode={mode} />

        <EffectComposer>
          <Bloom luminanceThreshold={0.2} intensity={1.5} />
          <Vignette />
        </EffectComposer>
        <OrbitControls />
      </Canvas>

      <button 
        onClick={() => setMode(m => m === 'TREE' ? 'SCATTERED' : 'TREE')}
        style={{
          position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
          padding: '12px 24px', background: 'gold', border: 'none', cursor: 'pointer', fontWeight: 'bold'
        }}
      >
        {mode === 'TREE' ? 'EXPLODE (炸裂)' : 'REASSEMBLE (聚合)'}
      </button>
    </div>
  );
}