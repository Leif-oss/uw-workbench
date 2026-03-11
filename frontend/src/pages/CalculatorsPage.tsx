import React, { useState } from "react";
import { WorkbenchLayout } from "../components/WorkbenchLayout";
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from "../ui/designSystem";

const CalculatorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"regular" | "rents">("regular");
  
  return (
    <WorkbenchLayout
      title="Underwriting Workbench – Calculators"
      subtitle="Regular calculator and quick rents calculator"
      rightNote="Calculators"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Tab Selector */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e5e7eb" }}>
          <button
            type="button"
            onClick={() => setActiveTab("regular")}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === "regular" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "regular" ? "#2563eb" : "#6b7280",
              cursor: "pointer",
              fontWeight: activeTab === "regular" ? 600 : 400,
              fontSize: 14,
            }}
          >
            Regular Calculator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rents")}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === "rents" ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === "rents" ? "#2563eb" : "#6b7280",
              cursor: "pointer",
              fontWeight: activeTab === "rents" ? 600 : 400,
              fontSize: 14,
            }}
          >
            Quick Rents Calculator
          </button>
        </div>

        {/* Regular Calculator */}
        {activeTab === "regular" && <RegularCalculator />}

        {/* Quick Rents Calculator */}
        {activeTab === "rents" && <QuickRentsCalculator />}
      </div>
    </WorkbenchLayout>
  );
};

const RegularCalculator: React.FC = () => {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "×":
        return firstValue * secondValue;
      case "÷":
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const formatDisplay = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US", { maximumFractionDigits: 10 });
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 600, color: "#111827" }}>
        Regular Calculator
      </h2>
      
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        {/* Display */}
        <div
          style={{
            background: "#1f2937",
            color: "#f9fafb",
            padding: "20px",
            borderRadius: "8px 8px 0 0",
            textAlign: "right",
            fontSize: 32,
            fontWeight: 600,
            minHeight: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            wordBreak: "break-all",
            overflow: "hidden",
          }}
        >
          {formatDisplay(display)}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "#e5e7eb",
            border: "1px solid #e5e7eb",
            borderRadius: "0 0 8px 8px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={clear}
            style={buttonStyle("#ef4444", "#ffffff")}
          >
            C
          </button>
          <button
            type="button"
            onClick={() => performOperation("÷")}
            style={buttonStyle("#f59e0b", "#ffffff")}
          >
            ÷
          </button>
          <button
            type="button"
            onClick={() => performOperation("×")}
            style={buttonStyle("#f59e0b", "#ffffff")}
          >
            ×
          </button>
          <button
            type="button"
            onClick={() => performOperation("-")}
            style={buttonStyle("#f59e0b", "#ffffff")}
          >
            −
          </button>

          <button type="button" onClick={() => inputNumber("7")} style={buttonStyle("#ffffff", "#111827")}>
            7
          </button>
          <button type="button" onClick={() => inputNumber("8")} style={buttonStyle("#ffffff", "#111827")}>
            8
          </button>
          <button type="button" onClick={() => inputNumber("9")} style={buttonStyle("#ffffff", "#111827")}>
            9
          </button>
          <button
            type="button"
            onClick={() => performOperation("+")}
            style={buttonStyle("#f59e0b", "#ffffff")}
          >
            +
          </button>

          <button type="button" onClick={() => inputNumber("4")} style={buttonStyle("#ffffff", "#111827")}>
            4
          </button>
          <button type="button" onClick={() => inputNumber("5")} style={buttonStyle("#ffffff", "#111827")}>
            5
          </button>
          <button type="button" onClick={() => inputNumber("6")} style={buttonStyle("#ffffff", "#111827")}>
            6
          </button>
          <button
            type="button"
            onClick={handleEquals}
            style={buttonStyle("#10b981", "#ffffff")}
            rowSpan={2}
          >
            =
          </button>

          <button type="button" onClick={() => inputNumber("1")} style={buttonStyle("#ffffff", "#111827")}>
            1
          </button>
          <button type="button" onClick={() => inputNumber("2")} style={buttonStyle("#ffffff", "#111827")}>
            2
          </button>
          <button type="button" onClick={() => inputNumber("3")} style={buttonStyle("#ffffff", "#111827")}>
            3
          </button>

          <button
            type="button"
            onClick={() => inputNumber("0")}
            style={{
              ...buttonStyle("#ffffff", "#111827"),
              gridColumn: "span 2",
            }}
          >
            0
          </button>
          <button type="button" onClick={inputDecimal} style={buttonStyle("#ffffff", "#111827")}>
            .
          </button>
        </div>
      </div>
    </div>
  );
};

const QuickRentsCalculator: React.FC = () => {
  const [monthlyRent, setMonthlyRent] = useState<string>("");

  const monthlyRentNum = parseFloat(monthlyRent) || 0;
  const oneYearTotal = monthlyRentNum * 12;
  const twoYearTotal = monthlyRentNum * 24;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 600, color: "#111827" }}>
        Quick Rents Calculator
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
        <div>
          <label style={labelStyle}>Monthly Rent</label>
          <input
            type="number"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(e.target.value)}
            placeholder="Enter monthly rent amount"
            style={{
              ...inputStyle,
              fontSize: 16,
              padding: "12px",
            }}
          />
        </div>

        {monthlyRent && monthlyRentNum > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 8,
            }}
          >
            <div
              style={{
                padding: 16,
                background: "#f0f9ff",
                borderRadius: 8,
                border: "1px solid #bae6fd",
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>
                1 Year Total
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0284c7" }}>
                {formatCurrency(oneYearTotal)}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                background: "#f0fdf4",
                borderRadius: 8,
                border: "1px solid #86efac",
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>
                2 Year Total
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>
                {formatCurrency(twoYearTotal)}
              </div>
            </div>
          </div>
        )}

        {monthlyRent && monthlyRentNum <= 0 && (
          <div style={{ color: "#dc2626", fontSize: 12 }}>
            Please enter a valid monthly rent amount greater than 0.
          </div>
        )}
      </div>
    </div>
  );
};

const buttonStyle = (background: string, color: string) => ({
  padding: "20px",
  border: "none",
  background,
  color,
  fontSize: 18,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
  minHeight: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export default CalculatorsPage;
