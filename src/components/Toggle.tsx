type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export default function Toggle({ checked, onChange, label }: Props) {
  return (
    <label className="toggle-row">
      <button
        type="button"
        className={`toggle ${checked ? 'is-on' : ''}`}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
