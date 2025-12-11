import React, { useState, useMemo } from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import {
  cardStyle,
  inputStyle,
  labelStyle,
  selectStyle,
  tableBaseStyle,
  tableHeaderCellStyle,
  tableCellStyle,
} from "../ui/designSystem";

type HazardLevel = "Low Hazard" | "Below Average Hazard" | "Average Hazard" | "Above Average Hazard" | "High Hazard";

// Capacity lookup tables from the spreadsheet
// Standard: G2 = 3 × G1, G3 threshold = 50%
// Surplus: G2 = 2 × G1, G3 threshold = 70%
const STANDARD_CAPACITIES: Record<HazardLevel, { g1: number; g3: number }> = {
  "Low Hazard": { g1: 3000000, g3: 5000000 },
  "Below Average Hazard": { g1: 2400000, g3: 5000000 },
  "Average Hazard": { g1: 1800000, g3: 5000000 },
  "Above Average Hazard": { g1: 1200000, g3: 4800000 },
  "High Hazard": { g1: 600000, g3: 2400000 },
};

const SURPLUS_CAPACITIES: Record<HazardLevel, { g1: number; g3: number }> = {
  "Low Hazard": { g1: 2000000, g3: 5000000 },
  "Below Average Hazard": { g1: 1600000, g3: 5000000 },
  "Average Hazard": { g1: 1200000, g3: 5000000 },
  "Above Average Hazard": { g1: 800000, g3: 5000000 },
  "High Hazard": { g1: 400000, g3: 2800000 },
};

interface CalculationResult {
  group1Pct: number | string;
  group2Pct: number | string;
  group3Pct: number | string;
  group1Amt: number;
  group2Amt: number;
  group3Amt: number;
  group1Cap: number;
  group2Cap: number;
  group3Cap: number;
  maxCapacity: number;
  overLine: boolean;
  g3Warning: boolean;
}

