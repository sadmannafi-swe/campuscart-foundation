import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A small 3D study desk: each object is a CampusCart category. Built from primitives
 * (no model downloads), lit softly, and kept cheap: it only animates while on screen
 * and holds still for people who prefer reduced motion.
 */

export interface DeskItem {
  slug: string;
  label: string;
}

const C = {
  ink: "#14213D",
  inkSoft: "#2B3A5C",
  bloom: "#F4B400",
  bloomDeep: "#C98A00",
  leaf: "#2F9E5B",
  paper: "#FBF7EC",
  page: "#EFE6CF",
  sky: "#7FA7D9",
  orange: "#E8742B",
  wood: "#E9DCC0",
};

/** Desk colour follows the site theme. */
function deskColor() {
  if (typeof document === "undefined") return C.wood;
  return document.documentElement.classList.contains("dark") ? C.inkSoft : C.wood;
}

/** Bobbing, hover-lift and click wrapper shared by every object. */
function Item({
  slug,
  position,
  rotation = [0, 0, 0],
  phase,
  still,
  active,
  onHover,
  onSelect,
  children,
}: {
  slug: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  phase: number;
  still: boolean;
  active: boolean;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const lift = useRef(0);
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    lift.current = THREE.MathUtils.damp(lift.current, active ? 1 : 0, 8, dt);
    const bob = still ? 0 : Math.sin(t * 1.2 + phase) * 0.05;
    g.position.y = position[1] + bob + lift.current * 0.35;
    g.rotation.y =
      rotation[1] + (still ? 0 : Math.sin(t * 0.6 + phase) * 0.08) + lift.current * 0.35;
    const s = 1 + lift.current * 0.08;
    g.scale.setScalar(s);
  });
  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(slug);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(slug);
      }}
    >
      {children}
    </group>
  );
}

function Mat({
  color,
  rough = 0.55,
  metal = 0,
  emissive,
}: {
  color: string;
  rough?: number;
  metal?: number;
  emissive?: string;
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={rough}
      metalness={metal}
      {...(emissive ? { emissive, emissiveIntensity: 0.6 } : {})}
    />
  );
}

function Books() {
  const books: [string, number, number][] = [
    [C.ink, 0.0, 0.06],
    [C.bloom, 0.28, -0.12],
    [C.leaf, 0.54, 0.1],
  ];
  return (
    <group>
      {books.map(([color, y, rot], i) => (
        <group key={i} position={[0, y + 0.13, 0]} rotation={[0, rot, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.26, 1.05]} />
            <Mat color={color} />
          </mesh>
          {/* page block */}
          <mesh position={[0.04, 0, 0]}>
            <boxGeometry args={[1.44, 0.2, 1.07]} />
            <Mat color={C.page} rough={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Laptop({ still }: { still: boolean }) {
  const lid = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!lid.current || still) return;
    lid.current.rotation.x = -0.3 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
  });
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.7, 0.1, 1.15]} />
        <Mat color="#C9CDD6" rough={0.35} metal={0.6} />
      </mesh>
      {/* keyboard */}
      <mesh position={[0, 0.105, -0.08]}>
        <boxGeometry args={[1.45, 0.01, 0.6]} />
        <Mat color={C.inkSoft} />
      </mesh>
      <group ref={lid} position={[0, 0.1, -0.56]} rotation={[-0.3, 0, 0]}>
        <mesh castShadow position={[0, 0.56, 0]}>
          <boxGeometry args={[1.7, 1.12, 0.06]} />
          <Mat color="#C9CDD6" rough={0.35} metal={0.6} />
        </mesh>
        {/* screen: a CampusCart listing glowing */}
        <mesh position={[0, 0.56, 0.035]}>
          <planeGeometry args={[1.56, 0.98]} />
          <Mat color={C.ink} emissive={C.ink} />
        </mesh>
        <mesh position={[-0.35, 0.62, 0.04]}>
          <planeGeometry args={[0.6, 0.6]} />
          <Mat color={C.bloom} emissive={C.bloom} />
        </mesh>
        <mesh position={[0.35, 0.78, 0.04]}>
          <planeGeometry args={[0.6, 0.08]} />
          <Mat color={C.paper} emissive={C.paper} />
        </mesh>
        <mesh position={[0.28, 0.62, 0.04]}>
          <planeGeometry args={[0.46, 0.08]} />
          <Mat color={C.sky} emissive={C.sky} />
        </mesh>
      </group>
    </group>
  );
}

function Pencil() {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 1.5, 6]} />
        <Mat color={C.bloom} />
      </mesh>
      <mesh castShadow position={[0, 0.86, 0]}>
        <coneGeometry args={[0.09, 0.22, 6]} />
        <Mat color={C.wood} />
      </mesh>
      <mesh position={[0, 0.96, 0]}>
        <coneGeometry args={[0.03, 0.06, 6]} />
        <Mat color={C.ink} />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.095, 0.095, 0.12, 12]} />
        <Mat color="#C9CDD6" metal={0.6} rough={0.3} />
      </mesh>
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.1, 12]} />
        <Mat color="#E98A9A" />
      </mesh>
    </group>
  );
}

