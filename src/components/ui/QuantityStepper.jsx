// src/components/ui/QuantityStepper.jsx
export default function QuantityStepper({ value, onChange, min = 1, max = 9999 }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="qty-stepper">
      <button className="stepper-btn" onClick={dec} type="button">−</button>
      <div className="stepper-display">{value}</div>
      <button className="stepper-btn" onClick={inc} type="button">+</button>
    </div>
  );
}
