// Reusable vertical key/value details list
// Props: fields: Array<{ label: string; value: any }>
import { toLabel } from "../../utils/labels";

export default function DetailsList({ fields = [] }) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.label}>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
            {f.label}
          </label>
          <p className="mt-1 text-sm text-gray-900 break-words">
            {(() => {
              const val = f.value;
              if (val === null || val === undefined || val === "") return "—";
              if (val === 0) return 0;
              return toLabel(val);
            })()}
          </p>
        </div>
      ))}
    </div>
  );
}