function Mug({ still }: { still: boolean }) {
  const steam = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!steam.current) return;
    const t = state.clock.elapsedTime;
    steam.current.children.forEach((c, i) => {
      const k = (t * 0.5 + i / 3) % 1;
      c.position.y = 0.75 + k * 0.7;
      c.scale.setScalar(still ? 0 : 0.6 + k * 0.6);
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = still
        ? 0
        : 0.45 * (1 - k);
    });
  });
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.38, 0.33, 0.7, 32]} />
        <Mat color={C.paper} rough={0.3} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 32]} />
        <Mat color="#6B3E1F" rough={0.2} />
      </mesh>
      <mesh castShadow position={[0.42, 0.37, 0]}>
        <torusGeometry args={[0.15, 0.045, 12, 24]} />
        <Mat color={C.paper} rough={0.3} />
      </mesh>
      {/* a daffodil printed on the mug */}
      <mesh position={[0, 0.38, 0.376]}>
        <circleGeometry args={[0.1, 6]} />
        <Mat color={C.bloom} />
      </mesh>
      <group ref={steam}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.1, 0.8, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function GradCap() {
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.38, 32]} />
        <Mat color={C.ink} />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.25, 0.06, 1.25]} />
        <Mat color={C.ink} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <Mat color={C.bloom} />
      </mesh>
      {/* tassel */}
      <mesh position={[0.42, 0.45, 0.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.84, 0.02, 0.02]} />
        <Mat color={C.bloom} />
      </mesh>
      <mesh position={[0.84, 0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.07, 0.36, 10]} />
        <Mat color={C.bloom} />
      </mesh>
    </group>
  );
}

function Ball() {
  const lines = useMemo(() => [0, Math.PI / 2], []);
  return (
    <group position={[0, 0.42, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.42, 32, 32]} />
        <Mat color={C.orange} rough={0.75} />
      </mesh>
      {lines.map((r) => (
        <mesh key={r} rotation={[0, r, 0]}>
          <torusGeometry args={[0.422, 0.012, 8, 48]} />
          <Mat color="#3A1F10" />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.422, 0.012, 8, 48]} />
        <Mat color="#3A1F10" />
      </mesh>
    </group>
  );
}

/** Keeps the whole desk in frame on any screen shape. */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    // wide screens sit closer; tall phone frames step back so the desk fits the width
    const dist = aspect >= 1.4 ? 10.4 : aspect >= 1 ? 11.5 : 14;
    camera.position.set(0, dist * 0.62, dist * 0.82);
    camera.lookAt(0, 0.4, 0.1);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

/** Follows the pointer a little, so the desk feels like a real object you lean over. */
function Rig({ still, children }: { still: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, dt) => {
    if (!g.current) return;
    const tx = still ? 0 : pointer.y * 0.08;
    const ty = still ? 0 : pointer.x * 0.18;
    g.current.rotation.x = THREE.MathUtils.damp(g.current.rotation.x, tx, 3, dt);
    g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, ty, 3, dt);
  });
  return <group ref={g}>{children}</group>;
}

export default function CampusDeskScene({
  active,
  onHover,
  onSelect,
}: {
  active: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);
  const desk = useMemo(deskColor, []);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    io.observe(el);
    return () => {
      io.disconnect();
      document.body.style.cursor = "";
    };
  }, []);

  const common = { still, onHover, onSelect };
  return (
    <div ref={wrap} className="size-full">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible && !still ? "always" : "demand"}
        camera={{ position: [0, 5.7, 7.5], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <FitCamera />
        <ambientLight intensity={0.75} />
        <hemisphereLight args={["#FFF6DD", "#8FA3C7", 0.55]} />
        <directionalLight
          position={[4, 7, 3]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <Rig still={still}>
          {/* desk top */}
          <mesh receiveShadow position={[0, -0.05, 0]}>
            <boxGeometry args={[7.4, 0.12, 4.2]} />
            <meshStandardMaterial color={desk} roughness={0.8} />
          </mesh>
          <Item
            slug="textbooks"
            position={[-2.3, 0, -0.6]}
            rotation={[0, 0.25, 0]}
            phase={0}
            active={active === "textbooks"}
            {...common}
          >
            <Books />
          </Item>
          <Item
            slug="electronics"
            position={[0.1, 0, -0.7]}
            rotation={[0, -0.12, 0]}
            phase={1.2}
            active={active === "electronics"}
            {...common}
          >
            <Laptop still={still} />
          </Item>
          <Item
            slug="services"
            position={[2.35, 0, -0.75]}
            rotation={[0, -0.4, 0]}
            phase={2.1}
            active={active === "services"}
            {...common}
          >
            <GradCap />
          </Item>
          <Item
            slug="stationery"
            position={[-1.1, 0.1, 1.15]}
            rotation={[0, 0.5, 0]}
            phase={3.3}
            active={active === "stationery"}
            {...common}
          >
            <Pencil />
          </Item>
          <Item
            slug="food"
            position={[1.0, 0, 1.15]}
            rotation={[0, -0.3, 0]}
            phase={4.1}
            active={active === "food"}
            {...common}
          >
            <Mug still={still} />
          </Item>
          <Item
            slug="sports"
            position={[2.7, 0, 1.05]}
            phase={5.2}
            active={active === "sports"}
            {...common}
          >
            <Ball />
          </Item>
        </Rig>
      </Canvas>
    </div>
  );
}
