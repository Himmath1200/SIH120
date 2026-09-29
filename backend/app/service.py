"""Business logic behind the API endpoints (kept free of FastAPI so it is easy to test)."""
from __future__ import annotations

import math
from functools import lru_cache
from typing import Any

from . import ml
from . import physics as ph


# ------------------------------------------------------------------ helpers
def _noise(day: float, k: int) -> float:
    """Deterministic pseudo-noise in [-1, 1) (same formula in the frontend demo engine)."""
    x = math.sin(day * 12.9898 + k * 78.233) * 43758.5453
    return 2.0 * (x - math.floor(x)) - 1.0


def _r(x: float, n: int = 2) -> float:
    return round(float(x), n)


def well_srp(well: dict) -> dict[str, float]:
    return {k: well[k] for k in ph.SRP_KEYS}


def well_css(well: dict) -> dict[str, float]:
    return {k: well[k] for k in ph.CSS_KEYS}


def css_metrics(c: dict) -> dict[str, float]:
    return dict(cycle_oil_m3=_r(c["cycle_oil"], 1), cycle_days=c["cycle_days"], avg_rate_m3d=_r(c["avg_rate"]),
                sor=_r(c["sor"]), energy_gj=_r(c["energy_total"], 1), energy_per_m3_gj=_r(c["energy_per_m3"]),
                hot_temperature_c=_r(c["t_hot"], 1), hot_viscosity_cp=_r(c["mu_hot"], 1), score=_r(c["score"], 1))


def srp_metrics(well: dict, stroke: float, spm: float, vfd: float, level: float, mu: float,
                mu_inflow: float | None = None) -> dict[str, Any]:
    s = ph.srp_state(well, stroke, spm, vfd, level, mu, mu_inflow=mu_inflow)
    return dict(stroke_length=_r(stroke, 1), spm=_r(spm, 1), vfd_frequency=_r(vfd, 1),
                pump_efficiency=_r(s["pump_efficiency"], 1), system_efficiency=_r(s["system_efficiency"], 1),
                rod_load=_r(s["rod_load"]), min_rod_load=_r(s["min_rod_load"]), pump_load=_r(s["pump_load"]),
                rod_failure_risk=_r(s["failure_risk"], 1), rod_floating_risk=_r(s["floating_risk"], 1),
                risk_level=ph.risk_level(s["floating_risk"]), production_m3d=_r(s["oil_rate"]),
                kwh_per_day=_r(s["kwh_per_day"], 1), fillage=_r(s["fillage"], 3))


def _pick(d: dict, keys) -> dict[str, float]:
    return {k: float(d[k]) for k in keys}


# ------------------------------------------------------------------ wells / dashboard
@lru_cache(maxsize=None)
def _baseline(well_id: str) -> dict[str, Any]:
    w = ph.get_well(well_id)
    c = ph.evaluate_css(w, well_css(w), well_srp(w))
    cold = ph.srp_state(w, w["stroke_length"], w["spm"], w["vfd_frequency"], w["fluid_level"], w["current_viscosity"])
    return dict(css=c, srp=cold)


def _kpi(well_id: str) -> dict[str, float]:
    b = _baseline(well_id)
    c, s = b["css"], b["srp"]
    return dict(oil_rate_m3d=_r(c["peak_rate"] * 0.6), viscosity_cp=float(ph.get_well(well_id)["current_viscosity"]),
                sor=_r(c["sor"]), rod_floating_risk=_r(s["floating_risk"], 1), rod_failure_risk=_r(s["failure_risk"], 1),
                energy_gj=_r(c["energy_total"], 1), pump_efficiency=_r(s["pump_efficiency"], 1),
                cycle_oil_m3=_r(c["cycle_oil"], 1), hot_temperature_c=_r(c["t_hot"], 1),
                rod_load_kn=_r(s["rod_load"]))


def list_wells() -> list[dict]:
    out = []
    for wid, w in ph.WELLS.items():
        out.append(dict(id=wid, name=w["name"], depth_m=w["depth"], reservoir_temperature=w["reservoir_temperature"],
                        reservoir_pressure=w["reservoir_pressure"], oil_viscosity=w["oil_viscosity"],
                        current_viscosity=w["current_viscosity"], frac_pressure=w["frac_pressure"],
                        baseline={k: float(w[k]) for k in (*ph.CSS_KEYS, *ph.SRP_KEYS)}, kpi=_kpi(wid)))
    return out