const ReinsuranceCalculatorPage: React.FC = () => {
  const [tivStandard, setTivStandard] = useState<string>("");
  const [hazardStandard, setHazardStandard] = useState<HazardLevel>("Low Hazard");
  
  const [tivSurplus, setTivSurplus] = useState<string>("");
  const [hazardSurplus, setHazardSurplus] = useState<HazardLevel>("Low Hazard");

  const hazardLevels: HazardLevel[] = [
    "Low Hazard",
    "Below Average Hazard",
    "Average Hazard",
    "Above Average Hazard",
    "High Hazard",
  ];

  // Standard Reinsurance Calculation
  const standardResult = useMemo((): CalculationResult => {
    const tiv = parseFloat(tivStandard) || 0;
    
    if (tiv === 0) {
      return {
        group1Pct: 0,
        group2Pct: 0,
        group3Pct: 0,
        group1Amt: 0,
        group2Amt: 0,
        group3Amt: 0,
        group1Cap: 0,
        group2Cap: 0,
        group3Cap: 0,
        maxCapacity: 0,
        overLine: false,
        g3Warning: false,
      };
    }

    const caps = STANDARD_CAPACITIES[hazardStandard];
    
    // Capacities from lookup table
    const g1Cap = caps.g1;
    const g2Cap = 3 * g1Cap;  // G2 is always 3x G1 for Standard
    const g3Cap = caps.g3;
    const maxCapacity = g1Cap + g2Cap + g3Cap;

    // Check if over line
    const overLine = tiv > maxCapacity;

    if (overLine) {
      return {
        group1Pct: "⚠️ OVER LINE",
        group2Pct: "⚠️ OVER LINE",
        group3Pct: "⚠️ OVER LINE",
        group1Amt: 0,
        group2Amt: 0,
        group3Amt: 0,
        group1Cap: g1Cap,
        group2Cap: g2Cap,
        group3Cap: g3Cap,
        maxCapacity,
        overLine: true,
        g3Warning: false,
      };
    }

    // Calculate amounts based on capacity waterfall
    const g1Amt = Math.min(tiv, g1Cap);
    const g2Amt = Math.min(Math.max(tiv - g1Amt, 0), g2Cap);
    const g3Amt = Math.min(Math.max(tiv - g1Amt - g2Amt, 0), g3Cap);

    // Calculate percentages with constraints - MUST ROUND AT EACH STEP
    // Step 1: Calculate and ROUND G1% (round to 3 decimals)
    const g1Pct = Math.round((g1Amt / tiv) * 1000) / 1000;
    
    // Step 2: Calculate G2% with constraint, then ROUND
    // G2% = MIN(1 - ROUNDED_G1%, 3 × ROUNDED_G1%)
    // Round the multiplier to avoid floating point errors
    const g2Max = Math.round((3 * g1Pct) * 1000) / 1000;
    const g2PctCalculated = Math.round(Math.min(1 - g1Pct, g2Max) * 1000) / 1000;
    
    // Step 3: Calculate G3% from rounded G1 and G2
    // G3% = MAX(0, 1 - ROUNDED_G1% - ROUNDED_G2%)
    const g3PctCalculated = Math.round(Math.max(0, 1 - g1Pct - g2PctCalculated) * 1000) / 1000;
    
    let g3Pct: number | string = g3PctCalculated;
    let g3Warning = false;
    
    // Check if G3% exceeds 50% threshold
    if (g3PctCalculated > 0.5) {
      g3Pct = "⚠️ G3 % OVER 50%";
      g3Warning = true;
    }

    return {
      group1Pct: g1Pct,
      group2Pct: g2PctCalculated,
      group3Pct: g3Pct,
      group1Amt: g1Amt,
      group2Amt: g2Amt,
      group3Amt: g3Amt,
      group1Cap: g1Cap,
      group2Cap: g2Cap,
      group3Cap: g3Cap,
      maxCapacity,
      overLine: false,
      g3Warning,
    };
  }, [tivStandard, hazardStandard]);

  // Surplus Reinsurance Calculation
  const surplusResult = useMemo((): CalculationResult => {
    const tiv = parseFloat(tivSurplus) || 0;
    
    if (tiv === 0) {
      return {
        group1Pct: 0,
        group2Pct: 0,
        group3Pct: 0,
        group1Amt: 0,
        group2Amt: 0,
        group3Amt: 0,
        group1Cap: 0,
        group2Cap: 0,
        group3Cap: 0,
        maxCapacity: 0,
        overLine: false,
        g3Warning: false,
      };
    }

    const caps = SURPLUS_CAPACITIES[hazardSurplus];
    
    // Capacities from lookup table
    const g1Cap = caps.g1;
    const g2Cap = 2 * g1Cap;  // G2 is always 2x G1 for Surplus
    const g3Cap = caps.g3;
    const maxCapacity = g1Cap + g2Cap + g3Cap;

    // Check if over line
    const overLine = tiv > maxCapacity;

    if (overLine) {
      return {
        group1Pct: "⚠️ OVER LINE",
        group2Pct: "⚠️ OVER LINE",
        group3Pct: "⚠️ OVER LINE",
        group1Amt: 0,
        group2Amt: 0,
        group3Amt: 0,
        group1Cap: g1Cap,
        group2Cap: g2Cap,
        group3Cap: g3Cap,
        maxCapacity,
        overLine: true,
        g3Warning: false,
      };
    }

    // Calculate amounts based on capacity waterfall
    const g1Amt = Math.min(tiv, g1Cap);
    const g2Amt = Math.min(Math.max(tiv - g1Amt, 0), g2Cap);
    const g3Amt = Math.min(Math.max(tiv - g1Amt - g2Amt, 0), g3Cap);

    // Calculate percentages with constraints - MUST ROUND AT EACH STEP
    // Step 1: Calculate and ROUND G1% (round to 3 decimals)
    const g1Pct = Math.round((g1Amt / tiv) * 1000) / 1000;
    
    // Step 2: Calculate G2% with constraint, then ROUND
    // G2% = MIN(1 - ROUNDED_G1%, 2 × ROUNDED_G1%)
    // Round the multiplier to avoid floating point errors
    const g2Max = Math.round((2 * g1Pct) * 1000) / 1000;
    const g2PctCalculated = Math.round(Math.min(1 - g1Pct, g2Max) * 1000) / 1000;
    
    // Step 3: Calculate G3% from rounded G1 and G2
    // G3% = MAX(0, 1 - ROUNDED_G1% - ROUNDED_G2%)
    const g3PctCalculated = Math.round(Math.max(0, 1 - g1Pct - g2PctCalculated) * 1000) / 1000;
    
    let g3Pct: number | string = g3PctCalculated;
    let g3Warning = false;
    
    // Check if G3% exceeds 70% threshold for Surplus
    if (g3PctCalculated > 0.7) {
      g3Pct = "⚠️ G3 % OVER 70%";
      g3Warning = true;
    }

    return {
      group1Pct: g1Pct,
      group2Pct: g2PctCalculated,
      group3Pct: g3Pct,
      group1Amt: g1Amt,
      group2Amt: g2Amt,
      group3Amt: g3Amt,
      group1Cap: g1Cap,
      group2Cap: g2Cap,
      group3Cap: g3Cap,
      maxCapacity,
      overLine: false,
      g3Warning,
    };
  }, [tivSurplus, hazardSurplus]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | string) => {
    if (typeof value === 'string') return value;
    const pct = value * 100;
    // Show whole number if it's a round number, otherwise 1 decimal
    if (Math.abs(pct - Math.round(pct)) < 0.01) {
      return `${Math.round(pct)}%`;
    }
    return `${pct.toFixed(1)}%`;
  };

  const renderCalculationSection = (
    title: string,
    tiv: string,
    setTiv: (v: string) => void,
    hazard: HazardLevel,
    setHazard: (h: HazardLevel) => void,
    result: CalculationResult
  ) => (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
        {title}
      </h2>

      {/* Input Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Total TIV</label>
          <input
            type="number"
            style={inputStyle}
            value={tiv}
            onChange={(e) => setTiv(e.target.value)}
            placeholder="Enter Total Insured Value"
          />
        </div>
        <div>
          <label style={labelStyle}>Hazard Level</label>
          <select
            style={selectStyle}
            value={hazard}
            onChange={(e) => setHazard(e.target.value as HazardLevel)}
          >
            {hazardLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Section */}
      {parseFloat(tiv) > 0 && (
        <>
          <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
              Max Capacity: <span style={{ color: "#111827" }}>{formatCurrency(result.maxCapacity)}</span>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {title === "Standard Reinsurance" 
                ? "Rules: G2 ≤ 3 × G1%, G3 ≤ 50% of total" 
                : "Rules: G2 ≤ 2 × G1%, G3 ≤ 70% of total"}
            </div>
            {result.overLine && (
              <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginTop: 8 }}>
                ⚠️ WARNING: TIV exceeds maximum capacity
              </div>
            )}
            {result.g3Warning && (
              <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginTop: 8 }}>
                ⚠️ WARNING: Group 3 percentage exceeds threshold
              </div>
            )}
          </div>

          <table style={{ ...tableBaseStyle, marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={tableHeaderCellStyle}>Group</th>
                <th style={tableHeaderCellStyle}>Percentage</th>
                <th style={tableHeaderCellStyle}>Amount</th>
                <th style={tableHeaderCellStyle}>Capacity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tableCellStyle}>Group 1</td>
                <td style={tableCellStyle}>{formatPercent(result.group1Pct)}</td>
                <td style={tableCellStyle}>{formatCurrency(result.group1Amt)}</td>
                <td style={tableCellStyle}>{formatCurrency(result.group1Cap)}</td>
              </tr>
              <tr>
                <td style={tableCellStyle}>Group 2</td>
                <td style={tableCellStyle}>{formatPercent(result.group2Pct)}</td>
                <td style={tableCellStyle}>{formatCurrency(result.group2Amt)}</td>
                <td style={tableCellStyle}>{formatCurrency(result.group2Cap)}</td>
              </tr>
              <tr>
                <td style={tableCellStyle}>Group 3</td>
                <td style={{ ...tableCellStyle, color: typeof result.group3Pct === 'string' && result.group3Pct.includes('⚠️') ? '#dc2626' : 'inherit', fontWeight: typeof result.group3Pct === 'string' && result.group3Pct.includes('⚠️') ? 600 : 400 }}>
                  {formatPercent(result.group3Pct)}
                </td>
                <td style={tableCellStyle}>{formatCurrency(result.group3Amt)}</td>
                <td style={tableCellStyle}>{formatCurrency(result.group3Cap)}</td>
              </tr>
              <tr style={{ background: "#f9fafb", fontWeight: 600 }}>
                <td style={tableCellStyle}>Total</td>
                <td style={tableCellStyle}>100.0%</td>
                <td style={tableCellStyle}>
                  {formatCurrency(result.group1Amt + result.group2Amt + result.group3Amt)}
                </td>
                <td style={tableCellStyle}>{formatCurrency(result.maxCapacity)}</td>
              </tr>
            </tbody>
          </table>

          {/* Dollar Values Summary */}
          <div style={{ fontSize: 12, color: "#6b7280", padding: 12, background: "#eff6ff", borderRadius: 8 }}>
            <strong>Dollar Values:</strong> Group 1: {formatCurrency(typeof result.group1Pct === 'number' ? result.group1Pct * parseFloat(tiv) : 0)} | 
            Group 2: {formatCurrency(typeof result.group2Pct === 'number' ? result.group2Pct * parseFloat(tiv) : 0)} | 
            Group 3: {formatCurrency(typeof result.group3Pct === 'number' ? result.group3Pct * parseFloat(tiv) : 0)}
          </div>
        </>
      )}
    </div>
  );

  return (
    <WorkbenchLayout
      title="Reinsurance Calculator"
      subtitle="Calculate reinsurance group participation based on TIV and hazard level"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Calculation Rules Info */}
        <div style={{ ...cardStyle, background: "#eff6ff", border: "2px solid #3b82f6" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e40af", marginBottom: 12 }}>
            📋 Calculation Rules
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12, color: "#1e40af" }}>
            <div>
              <strong>Standard Reinsurance:</strong>
              <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                <li>G1% = G1 Amount ÷ TIV</li>
                <li>G2% = MIN(Remaining%, <strong>3 × G1%</strong>)</li>
                <li>G3% = Remaining% (max <strong>50%</strong>)</li>
                <li>G2 Capacity = <strong>3 × G1 Capacity</strong></li>
              </ul>
            </div>
            <div>
              <strong>Surplus Reinsurance:</strong>
              <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                <li>G1% = G1 Amount ÷ TIV</li>
                <li>G2% = MIN(Remaining%, <strong>2 × G1%</strong>)</li>
                <li>G3% = Remaining% (max <strong>70%</strong>)</li>
                <li>G2 Capacity = <strong>2 × G1 Capacity</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Standard Reinsurance */}
        {renderCalculationSection(
          "Standard Reinsurance",
          tivStandard,
          setTivStandard,
          hazardStandard,
          setHazardStandard,
          standardResult
        )}

        {/* Surplus Reinsurance */}
        {renderCalculationSection(
          "Surplus Reinsurance",
          tivSurplus,
          setTivSurplus,
          hazardSurplus,
          setHazardSurplus,
          surplusResult
        )}

        {/* Capacity Reference Table */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            Standard Appetite Reference
          </h2>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, fontStyle: "italic" }}>
            Group 2 capacity is always <strong>3×</strong> Group 1 capacity. Group 3 percentage must be ≤ <strong>50%</strong>.
          </div>
          <table style={tableBaseStyle}>
            <thead>
              <tr>
                <th style={tableHeaderCellStyle}>Hazard Level</th>
                <th style={tableHeaderCellStyle}>G1 Capacity</th>
                <th style={tableHeaderCellStyle}>G2 Capacity</th>
                <th style={tableHeaderCellStyle}>G3 Capacity</th>
                <th style={tableHeaderCellStyle}>Max Capacity</th>
              </tr>
            </thead>
            <tbody>
              {hazardLevels.map((level) => {
                const caps = STANDARD_CAPACITIES[level];
                const g2Cap = caps.g1 * 3;  // G2 is always 3× G1
                const maxCap = caps.g1 + g2Cap + caps.g3;
                return (
                  <tr key={level}>
                    <td style={tableCellStyle}>{level}</td>
                    <td style={tableCellStyle}>{formatCurrency(caps.g1)}</td>
                    <td style={tableCellStyle}>{formatCurrency(g2Cap)} <span style={{ fontSize: 10, color: "#6b7280" }}>(3×G1)</span></td>
                    <td style={tableCellStyle}>{formatCurrency(caps.g3)}</td>
                    <td style={tableCellStyle}>{formatCurrency(maxCap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            Surplus Appetite Reference
          </h2>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, fontStyle: "italic" }}>
            Group 2 capacity is always <strong>2×</strong> Group 1 capacity. Group 3 percentage must be ≤ <strong>70%</strong>.
          </div>
          <table style={tableBaseStyle}>
            <thead>
              <tr>
                <th style={tableHeaderCellStyle}>Hazard Level</th>
                <th style={tableHeaderCellStyle}>G1 Capacity</th>
                <th style={tableHeaderCellStyle}>G2 Capacity</th>
                <th style={tableHeaderCellStyle}>G3 Capacity</th>
                <th style={tableHeaderCellStyle}>Max Capacity</th>
              </tr>
            </thead>
            <tbody>
              {hazardLevels.map((level) => {
                const caps = SURPLUS_CAPACITIES[level];
                const g2Cap = caps.g1 * 2;  // G2 is always 2× G1
                const maxCap = caps.g1 + g2Cap + caps.g3;
                return (
                  <tr key={level}>
                    <td style={tableCellStyle}>{level}</td>
                    <td style={tableCellStyle}>{formatCurrency(caps.g1)}</td>
                    <td style={tableCellStyle}>{formatCurrency(g2Cap)} <span style={{ fontSize: 10, color: "#6b7280" }}>(2×G1)</span></td>
                    <td style={tableCellStyle}>{formatCurrency(caps.g3)}</td>
                    <td style={tableCellStyle}>{formatCurrency(maxCap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </WorkbenchLayout>
  );
};

export default ReinsuranceCalculatorPage;
