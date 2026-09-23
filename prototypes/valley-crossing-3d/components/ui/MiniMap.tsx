"use client";

import { useMemo } from "react";
import {
  ELEMENT_MAP,
  ROAD_PATH,
  ROUTE_MAP,
  UNIT_MARKERS,
} from "@/lib/scenario";
import { BRIDGE, riverCenterX } from "@/lib/terrain";
import { ROUTE_COLORS, TACTICAL } from "@/lib/style";
import { useSim } from "@/lib/store";
import type { Vec2 } from "@/lib/types";

// Simplified 2D tactical overview. World x -> map x (east right), world z -> map y
// (north up means smaller z is up). Coordinates are read from the scenario data so
// the mini-map can never drift from the 3D scene.
const W = 232;
const H = 142;
const PAD = 12;
const XMIN = -105;
const XMAX = 95;
const ZMIN = -68;
const ZMAX = 52;

const mapX = (x: number) => PAD + ((x - XMIN) / (XMAX - XMIN)) * (W - 2 * PAD);
const mapY = (z: number) => PAD + ((z - ZMIN) / (ZMAX - ZMIN)) * (H - 2 * PAD);

const toPoints = (pts: Vec2[]) =>
  pts.map(([x, z]) => `${mapX(x).toFixed(1)},${mapY(z).toFixed(1)}`).join(" ");

// Canonical positions, derived from the single source of truth.
const FRIENDLY: Vec2 =
  UNIT_MARKERS.find((m) => m.id === "friendly")?.position ?? [-95, 0];
const ENEMIES: Vec2[] = UNIT_MARKERS.filter((m) => m.faction === "enemy").map(
  (m) => m.position
);
const BRIDGE_POS: Vec2 = [BRIDGE.x, BRIDGE.z];
const VILLAGE: Vec2 = ELEMENT_MAP.village.position;

export function MiniMap() {
  const selectedRoute = useSim((s) => s.selectedRoute);

  const river = useMemo(() => {
    const pts: string[] = [];
    for (let z = ZMIN; z <= ZMAX; z += 5) {
      pts.push(`${mapX(riverCenterX(z)).toFixed(1)},${mapY(z).toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);

  const road = useMemo(() => toPoints(ROAD_PATH), []);

  const route = selectedRoute ? ROUTE_MAP[selectedRoute] : null;
  const routePts = route ? toPoints(route.waypoints) : null;
  const routeColor = route ? ROUTE_COLORS[route.id] : TACTICAL.neutral;
  const start = route ? route.waypoints[0] : null;
  const end = route ? route.waypoints[route.waypoints.length - 1] : null;

  const ridgeX = mapX(64);

  return (
    <div className="minimap">
      <svg
        className="minimap-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="מפה טקטית"
      >
        {/* faint grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={`v${f}`}
            x1={PAD + f * (W - 2 * PAD)}
            y1={PAD}
            x2={PAD + f * (W - 2 * PAD)}
            y2={H - PAD}
            stroke="rgba(200,225,235,0.06)"
            strokeWidth={1}
          />
        ))}
        {[0.33, 0.66].map((f) => (
          <line
            key={`h${f}`}
            x1={PAD}
            y1={PAD + f * (H - 2 * PAD)}
            x2={W - PAD}
            y2={PAD + f * (H - 2 * PAD)}
            stroke="rgba(200,225,235,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* western high ground tint */}
        <ellipse
          cx={mapX(-72)}
          cy={mapY(-6)}
          rx={24}
          ry={28}
          fill="rgba(61,139,255,0.08)"
        />

        {/* enemy ridge zone */}
        <rect
          x={ridgeX}
          y={PAD - 3}
          width={W - PAD - ridgeX}
          height={H - 2 * (PAD - 3)}
          fill="rgba(255,80,68,0.1)"
        />
        <line
          x1={ridgeX}
          y1={PAD - 3}
          x2={ridgeX}
          y2={H - PAD + 3}
          stroke={TACTICAL.enemy}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.6}
        />

        {/* river */}
        <polyline
          points={river}
          fill="none"
          stroke={TACTICAL.losFriendly}
          strokeWidth={2.4}
          opacity={0.5}
          strokeLinecap="round"
        />

        {/* dirt road (reference) */}
        <polyline
          points={road}
          fill="none"
          stroke="rgba(200,225,235,0.32)"
          strokeWidth={1.5}
          strokeDasharray="2 3"
        />

        {/* selected route */}
        {routePts && (
          <>
            <polyline
              points={routePts}
              fill="none"
              stroke={routeColor}
              strokeWidth={2.6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {start && (
              <circle
                cx={mapX(start[0])}
                cy={mapY(start[1])}
                r={3.4}
                fill={routeColor}
              />
            )}
            {end && (
              <circle
                cx={mapX(end[0])}
                cy={mapY(end[1])}
                r={3.4}
                fill="none"
                stroke={routeColor}
                strokeWidth={1.6}
              />
            )}
          </>
        )}

        {/* friendly start */}
        <g>
          <circle
            cx={mapX(FRIENDLY[0])}
            cy={mapY(FRIENDLY[1])}
            r={5.5}
            fill="none"
            stroke={TACTICAL.friendly}
            strokeWidth={1}
            opacity={0.5}
          />
          <circle
            cx={mapX(FRIENDLY[0])}
            cy={mapY(FRIENDLY[1])}
            r={3}
            fill={TACTICAL.friendly}
          />
        </g>

        {/* enemy positions */}
        {ENEMIES.map(([x, z], i) => (
          <rect
            key={i}
            x={mapX(x) - 2.6}
            y={mapY(z) - 2.6}
            width={5.2}
            height={5.2}
            transform={`rotate(45 ${mapX(x)} ${mapY(z)})`}
            fill={TACTICAL.enemy}
          />
        ))}

        {/* bridge */}
        <rect
          x={mapX(BRIDGE_POS[0]) - 3}
          y={mapY(BRIDGE_POS[1]) - 2}
          width={6}
          height={4}
          fill={TACTICAL.observation}
        />

        {/* village objective */}
        <polygon
          points={`${mapX(VILLAGE[0])},${mapY(VILLAGE[1]) - 4.5} ${mapX(VILLAGE[0]) + 4.5},${mapY(VILLAGE[1])} ${mapX(VILLAGE[0])},${mapY(VILLAGE[1]) + 4.5} ${mapX(VILLAGE[0]) - 4.5},${mapY(VILLAGE[1])}`}
          fill={TACTICAL.objective}
        />

        {/* element labels */}
        <g style={{ fontFamily: "var(--font-mono)" }} fontSize={7.4}>
          <text x={mapX(FRIENDLY[0]) + 7} y={mapY(FRIENDLY[1]) - 5} fill={TACTICAL.friendly}>
            מוצא
          </text>
          <text x={ridgeX + 4} y={PAD + 9} fill={TACTICAL.enemy} opacity={0.9}>
            רכס
          </text>
          <text
            x={mapX(BRIDGE_POS[0]) - 17}
            y={mapY(BRIDGE_POS[1]) + 12}
            fill={TACTICAL.observation}
            opacity={0.9}
          >
            גשר
          </text>
          <text x={mapX(VILLAGE[0]) + 7} y={mapY(VILLAGE[1]) + 2.5} fill={TACTICAL.objective}>
            יעד
          </text>
        </g>
      </svg>
      <span className="minimap-compass">צפון ↑</span>
      <span className="minimap-tag">גזרה 7</span>
    </div>
  );
}