def history(well_id: str, days: int = 90) -> list[dict]:
    w = ph.get_well(well_id)
    c = ph.css_cycle(w, *well_css(w).values(), *well_srp(w).values(), want_series=True)
    ser = c["series"][-days:]
    out = []
    for i, p in enumerate(ser):
        d = i
        out.append(dict(day=d, oil_rate=_r(max(p["production"] * (1 + 0.04 * _noise(d, 1)), 0)),
                        fluid_rate=_r(p["fluid_rate"] * (1 + 0.03 * _noise(d, 2))),
                        viscosity=_r(p["viscosity"] * (1 + 0.05 * _noise(d, 3)), 1),
                        temperature=_r(p["temperature"] + 2.0 * _noise(d, 4), 1),
                        rod_load=_r(p["rod_load"] + 0.6 * _noise(d, 5)), pump_load=_r(p["pump_load"] + 0.4 * _noise(d, 6)),
                        spm=w["spm"], tubing_pressure=_r(w["tubing_pressure"] + 0.5 * _noise(d, 7))))
    return out


def alerts(well_id: str) -> list[dict]:
    w, k = ph.get_well(well_id), _kpi(well_id)
    a = []
    if k["rod_floating_risk"] >= 60:
        a.append(dict(severity="critical", message=f"Rod floating risk {k['rod_floating_risk']:.0f}% - reduce SPM/stroke or heat the near-wellbore oil."))
    elif k["rod_floating_risk"] >= 30:
        a.append(dict(severity="warning", message=f"Rod floating risk elevated ({k['rod_floating_risk']:.0f}%)."))
    if w["current_viscosity"] > 1500:
        a.append(dict(severity="warning", message=f"High oil viscosity at pump ({w['current_viscosity']} cP)."))
    if k["sor"] > 3.5:
        a.append(dict(severity="critical" if k["sor"] > 5 else "warning", message=f"High steam-oil ratio ({k['sor']:.1f}) - CSS settings are inefficient."))
    if w["injection_pressure"] > w["frac_pressure"]:
        a.append(dict(severity="warning", message=f"Injection pressure {w['injection_pressure']} bar exceeds fracture-pressure limit {w['frac_pressure']} bar."))
    if not a:
        a.append(dict(severity="info", message="All monitored parameters within the simulated normal range."))
    return a


def dashboard(well_id: str) -> dict:
    wid = well_id if well_id in ph.WELLS else "WB-101"
    ws = next(x for x in list_wells() if x["id"] == wid)
    return dict(well=ws, kpi=_kpi(wid), alerts=alerts(wid), history=history(wid))


# ------------------------------------------------------------------ CSS
def _curve(b: dict, o: dict) -> list[dict]:
    bs, os_ = b["series"], o["series"]
    n = max(len(bs), len(os_))
    out = []
    for i in range(0, n, 5):
        out.append(dict(day=i, baseline=_r(bs[i]["production"]) if i < len(bs) and i <= b["cycle_days"] + 5 else 0.0,
                        optimized=_r(os_[i]["production"]) if i < len(os_) and i <= o["cycle_days"] + 5 else 0.0))
    return out


def optimize_css(inp: dict, srp: dict | None = None) -> dict:
    w = ph.get_well(inp["well_id"])
    srp = srp or well_srp(w)
    css = _pick(inp, ph.CSS_KEYS)
    base = ph.css_cycle(w, *css.values(), *srp.values(), want_series=True)
    base["score"] = ph.css_score(base["cycle_oil"], base["sor"])
    rec = ph.optimize_css(w, css["production_cutoff"], srp)
    opt_css = dict(rec, production_cutoff=css["production_cutoff"])
    opt = ph.css_cycle(w, *opt_css.values(), *srp.values(), want_series=True)
    opt["score"] = ph.css_score(opt["cycle_oil"], opt["sor"])
    imp = 100.0 * (opt["cycle_oil"] - base["cycle_oil"]) / max(base["cycle_oil"], 1e-6)
    return dict(well_id=inp["well_id"], recommended={k: float(v) for k, v in rec.items()},
                baseline=css_metrics(base), optimized=css_metrics(opt),
                predicted_production_m3=_r(opt["cycle_oil"], 1), predicted_sor=_r(opt["sor"]),
                energy_consumption_gj=_r(opt["energy_total"], 1), optimization_score=_r(opt["score"], 1),
                production_improvement_pct=_r(imp, 1), curve=_curve(base, opt))


