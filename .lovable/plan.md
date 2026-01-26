
# Implementation Plan: Feedback System, Admin Interface, Settings Label, and Dark Mode

## Overview

This plan implements four features for the DrinkSmart app:
1. **Feedback Tab** - User-facing feedback form with optional photo upload
2. **Admin Interface** - Secure admin-only page to view/manage feedback and admin users
3. **Settings Label** - Visual indicator for non-authenticated users
4. **Dark Mode Toggle** - Functional theme toggle in Graphics settings

---

## Phase 1: Database Setup

### 1.1 Create Role Enum and User Roles Table

```sql
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 1.2 Create Security Definer Function

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### 1.3 Create Feedback Table

```sql
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
```

### 1.4 RLS Policies for Feedback

```sql
-- Anyone (authenticated or not) can submit feedback
CREATE POLICY "Anyone can insert feedback"
ON public.feedback FOR INSERT
WITH CHECK (true);

-- Only admins can read all feedback
CREATE POLICY "Admins can read all feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update feedback (mark as reviewed)
CREATE POLICY "Admins can update feedback"
ON public.feedback FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.feedback FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 1.5 RLS Policies for User Roles

```sql
-- Only admins can view user roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can add roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can remove roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 1.6 Create Feedback Images Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-images', 'feedback-images', true);

-- Allow anyone to upload feedback images
CREATE POLICY "Anyone can upload feedback images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'feedback-images');

-- Allow anyone to view feedback images
CREATE POLICY "Anyone can view feedback images"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-images');

-- Only admins can delete feedback images
CREATE POLICY "Admins can delete feedback images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-images' AND public.has_role(auth.uid(), 'admin'));
```

---

## Phase 2: New Components and Hooks

### 2.1 Create `useUserRole.ts` Hook

**File:** `src/hooks/useUserRole.ts`

- Fetches the current user's role from `user_roles` table
- Returns `{ isAdmin, isLoading }` for easy access control
- Uses React Query for caching and automatic refetching

### 2.2 Create `FeedbackTab.tsx` Component

**File:** `src/components/tabs/FeedbackTab.tsx`

**Features:**
- Form with Title (required), Description (required), Photo Upload (optional)
- Image preview before submission
- Uploads image to `feedback-images` bucket
- Inserts feedback record with optional `user_id` (null if not logged in)
- Success toast on submission
- Form reset after successful submission

### 2.3 Create Admin Interface Components

**File:** `src/pages/AdminFeedback.tsx`

- Main admin page with authorization check
- Redirects non-admins with "Not Authorized" message
- Contains FeedbackList and AdminManagement sections

**File:** `src/components/admin/FeedbackList.tsx`

- Table displaying all feedback submissions
- Columns: Title, Submitted By (username or "Anonymous"), Date, Status
- Click to expand/view full details and attached image
- Mark as Reviewed button
- Delete feedback button with confirmation

**File:** `src/components/admin/AdminManagement.tsx`

- Section to manage admin users
- Lists current admins with their usernames
- Search users by username to add as admin
- Remove admin role button with confirmation

### 2.4 Create `ThemeToggle.tsx` Component

**File:** `src/components/settings/ThemeToggle.tsx`

- Simple toggle switch for light/dark mode
- Uses `next-themes` (already in dependencies)
- Theme persists across sessions via localStorage

---

## Phase 3: Modify Existing Files

### 3.1 Update `main.tsx`

- Wrap App with `ThemeProvider` from `next-themes`
- Configure with `attribute="class"` to work with Tailwind dark mode

### 3.2 Update `App.tsx`

- Add new route: `/admin/feedback` pointing to `AdminFeedback` page

### 3.3 Update `Dashboard.tsx`

**Tab Changes:**
- Add new "Feedback" tab after Timeline
- Update TabsList to 7 columns (from 6)
- Add TabsContent for Feedback tab

**Settings Menu Changes:**
- Make Graphics button functional (opens theme toggle popover/sheet)
- Add settings label badge for non-authenticated users near the Settings cog

**Authentication Check:**
- Use `supabase.auth.getUser()` to detect if user is logged in
- Show "Create account" badge only for non-authenticated users

---

## Phase 4: TypeScript Types Update

The Supabase types will auto-regenerate after migrations, but the new tables will include:

```typescript
// feedback table type
{
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  image_url: string | null;
  status: 'new' | 'reviewed';
  created_at: string;
}

// user_roles table type
{
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
}
```

---

## File Summary

### New Files (7)
| File | Purpose |
|------|---------|
| `src/hooks/useUserRole.ts` | Hook to check if current user is admin |
| `src/components/tabs/FeedbackTab.tsx` | User feedback submission form |
| `src/pages/AdminFeedback.tsx` | Admin interface page |
| `src/components/admin/FeedbackList.tsx` | Admin feedback table and detail view |
| `src/components/admin/AdminManagement.tsx` | Admin user management panel |
| `src/components/settings/ThemeToggle.tsx` | Dark mode toggle component |
| `src/components/settings/GraphicsSheet.tsx` | Sheet/dialog for graphics settings |

### Modified Files (3)
| File | Changes |
|------|---------|
| `src/main.tsx` | Add ThemeProvider wrapper |
| `src/App.tsx` | Add /admin/feedback route |
| `src/pages/Dashboard.tsx` | Add Feedback tab, settings label, Graphics functionality |

---

## Post-Implementation: First Admin Setup

After the implementation is complete, you will need to run these SQL queries once in the Cloud SQL runner:

**Step 1: Find your user ID**
```sql
SELECT user_id, username FROM profiles WHERE username = 'YOUR_USERNAME_HERE';
```
(Your username is displayed on the /account page under your avatar)

**Step 2: Grant yourself admin role**
```sql
INSERT INTO user_roles (user_id, role) VALUES ('paste-your-user-id-here', 'admin');
```

After this one-time setup, you can manage all other admins through the Admin Management panel in the UI.

---

## Security Considerations

- **Server-side validation**: Admin status is always checked via database, never client-side storage
- **Security definer function**: Prevents RLS recursion issues when checking roles
- **Cascading deletes**: User roles are automatically removed when a user is deleted
- **Image uploads**: Stored in dedicated bucket with appropriate access policies
- **Anonymous feedback**: User ID is nullable, allowing feedback from non-authenticated users while still linking feedback to accounts when available
