export const PLANETS = [
  {
    id: "A",
    name: "Planet A - Azure Coast",
    seed: 1337,
    tint: 0x6dc488,
    water: {
      type: "coast",
      side: "west",
      boundary: 230
    },
    towns: [
      { label: "Harbor Hamlet", x: 300, z: 240, radius: 86, size: "small" },
      { label: "New Meridian", x: 610, z: 500, radius: 120, size: "mid" }
    ],
    church: { x: 690, z: 335 },
    farms: [
      { x: 760, z: 740, radius: 100 },
      { x: 560, z: 790, radius: 90 }
    ],
    mountains: [
      { x: 850, z: 210, radius: 210, height: 56 },
      { x: 815, z: 570, radius: 170, height: 38 }
    ],
    port: { x: 180, z: 520 },
    orbitBeacon: { x: 502, z: 503 },
    clanCamps: [
      { x: 860, z: 860, radius: 54 },
      { x: 450, z: 170, radius: 52 }
    ],
    lakes: [],
    spawnTable: {
      tower: 6,
      planes: 4,
      ships: 3,
      catapults: 4,
      clanUnits: 46,
      cows: 36,
      civilians: 24
    }
  },
  {
    id: "B",
    name: "Planet B - Canyon Lakes",
    seed: 4242,
    tint: 0x92b96a,
    water: {
      type: "lakes"
    },
    towns: [
      { label: "Basin Camp", x: 360, z: 310, radius: 80, size: "small" },
      { label: "Red Gully", x: 700, z: 660, radius: 110, size: "mid" }
    ],
    church: { x: 580, z: 210 },
    farms: [
      { x: 280, z: 760, radius: 92 },
      { x: 670, z: 320, radius: 85 }
    ],
    mountains: [
      { x: 790, z: 220, radius: 185, height: 66 },
      { x: 300, z: 580, radius: 210, height: 58 }
    ],
    port: { x: 430, z: 520 },
    orbitBeacon: { x: 520, z: 515 },
    clanCamps: [
      { x: 880, z: 520, radius: 58 },
      { x: 130, z: 170, radius: 55 }
    ],
    lakes: [
      { x: 460, z: 520, radius: 120 },
      { x: 190, z: 600, radius: 80 },
      { x: 760, z: 430, radius: 86 }
    ],
    spawnTable: {
      tower: 7,
      planes: 5,
      ships: 2,
      catapults: 5,
      clanUnits: 55,
      cows: 30,
      civilians: 21
    }
  }
];

export function getPlanetById(id) {
  return PLANETS.find((planet) => planet.id === id) || PLANETS[0];
}
