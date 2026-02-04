// Generic form field for react-hook-form + tailwind
// Props: label, name, register, errors, type, as(select/textarea), options(for select), className, required, ...rest
import { toLabel } from "../../utils/labels";
const FormField = ({
  label,
  name,
  register,
  errors = {},
  type = "text",
  as,
  options = [],
  className = "",
  required,
  ...rest
}) => {
  const error = errors[name];
  const baseClasses =
    "rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 bg-white shadow-sm w-full";
  const reg = register(name);
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {as === "select" ? (
        <select
          {...reg}
          className={baseClasses}
          {...rest}
          onChange={(e) => {
            if (rest && rest.multiple) {
              const values = Array.from(e.target.selectedOptions).map(
                (o) => o.value
              );
              reg.onChange({ target: { name, value: values } });
            } else {
              reg.onChange(e);
            }
          }}
        >
          <option value="">Select {label}</option>
          {options.map((o, idx) => {
            const val =
              typeof o === "object" && o !== null ? o.value ?? toLabel(o) : o;
            const lab =
              typeof o === "object" && o !== null ? o.label ?? toLabel(o) : o;
            const key = String(val ?? lab ?? idx);
            return (
              <option key={key} value={String(val)}>
                {String(lab)}
              </option>
            );
          })}
        </select>
      ) : as === "textarea" ? (
        <textarea {...register(name)} className={baseClasses} {...rest} />
      ) : (
        <input
          type={type}
          {...register(name)}
          className={baseClasses}
          {...rest}
        />
      )}
      {error && (
        <span className="mt-1 text-xs text-red-500">{error.message}</span>
      )}
    </div>
  );
};
export default FormField;
