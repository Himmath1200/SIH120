"""Simplified, deterministic CSS + SRP physics for the Baghewala Digital Twin prototype.

All numbers are SYNTHETIC. The frontend ships a TypeScript port of this module
(frontend/src/engine/physics.ts) used for DEMO SIMULATION MODE; keep them in sync.
"""
from __future__ import annotations

import math
from typing import Any

G = 9.81
RHO_OIL = 920.0  # kg/m3
OIL_REF_M3 = 600.0  # normalisation for optimisation score
SPM_TO_HZ = 8.0  # VFD frequency that matches a given SPM (simplified gearbox ratio)

# ---------------------------------------------------------------- wells
WELLS: dict[str, dict[str, Any]] = {
    "WB-101": dict(name="Baghewala WB-101", depth=900, reservoir_temperature=42, reservoir_pressure=48,
                   oil_viscosity=3800, current_viscosity=1800, pi=0.085, plunger_dia_in=2.0, rod_weight_kn=22.0, allowable_kn=48.0,
                   frac_pressure=105, tubing_pressure=6,
                   steam_volume=2200, injection_pressure=114, soak_time=5, production_cutoff=3.0,
                   spm=8.0, stroke_length=144, vfd_frequency=60, fluid_level=220),
    "WB-102": dict(name="Baghewala WB-102", depth=850, reservoir_temperature=41, reservoir_pressure=44,
                   oil_viscosity=3100, current_viscosity=1500, pi=0.095, plunger_dia_in=2.0, rod_weight_kn=20.5, allowable_kn=46.0,
                   frac_pressure=100, tubing_pressure=5,
                   steam_volume=2600, injection_pressure=108, soak_time=6, production_cutoff=3.0,
                   spm=7.0, stroke_length=132, vfd_frequency=58, fluid_level=200),
    "WB-103": dict(name="Baghewala WB-103", depth=950, reservoir_temperature=44, reservoir_pressure=52,
                   oil_viscosity=4400, current_viscosity=2100, pi=0.07, plunger_dia_in=2.25, rod_weight_kn=23.6, allowable_kn=52.0,
                   frac_pressure=110, tubing_pressure=7,
                   steam_volume=2400, injection_pressure=120, soak_time=4, production_cutoff=3.0,
                   spm=7.5, stroke_length=144, vfd_frequency=60, fluid_level=260),
    "WB-104": dict(name="Baghewala WB-104", depth=800, reservoir_temperature=40, reservoir_pressure=40,
                   oil_viscosity=2600, current_viscosity=1000, pi=0.105, plunger_dia_in=1.75, rod_weight_kn=19.6, allowable_kn=44.0,
                   frac_pressure=95, tubing_pressure=5,
                   steam_volume=2000, injection_pressure=100, soak_time=7, production_cutoff=2.5,
                   spm=6.5, stroke_length=120, vfd_frequency=54, fluid_level=180),
    "WB-105": dict(name="Baghewala WB-105", depth=1000, reservoir_temperature=45, reservoir_pressure=55,
                   oil_viscosity=5200, current_viscosity=2600, pi=0.06, plunger_dia_in=2.25, rod_weight_kn=24.5, allowable_kn=54.0,
                   frac_pressure=115, tubing_pressure=8,
                   steam_volume=2800, injection_pressure=126, soak_time=4, production_cutoff=3.5,
                   spm=8.0, stroke_length=156, vfd_frequency=60, fluid_level=280),
}

CSS_KEYS = ("steam_volume", "injection_pressure", "soak_time", "production_cutoff")
SRP_KEYS = ("stroke_length", "spm", "vfd_frequency", "fluid_level")


def get_well(well_id: str) -> dict[str, Any]:
    return WELLS.get(well_id, WELLS["WB-101"])


def generic_well(reservoir_temperature: float, reservoir_pressure: float, oil_viscosity: float) -> dict[str, Any]:
    """Template well used for ML dataset generation and free-form prediction."""
    w = dict(WELLS["WB-101"])
    w.update(reservoir_temperature=reservoir_temperature, reservoir_pressure=reservoir_pressure,
             oil_viscosity=oil_viscosity)
    return w


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


# ---------------------------------------------------------------- fluid / steam
def t_sat(p_bar: float) -> float:
    return min(345.0, 100.0 + 44.0 * math.log(max(p_bar, 1.01)))


def viscosity(temp_c: float, mu_ref: float, t_ref: float) -> float:
    """Arrhenius-type heavy-oil viscosity (cP)."""
    return mu_ref * math.exp(4200.0 * (1.0 / (temp_c + 273.15) - 1.0 / (t_ref + 273.15)))


