import { Input } from '@/components/ui/input';
export function Field({
  name,
  label,
  value = '',
  type = 'text',
  required = true,
  maxLength = 2000,
  min,
  max,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <Input
        aria-label={label}
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        maxLength={maxLength}
        min={min}
        max={max}
        step={type === 'number' ? 'any' : undefined}
        className="mt-1.5 h-10"
      />
    </label>
  );
}
export function TextField({
  name,
  label,
  value = '',
  required = true,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <textarea
        aria-label={label}
        name={name}
        defaultValue={value}
        required={required}
        minLength={required ? 5 : undefined}
        maxLength={2000}
        rows={3}
        className="mt-1.5 w-full rounded-lg border border-input p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      />
    </label>
  );
}
export function SelectField({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  value?: string;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <select name={name} aria-label={label} defaultValue={value} required className="mt-1.5 !h-10">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ToggleField({
  name,
  label,
  value = false,
}: {
  name: string;
  label: string;
  value?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={value} />
      {label}
    </label>
  );
}
export function Reason() {
  return <TextField name="reason" label="Reason for change" />;
}
