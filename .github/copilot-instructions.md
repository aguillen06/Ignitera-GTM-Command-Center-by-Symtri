# Copilot Instructions

This document provides guidelines for GitHub Copilot when working with the Ignitera GTM Command Center codebase.

## Project Overview

Ignitera GTM Command Center is a Go-To-Market command center application built with:
- **React 19** with TypeScript
- **Vite** for development and building
- **Supabase** for authentication and database
- **Google Gemini AI** for AI-powered features
- **Lucide React** for icons

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
/
├── components/         # React components
├── services/          # External service integrations (Gemini, Supabase)
├── types.ts           # TypeScript type definitions
├── index.tsx          # Application entry point
├── index.html         # HTML template
├── vite.config.ts     # Vite configuration
└── tsconfig.json      # TypeScript configuration
```

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define interfaces for all data structures in `types.ts`
- Use explicit type annotations for function parameters and return types
- Avoid using `any` type; prefer proper typing or `unknown` when necessary

### React

- Use functional components with hooks
- Prefer arrow function syntax for component definitions
- Use destructuring for props
- Follow the existing component patterns in the `components/` directory
- Use Lucide React icons for any iconography needs

### Naming Conventions

- Use PascalCase for component names and TypeScript interfaces
- Use camelCase for variables, functions, and file names (except components)
- Use SCREAMING_SNAKE_CASE for constants
- Component files should match the component name (e.g., `LeadDetail.tsx` for `LeadDetail` component)

### Error Handling

- Use try-catch blocks for async operations
- Display user-friendly error messages using the Toast component
- Log errors to the console for debugging purposes
- Always handle potential null/undefined values

### State Management

- Use React's built-in `useState` and `useEffect` hooks
- Keep state as close to where it's used as possible
- Use the existing Toast context for notifications (`useToast` hook)

## Environment Variables

- `GEMINI_API_KEY` - Required for Gemini AI integration
- Supabase credentials are configured in `services/supabase.ts`
- Environment variables should be stored in `.env.local` (not committed to git)

## Component Guidelines

When creating or modifying components:

1. Follow the existing styling patterns using Tailwind CSS classes
2. Maintain consistency with the dark navigation bar and light content area theme
3. Use the existing color scheme (indigo for primary actions, slate/gray for neutral elements)
4. Include proper loading states and error handling
5. Ensure accessibility with appropriate ARIA labels and semantic HTML

## Database Interactions

- Use the Supabase client from `services/supabase.ts`
- Handle database errors gracefully
- Use typed responses based on interfaces in `types.ts`

## AI Service Integration

- AI services are implemented in `services/gemini.ts`
- Always handle API rate limits and errors
- Provide meaningful feedback to users during AI operations
