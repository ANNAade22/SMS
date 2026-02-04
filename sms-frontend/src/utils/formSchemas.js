import { z } from "zod";

// Helper: detect sequential runs like abc, 123, xyz, 987 (length>=3)
function hasSequentialRun(str) {
  if (!str || str.length < 3) return false;
  const s = str;
  for (let i = 0; i <= s.length - 3; i++) {
    const a = s.charCodeAt(i);
    const b = s.charCodeAt(i + 1);
    const c = s.charCodeAt(i + 2);
    // ascending sequence (abc or 123)
    if (b === a + 1 && c === b + 1) return true;
    // descending sequence (cba or 321)
    if (b === a - 1 && c === b - 1) return true;
  }
  return false;
}

// Registration form schema
export const registrationFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Role is required"),
});

// Announcement form schema
export const announcementFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  date: z.string().min(1, "Date is required"),
});

// Assignment form schema
export const assignmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  classId: z.string().min(1, "Class is required"),
  teacher: z.string().optional(), // Required for admin, auto-assigned for teachers
  dueDate: z.string().min(1, "Due date is required"),
  totalPoints: z.coerce
    .number()
    .min(0, "Total points must be at least 0")
    .max(1000, "Total points cannot exceed 1000")
    .optional(),
  status: z.enum(["Draft", "Published", "Completed", "Overdue"]).optional(),
});

// Class form schema
export const classFormSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  grade: z.string().min(1, "Grade is required"),
  teacher: z.string().min(1, "Teacher is required"),
});

// Exam form schema
export const examFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    type: z.enum(
      [
        "Quiz",
        "Midterm",
        "Final",
        "Assignment",
        "Project",
        "Lab Exam",
        "Other",
      ],
      {
        required_error: "Exam type is required",
      }
    ),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    examScope: z.enum(["lesson", "subject", "class", "subjectClass"], {
      required_error: "Exam scope is required",
    }),
    lesson: z.string().optional(),
    subject: z.string().optional(),
    classId: z.string().optional(),
    teacher: z.string().optional(),
    totalMarks: z.coerce
      .number()
      .min(1, "Total marks must be at least 1")
      .max(1000, "Total marks cannot exceed 1000"),
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      // Ensure at least one scope field is provided based on examScope
      switch (data.examScope) {
        case "lesson":
          return !!data.lesson;
        case "subject":
          return !!data.subject;
        case "class":
          return !!data.classId;
        case "subjectClass":
          return !!data.subject && !!data.classId;
        default:
          return false;
      }
    },
    {
      message: "Please select the required fields based on exam scope",
      path: ["examScope"],
    }
  )
  .refine(
    (data) => {
      // Teacher is required for non-lesson exams
      if (data.examScope !== "lesson") {
        return !!data.teacher;
      }
      return true;
    },
    {
      message: "Teacher assignment is required for this exam type",
      path: ["teacher"],
    }
  );

// Lesson form schema
export const lessonFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  subject: z.string().min(1, "Subject is required"),
});

// Parent form schema
export const parentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
});

// Result form schema
export const resultFormSchema = z.object({
  assessmentTitle: z.string().min(1, "Assessment title is required"),
  class: z.string().min(1, "Class is required"),
  subject: z.string().min(1, "Subject is required"),
  student: z.string().min(1, "Student is required"),
  grade: z.string().min(1, "Grade is required"),
  section: z.string().min(1, "Section is required"),
  examType: z.string().min(1, "Exam type is required"),
  date: z.string().min(1, "Date is required"),
  score: z.coerce.number().min(0, "Score must be at least 0"),
  totalMarks: z.coerce.number().min(1, "Total marks must be at least 1"),
  status: z.string().min(1, "Status is required"),
  remarks: z.string().optional(),
});

// Student form schemas
export const studentAddSchema = z.object({
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  username: z.string().min(1, "Username is required"),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /.+@.+\..+/.test(v), {
      message: "Invalid email",
    }),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional()
    .or(z.literal("")),
  sex: z
    .string({ required_error: "Gender is required" })
    .transform((v) => v?.trim())
    .refine(
      (v) => ["MALE", "FEMALE", "male", "female"].includes(v),
      "Gender must be male or female"
    )
    .transform((v) => v.toUpperCase()),
  birthday: z
    .string()
    .min(1, "Birthday is required")
    .refine((v) => /\d{4}-\d{2}-\d{2}/.test(v), {
      message: "Birthday must be YYYY-MM-DD",
    }),
  parent: z.string().optional().or(z.literal("")),
  class: z.string().min(1, "Class is required"),
  grade: z.string().min(1, "Grade is required"),
});

export const studentEditSchema = z.object({
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  // username intentionally omitted for edit; immutable
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /.+@.+\..+/.test(v), {
      message: "Invalid email",
    }),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional()
    .or(z.literal("")),
  sex: z
    .string({ required_error: "Gender is required" })
    .transform((v) => v?.trim())
    .refine(
      (v) => ["MALE", "FEMALE", "male", "female"].includes(v),
      "Gender must be male or female"
    )
    .transform((v) => v.toUpperCase()),
  birthday: z
    .string()
    .min(1, "Birthday is required")
    .refine((v) => /\d{4}-\d{2}-\d{2}/.test(v), {
      message: "Birthday must be YYYY-MM-DD",
    }),
  parent: z.string().optional().or(z.literal("")),
  class: z.string().min(1, "Class is required"),
  grade: z.string().min(1, "Grade is required"),
});

