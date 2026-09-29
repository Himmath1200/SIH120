// Dumps demo-engine outputs as JSON so they can be compared with the Python backend (see backend/scripts/parity_check.py)
import * as d from "../src/engine/demo";
const w = { well_id: "WB-101", steam_volume: 2200, injection_pressure: 114, soak_time: 5, production_cutoff: 3.0, stroke_length: 144, spm: 8, vfd_frequency: 60, fluid_level: 220, oil_viscosity: 1800 };
const all = d.optimizeAll(w);
const sim = d.simulate({ well_id: "WB-101", steam_volume: 3000, injection_pressure: 90, soak_time: 10, spm: 5, stroke_length: 100, vfd_frequency: 40, production_cutoff: 3, fluid_level: 220 });
const fail = d.predictFailure({ rod_load: 41, spm: 8, stroke_length: 144, vfd_frequency: 60, fluid_level: 220, pump_load: 14, oil_viscosity: 1800, reservoir_temperature: 60, tubing_pressure: 6, production: 3 });
const srp = d.optimizeSRP(w);
console.log(JSON.stringify({ all: all.combined, allRec: [all.css.recommended, all.srp.recommended], sim: sim.summary, fail: fail.rod_floating_risk_pct, srp: srp.recommended, dash: d.dashboard("WB-103").kpi }));
