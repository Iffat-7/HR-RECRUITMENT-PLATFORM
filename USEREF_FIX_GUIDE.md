# 🔧 useRef TypeError Fix - Multiple React Instances

## Problem

You encountered this error:
```
TypeError: Cannot read properties of null (reading 'useRef')
```

This error occurs when **multiple React instances** are loaded, causing `react-hook-form` to use a different React instance than your main app.

## Root Cause

Vite was not deduplicating React properly, causing:
- `react-hook-form` to import one React instance
- Your main app to use another React instance
- Hooks like `useRef` to fail because they're called in the wrong context

## ✅ Solution Applied

I've updated `vite.config.js` to:
1. **Deduplicate React** - Force all packages to use the same React instance
2. **Pre-bundle dependencies** - Ensure React and related packages are optimized together

### Changes Made

**File: `vite.config.js`**

Added:
```javascript
resolve: {
  dedupe: ["react", "react-dom"],
},
optimizeDeps: {
  include: ["react", "react-dom", "react-hook-form", "@hookform/resolvers"],
},
```

This ensures:
- Only one React instance is loaded
- All packages use the same React
- Hooks work correctly across all components

## 🚀 What You Need to Do

### Step 1: Stop the Dev Server

If the dev server is running, stop it (Ctrl+C).

### Step 2: Clear Vite Cache

Delete the Vite cache directory:

**On Windows:**
```bash
rmdir /s /q node_modules\.vite
```

**On Mac/Linux:**
```bash
rm -rf node_modules/.vite
```

**Or manually:**
- Navigate to `node_modules/.vite`
- Delete the entire `.vite` folder

### Step 3: Restart the Dev Server

```bash
npm run dev
```

### Step 4: Hard Refresh Browser

1. Open your app in the browser
2. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
3. Or manually clear browser cache and reload

### Step 5: Test Login

1. Go to the login page
2. Sign in with `iffatabdulsattar68@gmail.com`
3. You should now see the login form without errors
4. After signing in, you should be redirected to the HR dashboard

## 📊 Expected Behavior

### Before Fix
```
❌ TypeError: Cannot read properties of null (reading 'useRef')
❌ Login page crashes
❌ Cannot access the app
```

### After Fix
```
✅ Login page loads successfully
✅ Form renders correctly
✅ Can enter email and password
✅ Can sign in
✅ Redirects to HR dashboard (if HR role assigned)
```

## 🔍 How to Verify the Fix

### Check Console for Errors

Open DevTools (F12) → Console tab

**Should NOT see:**
- `TypeError: Cannot read properties of null`
- `useRef` errors
- Multiple React instance warnings

**Should see (if debugging enabled):**
- `Login redirect check: { userEmail: "...", isHr: true, initializing: false }`
- `User is HR, redirecting to /admin`

### Test the Login Flow

1. ✅ Login page renders without errors
2. ✅ Can type in email field
3. ✅ Can type in password field
4. ✅ Can click "Sign in" button
5. ✅ Form validation works
6. ✅ After login, redirects to correct page

## 🛠️ If the Error Persists

### Option 1: Reinstall Dependencies

```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### Option 2: Check for Duplicate React

Run this in your terminal:

```bash
npm ls react
```

You should see only **one** React version. If you see multiple, there's a dependency conflict.

### Option 3: Force React Version

Add to `package.json`:

```json
"resolutions": {
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

Then run:
```bash
npm install
```

### Option 4: Check Vite Config

Verify `vite.config.js` has:

```javascript
resolve: {
  dedupe: ["react", "react-dom"],
},
optimizeDeps: {
  include: ["react", "react-dom", "react-hook-form", "@hookform/resolvers"],
},
```

## 📝 Technical Details

### Why This Happens

When Vite optimizes dependencies, it can sometimes create separate bundles for:
- `react` (used by your app)
- `react` (used by `react-hook-form`)

This creates two React instances, and React hooks must be called within the same React context. When they're not, you get errors like:
- `Cannot read properties of null (reading 'useRef')`
- `Invalid hook call`
- `Rendered more hooks than during the previous render`

### How the Fix Works

1. **`resolve.dedupe`** - Tells Vite to resolve these modules to a single instance
2. **`optimizeDeps.include`** - Pre-bundles these dependencies together
3. **Result** - All packages use the same React instance

## ✅ Success Criteria

After applying this fix, you should be able to:

- [ ] Login page loads without errors
- [ ] Can enter email and password
- [ ] Can submit the login form
- [ ] Successfully authenticate with Supabase
- [ ] Redirect to HR dashboard (if HR role assigned)
- [ ] No console errors about React or hooks

## 🎯 Next Steps

Once the login works:

1. **Verify HR role assignment** - Run the SQL from `fix-get-user-roles.sql`
2. **Test the full flow** - Login → Dashboard → Manage candidates
3. **Test candidate portal** - Create a test candidate account
4. **Test recording flow** - Try the interview recording feature

## 📚 Related Files

- `vite.config.js` - Vite configuration with React deduplication
- `src/pages/auth/Login.tsx` - Login component
- `src/hooks/useAuth.tsx` - Authentication hook
- `fix-get-user-roles.sql` - Database function fix (if needed)

## 💡 Prevention

This issue can happen when:
- Adding new packages that depend on React
- Updating dependencies
- Clearing node_modules without clearing Vite cache

**Best practices:**
- Always clear Vite cache when switching branches
- Use `npm ci` instead of `npm install` in CI/CD
- Keep React and related packages at compatible versions

---

## Summary

**Problem:** Multiple React instances causing `useRef` TypeError  
**Solution:** Updated Vite config to deduplicate React  
**Action Required:** Clear Vite cache and restart dev server  
**Expected Result:** Login page works, can sign in successfully

The fix is already applied to `vite.config.js`. Just clear the cache and restart!