def steam_enthalpy_gj_per_t(t_inj: float) -> float:
    sensible = 4.18 * (t_inj - 25.0)
    latent = 2257.0 * ((374.0 - min(t_inj, 373.0)) / 274.0) ** 0.38
    return (sensible + 0.8 * latent) / 1000.0


# ---------------------------------------------------------------- rod / failure
def rod_failure_risk(rod_load: float, spm: float, stroke: float, mu: float, tubing_p: float = 6.0,
                     vfd: float | None = None, fluid_level: float | None = None) -> dict[str, float]:
    """Analytic rod failure risk (%). Also used to label the ML training data."""
    stroke_m = stroke * 0.0254
    v_peak = 1.57 * 2.0 * stroke_m * spm / 60.0
    alpha = stroke * spm * spm / 70500.0
    drag = 0.22 * math.sqrt(max(mu, 1.0)) * v_peak
    float_ratio = drag / (22.0 * (1.0 - alpha))
    floating = 100.0 * sigmoid(9.0 * (float_ratio - 0.62))
    mismatch = 0.0 if vfd is None else abs(vfd - SPM_TO_HZ * spm) / 20.0
    load_ratio = (rod_load + 0.05 * tubing_p) / 46.0
    overload = 100.0 * sigmoid(10.0 * (load_ratio + 0.03 * mismatch - 1.0))
    pound = 0.0
    if fluid_level is not None:
        pound = 100.0 * sigmoid((70.0 - fluid_level) / 20.0) * 0.5
    total = 100.0 * (1.0 - (1.0 - floating / 100.0) * (1.0 - overload / 100.0) * (1.0 - pound / 100.0))
    return dict(floating=floating, overload=overload, pound=pound, total=total)


def risk_level(pct: float) -> str:
    return "HIGH" if pct >= 60 else "MEDIUM" if pct >= 30 else "LOW"


def rod_loads(well: dict, stroke: float, spm: float, mu: float, fluid_level: float) -> dict[str, float]:
    ap = math.pi * (well["plunger_dia_in"] * 0.0254) ** 2 / 4.0
    stroke_m = stroke * 0.0254
    alpha = stroke * spm * spm / 70500.0
    v_peak = 1.57 * 2.0 * stroke_m * spm / 60.0
    w_rod = well["rod_weight_kn"]
    f_fluid = ap * RHO_OIL * G * max(well["depth"] - fluid_level, 0.0) / 1000.0
    drag = 0.22 * math.sqrt(max(mu, 1.0)) * v_peak * (well["depth"] / 900.0)
    peak = w_rod * (1.0 + alpha) + f_fluid + 0.3 * drag
    minimum = w_rod * (1.0 - alpha) - drag
    return dict(ap=ap, stroke_m=stroke_m, alpha=alpha, peak=peak, minimum=minimum,
                pump_load=f_fluid + 0.3 * drag, drag=drag, f_fluid=f_fluid)


# ---------------------------------------------------------------- SRP steady state
def srp_state(well: dict, stroke: float, spm: float, vfd: float, fluid_level: float, mu: float,
              p_res: float | None = None, oil_cut: float = 0.6, mu_inflow: float | None = None) -> dict[str, float]:
    """Steady-state pump performance at pump-depth viscosity `mu`."""
    p_res = well["reservoir_pressure"] if p_res is None else p_res
    loads = rod_loads(well, stroke, spm, mu, fluid_level)
    cap = loads["ap"] * loads["stroke_m"] * spm * 1440.0 * 0.88
    pwf = well["tubing_pressure"] * 0.4 + 2.0 + fluid_level * RHO_OIL * G / 1e5
    mu_cold = well["oil_viscosity"]
    inflow = well["pi"] * max(p_res - pwf, 0.0) * (mu_cold / max(mu if mu_inflow is None else mu_inflow, 1.0)) ** 0.55
    fluid = min(inflow, cap)
    fillage = fluid / cap if cap > 0 else 0.0
    oil = fluid * oil_cut
    hydraulic_kw = fluid / 86400.0 * RHO_OIL * G * max(well["depth"] - fluid_level, 0.0) / 1000.0
    mech_kw = (loads["f_fluid"] + 0.5 * loads["drag"] + 0.08 * well["rod_weight_kn"]) * loads["stroke_m"] * spm / 60.0
    eta_drive = clamp(0.94 - 0.004 * abs(vfd - SPM_TO_HZ * spm), 0.7, 0.94)
    elec_kw = mech_kw / (0.9 * eta_drive)
    risk = rod_failure_risk(loads["peak"], spm, stroke, mu, well["tubing_pressure"], vfd, fluid_level)
    return dict(oil_rate=oil, fluid_rate=fluid, pump_capacity=cap, fillage=fillage,
                pump_efficiency=100.0 * fillage * 0.88, system_efficiency=100.0 * hydraulic_kw / max(elec_kw, 1e-6),
                electrical_kw=elec_kw, kwh_per_day=elec_kw * 24.0, rod_load=loads["peak"],
                min_rod_load=loads["minimum"], pump_load=loads["pump_load"],
                floating_risk=risk["floating"], overload_risk=risk["overload"], failure_risk=risk["total"],
                allowable=well["allowable_kn"], load_ratio=loads["peak"] / well["allowable_kn"])


