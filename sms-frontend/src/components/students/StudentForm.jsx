import { useEffect } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";

// Generic student form component for add/edit.
// Props:
//  - id (form id)
//  - mode: 'add' | 'edit'
//  - onSubmit: form submit handler (already wrapped with react-hook-form handleSubmit outside)
//  - register, errors: from useForm
//  - isSubmitting: boolean
//  - parents, classes, grades: option arrays
//  - defaultFocus (optional field name to autofocus)
export default function StudentForm({
  id,
  onSubmit,
  register,
  errors,
  isSubmitting,
  parents = [],
  classes = [],
  grades = [],
  defaultFocus = "name",
  mode = "add",
}) {
  useEffect(() => {
    const el = document.querySelector(`#${id} [name='${defaultFocus}']`);
    if (el) el.focus();
  }, [id, defaultFocus]);

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* First Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          First Name *
        </label>
        <input
          {...register("name")}
          name="name"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>
      {/* Last Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Last Name *
        </label>
        <input
          {...register("surname")}
          name="surname"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
        {errors.surname && (
          <p className="text-red-500 text-xs mt-1">{errors.surname.message}</p>
        )}
      </div>
      {/* Username (add only) */}
      {mode === "add" && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Username *
          </label>
          <input
            {...register("username")}
            name="username"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
          {errors.username && (
            <p className="text-red-500 text-xs mt-1">
              {errors.username.message}
            </p>
          )}
        </div>
      )}
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          {...register("email")}
          name="email"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>
      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          {...register("phone")}
          name="phone"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
        {errors.phone && (
          <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
        )}
      </div>
      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Address *
        </label>
        <input
          {...register("address")}
          name="address"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
        {errors.address && (
          <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
        )}
      </div>
      {/* Blood Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Blood Type
        </label>
        <select
          {...register("bloodType")}
          name="bloodType"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">--</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
            <option key={bt} value={bt}>
              {bt}
            </option>
          ))}
        </select>
        {errors.bloodType && (
          <p className="text-red-500 text-xs mt-1">
            {errors.bloodType.message}
          </p>
        )}
      </div>
      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Gender *
        </label>
        <select
          {...register("sex")}
          name="sex"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        {errors.sex && (
          <p className="text-red-500 text-xs mt-1">{errors.sex.message}</p>
        )}
      </div>
      {/* Birthday */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Birthday *
        </label>
        <input
          type="date"
          {...register("birthday")}
          name="birthday"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
        {errors.birthday && (
          <p className="text-red-500 text-xs mt-1">{errors.birthday.message}</p>
        )}
      </div>
      {/* Parent (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Parent
        </label>
        <select
          {...register("parent")}
          name="parent"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Select Parent (optional)</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {errors.parent && (
          <p className="text-red-500 text-xs mt-1">{errors.parent.message}</p>
        )}
      </div>
      {/* Class */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Class *
        </label>
        <select
          {...register("class")}
          name="class"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.class && (
          <p className="text-red-500 text-xs mt-1">{errors.class.message}</p>
        )}
      </div>
      {/* Grade */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Grade *
        </label>
        <select
          {...register("grade")}
          name="grade"
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Select Grade</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {errors.grade && (
          <p className="text-red-500 text-xs mt-1">{errors.grade.message}</p>
        )}
      </div>

      {/* Full width submit area for small screens hidden because footer of modal handles actions */}
      {isSubmitting && (
        <div className="col-span-full flex items-center gap-2 text-sm text-gray-600">
          <LoadingSpinner size="sm" /> Processing...
        </div>
      )}
    </form>
  );
}
