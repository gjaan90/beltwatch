"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { defaultCalibration } from "@/lib/demo";
import type { Calibration } from "@/lib/types";

const KEY = "beltsight-calibration";

export default function Settings() {
  const [cal, setCal] = useState<Calibration>(defaultCalibration);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    try {
      setCal({ ...defaultCalibration, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  function update<K extends keyof Calibration>(key: K, value: string) {
    setCal((prev) => ({
      ...prev,
      [key]:
        key === "cameraName"
          ? value
          : (Number.parseFloat(value) as Calibration[K]),
    }));
    setSaved(false);
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(cal));
    setSaved(true);
  }

  return (
    <AppShell active="settings">
      <div className="page">
        <h1>Settings</h1>
        <p className="lead">
          Calibration for millimetre wander and detector thresholds. Stored in
          this browser until a plant config service is wired.
        </p>
        <div className="card" style={{ maxWidth: 720 }}>
          <h2>Camera &amp; scale</h2>
          <div className="form-grid">
            <div>
              <label>Camera name</label>
              <input
                value={cal.cameraName}
                onChange={(e) => update("cameraName", e.target.value)}
              />
            </div>
            <div>
              <label>Belt width (mm)</label>
              <input
                type="number"
                value={cal.beltWidthMm}
                onChange={(e) => update("beltWidthMm", e.target.value)}
              />
            </div>
            <div>
              <label>Pixels per mm</label>
              <input
                type="number"
                step="0.01"
                value={cal.pixelsPerMm}
                onChange={(e) => update("pixelsPerMm", e.target.value)}
              />
            </div>
          </div>

          <h2 style={{ marginTop: 20 }}>Misalignment thresholds</h2>
          <div className="form-grid">
            <div>
              <label>Watch (mm from centre)</label>
              <input
                type="number"
                value={cal.wanderWatchMm}
                onChange={(e) => update("wanderWatchMm", e.target.value)}
              />
            </div>
            <div>
              <label>Alarm (mm from centre)</label>
              <input
                type="number"
                value={cal.wanderAlarmMm}
                onChange={(e) => update("wanderAlarmMm", e.target.value)}
              />
            </div>
          </div>

          <h2 style={{ marginTop: 20 }}>Load &amp; splice</h2>
          <div className="form-grid">
            <div>
              <label>Oversized min size (mm)</label>
              <input
                type="number"
                value={cal.oversizeMinMm}
                onChange={(e) => update("oversizeMinMm", e.target.value)}
              />
            </div>
            <div>
              <label>Splice min confidence</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={cal.spliceConfidenceMin}
                onChange={(e) => update("spliceConfidenceMin", e.target.value)}
              />
            </div>
          </div>

          <p style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn primary" onClick={save}>
              Save
            </button>
            {saved ? <span className="meta" style={{ margin: 0 }}>Saved</span> : null}
          </p>

          <div className="cal-note">
            <strong style={{ color: "var(--text)" }}>How wander is computed</strong>
            <br />
            Detect belt edges and idler references → centres in pixels →{" "}
            <code>(beltCentre − idlerCentre) / pixelsPerMm</code>. Thresholds
            above turn that millimetre value into Watch / Alarm. Pure
            classification of “misaligned” is not used for the primary metric.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