# ---------------------------------------------------------------- CSS cycle
def css_cycle(well: dict, steam_volume: float, injection_pressure: float, soak_time: float,
              production_cutoff: float, stroke: float, spm: float, vfd: float, fluid_level: float,
              inj_temp: float | None = None, step: int = 1, max_days: int = 720,
              want_series: bool = False) -> dict[str, Any]:
    t_res = well["reservoir_temperature"]
    p_res = well["reservoir_pressure"]
    mu_cold = well["oil_viscosity"]
    t_inj = inj_temp if inj_temp is not None else t_sat(injection_pressure)
    frac = well["frac_pressure"]
    frac_pen = 1.0 if injection_pressure <= frac else max(0.55, 1.0 - 0.025 * (injection_pressure - frac))
    hf = 0.80 * (1.0 - math.exp(-steam_volume / 1300.0))
    soak_f = 0.55 + 0.45 * max(0.0, 1.0 - ((soak_time - 12.0) / 16.0) ** 2)
    t_hot = t_res + (t_inj - t_res) * hf * soak_f * frac_pen
    tau_t = 75.0 + 0.012 * steam_volume
    dp0 = 0.30 * max(0.0, injection_pressure - p_res) * (1.0 - math.exp(-steam_volume / 2500.0)) * frac_pen
    energy_steam = steam_volume * steam_enthalpy_gj_per_t(t_inj)

    series: list[dict[str, float]] = []
    total_oil = 0.0
    kwh = 0.0
    peak_rate = 0.0
    peak_risk = 0.0
    risk_sum = 0.0
    n = 0
    cycle_days = 0
    ended = False
    sum_eff = 0.0
    sum_load = 0.0
    sum_pump = 0.0
    t = 0
    while t < max_days:
        temp = t_res + (t_hot - t_res) * math.exp(-t / tau_t)
        mu = viscosity(temp, mu_cold, t_res)
        p_near = p_res + dp0 * math.exp(-t / 45.0)
        oil_cut = 0.75 - 0.5 * math.exp(-t / 40.0)
        s = srp_state(well, stroke, spm, vfd, fluid_level, mu, p_res=p_near, oil_cut=oil_cut)
        rate = s["oil_rate"]
        peak_rate = max(peak_rate, rate)
        if not ended and t > 8 and rate < production_cutoff:
            ended = True
            cycle_days = t
        if want_series:
            series.append(dict(day=t, temperature=temp, viscosity=mu, pressure=p_near, production=rate,
                               pump_load=s["pump_load"], rod_load=s["rod_load"], fluid_rate=s["fluid_rate"],
                               failure_risk=s["failure_risk"], floating_risk=s["floating_risk"],
                               cum_oil=total_oil, sor=steam_volume / total_oil if total_oil > 1 else 0.0))
        if ended and not want_series:
            break
        if not ended:
            total_oil += rate * step
            kwh += s["kwh_per_day"] * step
            risk_sum += s["failure_risk"]
            peak_risk = max(peak_risk, s["failure_risk"])
            sum_eff += s["pump_efficiency"]
            sum_load = max(sum_load, s["rod_load"])
            sum_pump = max(sum_pump, s["pump_load"])
            n += 1
        elif want_series and t > cycle_days + 15:
            break
        t += step
    if not ended:
        cycle_days = t
    total_oil = max(total_oil, 1e-6)
    sor = steam_volume / total_oil
    energy_pump = kwh * 0.0036
    energy_total = energy_steam + energy_pump
    n = max(n, 1)
    return dict(t_inj=t_inj, t_hot=t_hot, frac_penalty=frac_pen, cycle_days=cycle_days, cycle_oil=total_oil,
                avg_rate=total_oil / max(cycle_days, 1), peak_rate=peak_rate, sor=sor,
                energy_steam=energy_steam, energy_pump=energy_pump, energy_total=energy_total,
                energy_per_m3=energy_total / total_oil, avg_risk=risk_sum / n, peak_risk=peak_risk,
                avg_pump_eff=sum_eff / n, max_rod_load=sum_load, max_pump_load=sum_pump, series=series,
                mu_hot=viscosity(t_hot, mu_cold, t_res), mu_cold=mu_cold)


