# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Auth Service Enhancements

The `authService` now supports:

- Proactive access token refresh scheduled ~60s before JWT expiry (with a minimum 5s delay after login). The schedule recalculates after each successful refresh.
- Automatic retry of a single failed request after a 401 by performing a refresh request and replaying the original call.
- Debug mode toggle persisted in `localStorage` using key `DEBUG_MODE` (`true` / `false`). When enabled, failed login and refresh attempts log detailed diagnostics to the console.

### Using Debug Mode

Enable:

```js
import authService from "./src/services/authService";
authService.setDebugMode(true);
```

Disable:

```js
authService.setDebugMode(false);
```

Or via DevTools console:

```js
localStorage.setItem("DEBUG_MODE", "true");
location.reload();
```

### Notes

- A shallow copy of the access token is cached in `sessionStorage` (key: `sessionAccessToken`) to survive a single tab reload; full logout clears it.
- If a token is nearly expired on page load, a refresh is attempted within a few seconds (minimum 5s scheduling guard).
- Only one refresh runs at a time (`_refreshInFlight` guard).

## Linking an Existing Student User to a Student Profile

Admins can create a student user account first (credentials + username) and later attach a full student profile without re‑entering email or password. A parent relationship is now OPTIONAL at link time (you can assign or change a parent later via edit flows).

### UI Flow

- Open Students page.
- Click `Link Existing User`.
- Pick a username from the dropdown of unlinked student users (role=student, no studentProfile).
- Fill required fields (First Name, Class, Grade). Optional: Parent, Surname, Phone, Address, Sex, Birthday, Blood Type.
- Submit; modal closes and list refreshes.

Note: The Birthday field uses a lightweight popover calendar picker (react-day-picker) and stores value as `YYYY-MM-DD`.

### Endpoint (Unified)

Primary (unified) endpoint: `POST /api/v1/students`

Provide an existing student `username` (no password) and the service auto-detects a link operation. The UI may send a helper flag `linkExisting: true` (optional) but the backend infers linking whenever a username is present without a password.

Example payload (unified):

```json
{
  "username": "john123",
  "name": "John",
  "surname": "Doe",
  "parentId": "66e6f7d0c9b8e4d9aac1c001",
  "classId": "66e6f89bc9b8e4d9aac1c113",
  "gradeId": "66e6f8cbc9b8e4d9aac1c220",
  "phone": "+1-202-555-0147",
  "address": "12 School Rd",
  "sex": "male",
  "birthday": "2010-04-15",
  "bloodType": "O+"
}
```

### Data Sources

- Parents (optional): `GET /api/v1/parents`
- Classes: `GET /api/v1/classes`
- Grades: `GET /api/v1/grades`
- Unlinked Users: `GET /api/v1/users?role=student&unlinked=true`

### Validation & Behavior

- Email pulled from existing user; not editable in modal.
  // Zod schema `linkExistingStudentSchema` validates required fields / formats (parentId optional).
- After success, chosen username removed from dropdown without refetch.
- Empty optional fields omitted from payload.

### Error / Edge Handling

- Already linked user => 400 error; pick another username.
- Missing class/grade => 400 error.
- Parent only validated if provided; omit to defer.
- Race: simultaneous link attempts safe; second fails gracefully.

### Future Enhancements

- Searchable async selects
- Inline parent creation
- Transactional linking for stricter atomicity