# ------------------------------------------------------------------ SRP
def optimize_srp(inp: dict, mu_inflow: float | None = None) -> dict:
    w = ph.get_well(inp["well_id"])
    mu, lvl = inp["oil_viscosity"], inp["fluid_level"]
    rec = ph.optimize_srp(w, lvl, mu, mu_inflow)
    before = srp_metrics(w, inp["stroke_length"], inp["spm"], inp["vfd_frequency"], lvl, mu, mu_inflow)
    after = srp_metrics(w, rec["stroke_length"], rec["spm"], rec["vfd_frequency"], lvl, mu, mu_inflow)
    sweep = []
    for k in range(4, 21):
        spm = k * 0.5
        s = ph.srp_state(w, rec["stroke_length"], spm, ph.clamp(ph.SPM_TO_HZ * spm, 30, 60), lvl, mu, mu_inflow=mu_inflow)
        sweep.append(dict(spm=spm, rod_load=_r(s["rod_load"]), risk=_r(s["failure_risk"], 1), production=_r(s["oil_rate"])))
    return dict(well_id=inp["well_id"], recommended={k: float(v) for k, v in rec.items()},
                baseline=before, optimized=after, sweep=sweep)


def optimize_all(inp: dict) -> dict:
    w = ph.get_well(inp["well_id"])
    srp0 = _pick(inp, ph.SRP_KEYS)
    css = optimize_css(inp, srp0)
    rec = css["recommended"]
    cutoff = inp["production_cutoff"]
    r = ph.optimize_srp_cycle(w, dict(rec, production_cutoff=cutoff), inp["fluid_level"])
    srp_new = dict(r, fluid_level=inp["fluid_level"])
    mu, lvl = inp["oil_viscosity"], inp["fluid_level"]
    final = ph.evaluate_css(w, dict(rec, production_cutoff=cutoff), srp_new)
    base = ph.evaluate_css(w, _pick(inp, ph.CSS_KEYS), srp0)
    b_srp = srp_metrics(w, srp0["stroke_length"], srp0["spm"], srp0["vfd_frequency"], lvl, mu)
    a_srp = srp_metrics(w, r["stroke_length"], r["spm"], r["vfd_frequency"], lvl, mu)
    sweep = []
    for k in range(4, 21):
        spm = k * 0.5
        s = ph.srp_state(w, r["stroke_length"], spm, ph.clamp(ph.SPM_TO_HZ * spm, 30, 60), lvl, mu)
        sweep.append(dict(spm=spm, rod_load=_r(s["rod_load"]), risk=_r(s["failure_risk"], 1), production=_r(s["oil_rate"])))
    srp = dict(well_id=inp["well_id"], recommended={k: float(v) for k, v in r.items()}, baseline=b_srp,
               optimized=a_srp, sweep=sweep)
    def summ(c, m):
        return dict(cycle_oil_m3=_r(c["cycle_oil"], 1), sor=_r(c["sor"]), energy_gj=_r(c["energy_total"], 1),
                    energy_per_m3_gj=_r(c["energy_per_m3"]), viscosity_cp=_r(c["mu_hot"], 1),
                    rod_risk=m["rod_floating_risk"], peak_cycle_risk=_r(c["peak_risk"], 1),
                    pump_efficiency=_r(c["avg_pump_eff"], 1), score=_r(c["score"], 1))
    combined = dict(before=summ(base, b_srp), after=summ(final, a_srp))
    css["optimized"] = css_metrics(final)
    css["predicted_production_m3"] = css["optimized"]["cycle_oil_m3"]
    css["predicted_sor"] = css["optimized"]["sor"]
    css["energy_consumption_gj"] = css["optimized"]["energy_gj"]
    css["optimization_score"] = css["optimized"]["score"]
    css["production_improvement_pct"] = _r(100.0 * (final["cycle_oil"] - base["cycle_oil"]) / max(base["cycle_oil"], 1e-6), 1)
    return dict(well_id=inp["well_id"], css=css, srp=srp, combined=combined)


@lru_cache(maxsize=None)
def _fleet_row(well_id: str) -> dict:
    w = ph.get_well(well_id)
    inp = dict(well_id=well_id, oil_viscosity=w["current_viscosity"], **{k: w[k] for k in (*ph.CSS_KEYS, *ph.SRP_KEYS)})
    r = optimize_all(inp)
    return dict(well_id=well_id, name=w["name"], before=r["combined"]["before"], after=r["combined"]["after"])


def fleet() -> dict:
    return dict(wells=[_fleet_row(w) for w in ph.WELLS])


# ------------------------------------------------------------------ prediction
def _well_from_prod(inp: dict) -> dict:
    return ph.generic_well(inp["reservoir_temperature"], inp["reservoir_pressure"], inp["oil_viscosity"])


def _physics_rate(inp: dict) -> float:
    w = _well_from_prod(inp)
    css = dict(steam_volume=inp["steam_volume"], injection_pressure=inp["injection_pressure"],
               soak_time=inp["soak_time"], production_cutoff=3.0)
    srp = dict(stroke_length=inp["stroke_length"], spm=inp["spm"], vfd_frequency=inp["vfd_frequency"], fluid_level=220)
    return ph.avg_rate_first_days(w, css, srp)