def css_score(cycle_oil: float, sor: float) -> float:
    prod_norm = cycle_oil / (cycle_oil + OIL_REF_M3)
    sor_norm = clamp(1.0 - (sor - 1.0) / 7.0, 0.0, 1.0)
    return 100.0 * (0.4 * prod_norm + 0.6 * sor_norm)


# ---------------------------------------------------------------- optimisers
def optimize_css(well: dict, production_cutoff: float, srp: dict[str, float]) -> dict[str, Any]:
    best = None
    lim = min(well["frac_pressure"], 110)
    pressures = [p for p in range(50, int(lim) + 1, 10)]
    for v in range(1000, 5001, 500):
        for p in pressures:
            for soak in range(4, 25, 2):
                c = css_cycle(well, v, p, soak, production_cutoff, srp["stroke_length"], srp["spm"],
                              srp["vfd_frequency"], srp["fluid_level"], step=3)
                sc = css_score(c["cycle_oil"], c["sor"]) - 0.15 * max(c["avg_risk"] - 30.0, 0.0)
                if best is None or sc > best[0]:
                    best = (sc, v, p, soak)
    _, v, p, soak = best
    return dict(steam_volume=v, injection_pressure=p, soak_time=soak)


def evaluate_css(well, css, srp) -> dict[str, Any]:
    c = css_cycle(well, css["steam_volume"], css["injection_pressure"], css["soak_time"],
                  css["production_cutoff"], srp["stroke_length"], srp["spm"], srp["vfd_frequency"],
                  srp["fluid_level"])
    c["score"] = css_score(c["cycle_oil"], c["sor"])
    return c


STROKES = (60, 72, 84, 96, 108, 120, 132, 144, 156, 168)


def optimize_srp(well: dict, fluid_level: float, mu: float, mu_inflow: float | None = None) -> dict[str, Any]:
    best = None
    fallback = None
    for stroke in STROKES:
        for k in range(4, 21):
            spm = k * 0.5
            vfd = clamp(SPM_TO_HZ * spm, 30.0, 60.0)
            s = srp_state(well, stroke, spm, vfd, fluid_level, mu, mu_inflow=mu_inflow)
            obj = s["oil_rate"] - 0.02 * s["kwh_per_day"] - 4.0 * max(0.0, 0.7 - s["fillage"])
            if fallback is None or s["failure_risk"] < fallback[0]:
                fallback = (s["failure_risk"], stroke, spm, vfd)
            if s["failure_risk"] <= 30.0 and s["load_ratio"] <= 0.9 and (best is None or obj > best[0]):
                best = (obj, stroke, spm, vfd)
    pick = best if best else fallback
    return dict(stroke_length=pick[1], spm=pick[2], vfd_frequency=pick[3])


def avg_rate_first_days(well: dict, css: dict, srp: dict, days: int = 90) -> float:
    """Mean oil rate (m3/d) over the first `days` of production. Target of the ML production model."""
    c = css_cycle(well, css["steam_volume"], css["injection_pressure"], css["soak_time"],
                  css["production_cutoff"], srp["stroke_length"], srp["spm"], srp["vfd_frequency"],
                  srp["fluid_level"], max_days=days, want_series=True)
    return sum(r["production"] for r in c["series"]) / max(len(c["series"]), 1)


def optimize_srp_cycle(well: dict, css: dict, fluid_level: float) -> dict[str, Any]:
    """Pick SRP settings by simulating the whole CSS cycle: maximise oil, penalise rod risk and power."""
    best = None
    for stroke in STROKES:
        for k in range(4, 21):
            spm = k * 0.5
            vfd = clamp(SPM_TO_HZ * spm, 30.0, 60.0)
            c = css_cycle(well, css["steam_volume"], css["injection_pressure"], css["soak_time"],
                          css["production_cutoff"], stroke, spm, vfd, fluid_level, step=5)
            obj = c["cycle_oil"] - 12.0 * max(0.0, c["peak_risk"] - 35.0) - 0.02 * c["energy_pump"] * 1000.0 / 3.6
            if best is None or obj > best[0]:
                best = (obj, stroke, spm, vfd)
    return dict(stroke_length=best[1], spm=best[2], vfd_frequency=best[3])
