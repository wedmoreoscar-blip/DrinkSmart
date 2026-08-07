# DrinkSmart

A drink-pacing app that helps users plan their drinking sessions to hit a target BAC. Built with React, Vite, TypeScript, and Supabase.

## Tech stack

- **Vite** + **React** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS**
- **Supabase** (auth, database, edge functions)
- **Capacitor** (mobile builds)

## Getting started

Requires Node.js & npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd DrinkSmart

# Install dependencies
npm i

# Start the development server
npm run dev
```

## Environment setup

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL="https://<project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
VITE_SUPABASE_PROJECT_ID="<id>"
```

See `CLAUDE.md` for full setup instructions including migrations, edge function deployment, and required Supabase settings.

## Deployment

Build for production:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

For mobile builds, see the Capacitor documentation and ensure `capacitor.config.ts` points to the correct server URL.

## Codex and Claude Code

The repository contains a shared workflow layer for both coding clients. Start with `AGENTS.md`, then
follow `docs/agent_setup/CROSS_MACHINE_SETUP.md` when preparing a new laptop or clone. Repo-local
skills, custom agents, routing, isolated worktrees, verification, and handoff/kickoff records are
versioned with the project; authentication, secrets, local permissions, and chat memory are not.
