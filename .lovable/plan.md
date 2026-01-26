

## Password Reset & Password Visibility Features

This plan adds two features to the authentication page:
1. **"Forgot Password" option** - Sends a password reset email and handles the reset flow
2. **Password visibility toggle** - Eye icon to show/hide password as you type

---

## Overview

The password reset will use the built-in authentication email system. When a user clicks "Forgot Password", they enter their email, receive a reset link, and are taken to a page where they can set a new password. The password visibility toggle will be a simple eye icon button next to the password field.

---

## Implementation Steps

### 1. Add Password Visibility Toggle to Auth.tsx

**Changes:**
- Add `showPassword` state variable
- Import `Eye` and `EyeOff` icons from lucide-react
- Change the password input type from `"password"` to `{showPassword ? "text" : "password"}`
- Add a clickable eye icon button inside the password input field (right side)

### 2. Add Forgot Password Mode to Auth.tsx

**Changes:**
- Add `isForgotPassword` state to track when user is in forgot password mode
- Create a "Forgot Password?" link below the password field (only shows on sign-in view)
- When in forgot password mode:
  - Show only the email field
  - Change button text to "Send Reset Link"
  - Update card title/description
- Implement `handleForgotPassword` function that calls `supabase.auth.resetPasswordForEmail()`
- Add a "Back to Sign In" link

### 3. Create Reset Password Page (src/pages/ResetPassword.tsx)

**New page that:**
- Handles the password reset token from the URL (when user clicks email link)
- Shows two password fields (new password + confirm password)
- Includes password visibility toggles on both fields
- Validates passwords match and meet requirements
- Calls `supabase.auth.updateUser({ password })` to set the new password
- Shows success message and redirects to sign-in

### 4. Add Route for Reset Password Page

**Update App.tsx:**
- Import the new ResetPassword component
- Add route: `<Route path="/reset-password" element={<ResetPassword />} />`

---

## Technical Details

### Password Reset Email Flow
1. User clicks "Forgot Password?" on sign-in form
2. User enters email and clicks "Send Reset Link"
3. `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })` is called
4. User receives email with reset link
5. User clicks link, lands on `/reset-password` page
6. The authentication session token is automatically captured
7. User enters new password and submits
8. `supabase.auth.updateUser({ password: newPassword })` updates the password
9. User is redirected to sign in with success message

### Password Visibility Toggle Structure
```tsx
<div className="relative">
  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
  <Input
    type={showPassword ? "text" : "password"}
    className="pl-10 pr-10"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-3"
  >
    {showPassword ? <EyeOff /> : <Eye />}
  </button>
</div>
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Auth.tsx` | Modify | Add password toggle, forgot password mode, and reset email logic |
| `src/pages/ResetPassword.tsx` | Create | New page for setting new password after clicking email link |
| `src/App.tsx` | Modify | Add route for `/reset-password` |

