# MMSC Library Management System — Modern Design Update

This is the existing HTML/CSS/JavaScript + Express project with a visual refresh inspired by the My Messiah School of Cavite React design. The existing Express routes and Supabase-backed borrowing workflow are retained. The book API no longer selects the `description` column, matching the database schema where that column was removed.

## Setup

1. Install Node.js.
2. Create a local `.env` file in this folder (do not upload it to GitHub). Use your own Supabase connection string and a private session secret:

   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_SUPABASE_HOST:5432/postgres
   SESSION_SECRET=replace-with-a-long-random-secret
   ```

   Replace the placeholders with the connection details from your Supabase dashboard. Never share the real `.env` file publicly.
3. Open a terminal in this folder and run:

   ```bash
   npm install
   npm start
   ```

4. Open `http://localhost:3000`.

## Notes

- `modern-design.css` adds the refreshed navy/blue/amber responsive styling to the existing pages.
- The HTML pages and original JavaScript handlers remain in place.
- `node_modules`, `.env`, and local database files are intentionally not included in this ZIP.
- This is a visual update of the existing pages, not a full migration of every React-only dashboard feature from the reference project.
