# Gritness Hub

A hub for my personal problem solving applications

A centralized project hub built with React, TypeScript, and modern web technologies. This hub serves as a single entry point for accessing multiple smaller projects under one domain.

## Tech Stack

- **React 19** with **TypeScript**
- **Vite** for build tooling
- **TanStack Router** for routing
- **TanStack Query** for data fetching and state management
- **shadcn/ui** for UI components and theming
- **Tailwind CSS** for styling
- **Appwrite** as Backend-as-a-Service (BaaS)

## Features

- 🎨 Modern UI with shadcn/ui components
- 🧭 Sidebar navigation
- 📊 Dashboard with clickable project cards
- 🎯 Type-safe routing with TanStack Router
- 🔄 Server state management with TanStack Query
- ☁️ Backend integration ready with Appwrite

## Getting Started

### Prerequisites

- Node.js 20.19.0 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your-project-id
   VITE_APPWRITE_DATABASE_ID=your-database-id
   VITE_APPWRITE_BIBLE_COOP_PLANS_COLLECTION_ID=biblecoopplans
   VITE_APPWRITE_BIBLE_COOP_MEMBERS_COLLECTION_ID=biblecoopmembers
   VITE_APPWRITE_BIBLE_COOP_READ_LOGS_COLLECTION_ID=biblecoopreadlogs
   VITE_APPWRITE_BIBLE_COOP_INVITES_COLLECTION_ID=biblecoopinvites
   VITE_APPWRITE_CHORDPRO_FOLDERS_COLLECTION_ID=chordproFolders
   VITE_APPWRITE_CHORDPRO_SONGS_COLLECTION_ID=chordproSongs
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── ui/          # shadcn/ui components
│   ├── layout.tsx   # Main layout with sidebar
│   └── dashboard.tsx # Dashboard page
├── lib/
│   ├── appwrite.ts  # Appwrite client configuration
│   └── utils.ts     # Utility functions
├── routes/          # TanStack Router routes
│   ├── __root.tsx   # Root route
│   └── index.tsx    # Dashboard route
└── main.tsx         # Application entry point
```

## Available Projects

The dashboard currently includes cards for:

- **Todo / Scrumban Board** - Task management with kanban-style boards
- **Bible Co-op Reading** - Shared chapter plans with adjusted pacing and progress
- **ChordPro to PDF Converter** - Convert ChordPro files to PDF
- **Website Reviewer** - Review and analyze websites
- **Documentation Hub** - Centralized documentation

## Appwrite Schema for Bible Co-op Reading

Create these collections in your Appwrite database:

### `bibleCoopPlans`
- `title` (string, required)
- `description` (string, optional)
- `ownerId` (string, required)
- `ownerName` (string, optional)
- `startDate` (string, required, format `YYYY-MM-DD`)
- `totalDays` (integer, required)
- `startBook` (string, required)
- `startChapter` (integer, required)
- `endBook` (string, required)
- `endChapter` (integer, required)
- `status` (string, optional, e.g. `active`)

### `bibleCoopMembers`
- `planId` (string, required)
- `userId` (string, required)
- `userName` (string, optional)
- `userEmail` (string, optional)
- `role` (string, required: `owner` or `member`)

### `bibleCoopReadLogs`
- `planId` (string, required)
- `userId` (string, required)
- `userName` (string, optional)
- `chapterBook` (string, required)
- `chapterNumber` (integer, required)
- `readDate` (string, required, format `YYYY-MM-DD`)

### `biblecoopinvites`
- `planId` (string, required)
- `inviteeEmail` (string, required)
- `inviterId` (string, required)

Recommended indexes:
- On all collections: index `planId` and `userId` where present
- On `bibleCoopPlans`: index `ownerId`

## Appwrite Schema for ChordPro Song Bank

Create these collections in your Appwrite database:

### `chordproFolders`
- `ownerId` (string, required)
- `name` (string, required)

### `chordproSongs`
- `ownerId` (string, required)
- `folderId` (string, optional, can be empty string)
- `title` (string, required)
- `content` (string, required)
- `key` (string, optional)
- `artist` (string, optional)

Recommended indexes:
- On both collections: index `ownerId`
- On `chordproSongs`: index `folderId`

## Adding New Projects

To add a new project:

1. Create a new route in `src/routes/`
2. Add a project card to the `projects` array in `src/components/dashboard.tsx`
3. Implement the project component

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

MIT