// Backwards-compatible schema used by legacy/shared Students page
// Keeps validation permissive for fields that page uses only locally.
export const studentFormSchema = z.object({
  name: z.string().min(1, "First name is required"),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /.+@.+\..+/.test(v), {
      message: "Invalid email",
    }),
  phone: z.string().optional().or(z.literal("")),
  grade: z.string().optional().or(z.literal("")),
  class: z.string().optional().or(z.literal("")),
  parentName: z.string().optional().or(z.literal("")),
  parentPhone: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  gpa: z.coerce.number().min(0, "GPA must be >= 0").optional(),
});

// Teacher form schema (for add/edit)
export const teacherFormSchema = z.object({
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  // legacy single subject support (kept for compatibility)
  subject: z.string().optional(),
  // new multi-subjects support for admin page
  subjects: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : [])),
  // multi-classes support in admin page
  classes: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : [])),
  department: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.coerce
    .number({ invalid_type_error: "Experience must be a number" })
    .min(0, "Must be >= 0")
    .max(60, "Unrealistic (>60)"),
  status: z.string().optional(),
});

// Parent (admin) create schema (includes user creation)
export const parentAdminCreateSchema = z.object({
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Min 6 characters"),
});

export const parentAdminEditSchema = z.object({
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
});

// Link existing parent user schema (admin links previously created user account)
export const linkExistingParentSchema = z.object({
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
});

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        "Include a special character"
      )
      .refine((p) => !hasSequentialRun(p), {
        message: "Password cannot contain sequential characters",
      }),
    passwordConfirm: z.string().min(1, "Please confirm new password"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  });

// Forgot/Reset password (unauthenticated, on login page)
export const forgotPasswordSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        "Include a special character"
      )
      .refine((p) => !hasSequentialRun(p), {
        message: "Password cannot contain sequential characters",
      }),
    passwordConfirm: z.string().min(1, "Please confirm new password"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  });

// Change at login: username + old + new + confirm
export const changePasswordAtLoginSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    currentPassword: z.string().min(1, "Old password is required"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        "Include a special character"
      )
      .refine((p) => !hasSequentialRun(p), {
        message: "Password cannot contain sequential characters",
      }),
    passwordConfirm: z.string().min(1, "Please confirm new password"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Passwords do not match",
  });

// Link existing student user schema (admin links previously created user account)
export const linkExistingStudentSchema = z.object({
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "First name is required"),
  surname: z.string().optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  classId: z.string().min(1, "Class is required"),
  gradeId: z.string().min(1, "Grade is required"),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  sex: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v.trim() : v))
    .refine(
      (v) => !v || ["male", "female", "MALE", "FEMALE"].includes(v),
      "Invalid option: expected one of male|female"
    )
    .transform((v) => (v ? v.toUpperCase() : v)),
  birthday: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /\d{4}-\d{2}-\d{2}/.test(v), {
      message: "Birthday must be YYYY-MM-DD",
    }),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional()
    .or(z.literal("")),
});

// Link existing teacher user schema (admin links previously created user account)
export const linkExistingTeacherSchema = z.object({
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Address is required"),
  sex: z
    .string()
    .min(1, "Gender is required")
    .transform((v) => v.toUpperCase())
    .refine((v) => ["MALE", "FEMALE"].includes(v), "Invalid gender"),
  birthday: z
    .string()
    .min(1, "Birthday is required")
    .refine((v) => /\d{4}-\d{2}-\d{2}/.test(v), {
      message: "Birthday must be YYYY-MM-DD",
    }),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  phone: z.string().optional().or(z.literal("")),
  // subjects/classes optional and allow single or multiple selection
  subjects: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : [])),
  classes: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : [])),
  department: z.string().optional().or(z.literal("")),
  qualification: z.string().optional().or(z.literal("")),
  experience: z.coerce.number().min(0, "Must be >= 0").optional(),
  hireDate: z.string().optional().or(z.literal("")),
});

// Subject form schema
export const subjectSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    teachers: z.array(z.string()).optional().default([]),
    lessons: z.array(z.string()).optional().default([]),
    grade: z.string().min(1, "Grade is required"),
    credits: z
      .preprocess(
        (v) => (v === "" ? 0 : v),
        z.number().int().min(0, "Credits must be 0 or more")
      )
      .optional()
      .default(0),
    enrolled: z
      .preprocess(
        (v) => (v === "" ? 0 : v),
        z.number().int().min(0, "Enrolled must be 0 or more")
      )
      .optional()
      .default(0),
    capacity: z
      .preprocess(
        (v) => (v === "" ? 35 : v),
        z.number().int().min(1, "Capacity must be at least 1")
      )
      .optional()
      .default(35),
    room: z.string().optional().default(""),
    status: z.enum(["Active", "Inactive", "On Hold"]).default("Active"),
  })
  .refine((data) => (data.capacity ?? 35) >= (data.enrolled ?? 0), {
    path: ["enrolled"],
    message: "Enrolled cannot exceed capacity",
  });