def predict_production(inp: dict) -> dict:
    phys = _physics_rate(inp)
    steps = [inp["steam_volume"] * f for f in (0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.2)]
    steps = [min(max(v, 500), 8000) for v in steps]
    rows = [dict(inp, steam_volume=v) for v in steps]
    preds = ml.predict_production([dict(inp)] + rows)
    if preds is None:
        main, sens = phys, [_physics_rate(dict(inp, steam_volume=v)) for v in steps]
        model = "physics-fallback (ML model file missing)"
    else:
        main, sens = preds[0], preds[1:]
        model = "RandomForestRegressor (offline-trained on synthetic data)"
    return dict(predicted_oil_rate_m3d=_r(main), predicted_oil_rate_bbl_d=_r(main * 6.2898, 1),
                predicted_90d_volume_m3=_r(main * 90, 1), physics_reference_m3d=_r(phys),
                sensitivity=[dict(steam_volume=_r(v, 0), predicted=_r(p), physics=_r(_physics_rate(dict(inp, steam_volume=v))))
                             for v, p in zip(steps, sens)], model=model)


def predict_failure(inp: dict) -> dict:
    ref = ph.rod_failure_risk(inp["rod_load"], inp["spm"], inp["stroke_length"], inp["oil_viscosity"],
                              inp["tubing_pressure"], inp["vfd_frequency"], inp["fluid_level"])
    m = ml.predict_failure(inp)
    if m is None:
        fl, ov, tot, model = ref["floating"], ref["overload"], ref["total"], "physics-fallback (ML model file missing)"
    else:
        fl, ov, tot, model = m["floating_risk"], m["overload_risk"], m["failure_risk"], "RandomForestRegressor (offline-trained on synthetic data)"
    drivers = []
    if fl >= 30:
        drivers.append("High downstroke viscous drag relative to rod weight (rod floating tendency)")
    if ov >= 30:
        drivers.append("Peak rod load approaching allowable rod-string load")
    if inp["fluid_level"] < 70:
        drivers.append("Low fluid level - fluid pound / pump-off risk")
    if abs(inp["vfd_frequency"] - ph.SPM_TO_HZ * inp["spm"]) > 15:
        drivers.append("VFD frequency mismatched to SPM setpoint")
    if not drivers:
        drivers.append("No dominant risk driver in the modelled range")
    return dict(rod_floating_risk_pct=_r(fl, 1), overload_risk_pct=_r(ov, 1), overall_failure_risk_pct=_r(tot, 1),
                risk_level=ph.risk_level(fl), drivers=drivers, model=model)


# ------------------------------------------------------------------ simulation
def simulate(inp: dict) -> dict:
    w = ph.get_well(inp["well_id"])
    srp = dict(stroke_length=inp["stroke_length"], spm=inp["spm"], vfd_frequency=inp["vfd_frequency"], fluid_level=inp["fluid_level"])
    c = ph.css_cycle(w, inp["steam_volume"], inp["injection_pressure"], inp["soak_time"], inp["production_cutoff"],
                     *srp.values(), inj_temp=inp.get("temperature"), want_series=True)
    c["score"] = ph.css_score(c["cycle_oil"], c["sor"])
    series = [dict(day=p["day"], temperature=_r(p["temperature"], 1), viscosity=_r(p["viscosity"], 1),
                   pressure=_r(p["pressure"], 1), production=_r(p["production"]), pump_load=_r(p["pump_load"]),
                   rod_load=_r(p["rod_load"]), sor=_r(p["sor"]), failure_risk=_r(p["failure_risk"], 1),
                   cum_oil=_r(p["cum_oil"], 1)) for p in c["series"][::3]]
    summary = dict(cycle_oil_m3=_r(c["cycle_oil"], 1), cycle_days=c["cycle_days"], sor=_r(c["sor"]),
                   energy_gj=_r(c["energy_total"], 1), peak_rate_m3d=_r(c["peak_rate"]), hot_temperature_c=_r(c["t_hot"], 1),
                   hot_viscosity_cp=_r(c["mu_hot"], 1), max_rod_load_kn=_r(c["max_rod_load"]),
                   avg_failure_risk=_r(c["avg_risk"], 1), peak_failure_risk=_r(c["peak_risk"], 1),
                   avg_pump_efficiency=_r(c["avg_pump_eff"], 1), score=_r(c["score"], 1))
    return dict(well_id=inp["well_id"], injection_temperature_c=_r(c["t_inj"], 1), summary=summary, series=series)
