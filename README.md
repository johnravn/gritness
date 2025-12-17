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
- **ChordPro to PDF Converter** - Convert ChordPro files to PDF
- **Website Reviewer** - Review and analyze websites
- **Documentation Hub** - Centralized documentation

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
