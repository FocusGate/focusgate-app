"use client";

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";

const WIDTH = 800;
const HEIGHT = 420;

type CountryPath = { id: string; name: string; d: string };
type CountryProps = { name: string };

/** Computed once at module load — the topology itself never changes, so there's no reason
 *  to re-run the projection/path generation on every render or every question. Antarctica
 *  is dropped: it's never a quiz target and its shape under most world projections just
 *  adds a distracting band across the bottom of the map. */
const COUNTRY_PATHS: CountryPath[] = (() => {
  const topology = worldTopology as unknown as Topology;
  const collection = topology.objects.countries as GeometryCollection<CountryProps>;
  const geo = feature<CountryProps>(topology, collection);
  const features = geo.features;
  const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], geo);
  const path = geoPath(projection);

  return features
    .filter((f) => f.properties?.name !== "Antarctica")
    .map((f) => ({
      id: String(f.id),
      name: (f.properties?.name as string) ?? "",
      d: path(f) ?? "",
    }))
    .filter((c) => c.d);
})();

export default function WorldMap({ highlightName, accent }: { highlightName: string; accent: string }) {
  const highlighted = useMemo(() => COUNTRY_PATHS.find((c) => c.name === highlightName), [highlightName]);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" style={{ display: "block" }}>
      {COUNTRY_PATHS.map((c, i) => (
        <path
          // A few disputed territories (Kosovo, Somaliland, N. Cyprus) have no ISO numeric
          // code in this dataset and all come through with id `null` — index is safe here
          // since COUNTRY_PATHS is computed once at module load and never reorders.
          key={`${c.id}-${i}`}
          d={c.d}
          fill={c.name === highlightName ? accent : "#1a1a1e"}
          stroke={c.name === highlightName ? accent : "#2a2a30"}
          strokeWidth={c.name === highlightName ? 1.2 : 0.6}
          style={
            c.name === highlightName
              ? { filter: `drop-shadow(0 0 6px ${accent})`, transition: "fill 0.4s ease" }
              : { transition: "fill 0.4s ease" }
          }
        />
      ))}
      {highlighted && <path d={highlighted.d} fill="none" stroke={accent} strokeWidth={1.5} />}
    </svg>
  );
}
