import { useState, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Edges } from '@react-three/drei'
import { PYRAMID_TIERS, GROUND_Y } from './pyramidGeometry.js'

const LOOK_AT = [0, -0.12, 0]

// ממקד את המצלמה אל הפירמידה (נחוץ במוקטן שאין בו OrbitControls).
function CameraFraming({ target }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.lookAt(target[0], target[1], target[2])
  }, [camera, target])
  return null
}

/**
 * PyramidModel — פירמידה תלת־ממדית אמיתית (WebGL / react-three-fiber).
 * שלוש שכבות נפחיות מלאות, מוערמות לפירמידה רציפה שמסתיימת בקודקוד אמיתי.
 * משמש גם בפירמידה הראשית (variant="main", ניתנת לסיבוב) וגם במוקטנת
 * (variant="mini", זווית קבועה) — אותה גאומטריה, אותה תאורה, אותו קוד.
 *
 * props:
 *  - levels:        מערך הרמות מתוך levels.js
 *  - selectedLevel: id הרמה הפעילה (מצב משותף)
 *  - onSelectLevel: (id) => void — מטפל בחירה משותף (גם ללחיצה על שכבה)
 *  - variant:       'main' | 'mini'
 */
function Tier({ level, dims, isSelected, isHovered, onSelect, onHover }) {
  return (
    <mesh
      position={[0, dims.y, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(level.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(level.id)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onHover(null)
      }}
    >
      <cylinderGeometry args={[dims.rTop, dims.rBot, dims.h, 4]} />
      <meshStandardMaterial
        color={level.color.main}
        emissive={level.color.strong}
        emissiveIntensity={isSelected ? 0.45 : isHovered ? 0.22 : 0}
        roughness={0.5}
        metalness={0.08}
        flatShading
      />
      {isSelected && <Edges threshold={1} scale={1.015} color="#ffffff" />}
    </mesh>
  )
}

export default function PyramidModel({
  levels,
  selectedLevel,
  onSelectLevel,
  variant = 'main',
}) {
  const [hover, setHover] = useState(null)
  const isMain = variant === 'main'

  return (
    <div
      className={`pyramid-canvas pyramid-canvas--${variant}`}
      style={{ cursor: hover ? 'pointer' : isMain ? 'grab' : 'default' }}
      role="img"
      aria-label="מודל תלת־ממדי של פירמידת רמות המלחמה. ניתן לסובב בגרירה וללחוץ על שכבה."
    >
      <Canvas
        camera={{
          position: isMain ? [0, 1.6, 4.9] : [1.9, 1.7, 4.7],
          fov: isMain ? 34 : 32,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 7, 4]} intensity={1.5} />
        <directionalLight position={[-5, 3, -2]} intensity={0.3} />

        {/* ללא סיבוב: פינה (מקצוע) פונה אל המצלמה כך ששתי פאות מוצללות נראות —
            מראה נפחי תלת־ממדי ברור (ולא פאה שטוחה אחת). */}
        <group rotation={[0, 0, 0]}>
          {levels.map((level) => (
            <Tier
              key={level.id}
              level={level}
              dims={PYRAMID_TIERS[level.id]}
              isSelected={selectedLevel === level.id}
              isHovered={hover === level.id}
              onSelect={onSelectLevel}
              onHover={setHover}
            />
          ))}
        </group>

        <ContactShadows
          position={[0, GROUND_Y, 0]}
          opacity={0.5}
          scale={6}
          blur={2.6}
          far={4}
          resolution={512}
          color="#3a2e14"
        />

        {isMain ? (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.08}
            minPolarAngle={Math.PI * 0.3}
            maxPolarAngle={Math.PI * 0.46}
            minAzimuthAngle={-Math.PI / 4}
            maxAzimuthAngle={Math.PI / 4}
            target={LOOK_AT}
          />
        ) : (
          <CameraFraming target={LOOK_AT} />
        )}
      </Canvas>
    </div>
  )
}
