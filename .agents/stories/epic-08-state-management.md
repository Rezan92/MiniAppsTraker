# Epic 08: Server State Management & API Caching Optimization

## Overview
To prevent redundant API requests and excessive database reads upon navigation, we need to implement a robust Server State Management layer (e.g., React Query / TanStack Query). The goal is to cache data locally and only refetch when data is mutated (Created, Updated, or Deleted).

## Tasks
- [x] **Task 8.1: Architecture & Library Integration**
  - Research and integrate a caching library (e.g., `@tanstack/react-query`).
  - Wrap the React application in the global query provider.
- [x] **Task 8.2: Refactor Read Operations (Queries)**
  - Convert existing `useEffect` fetches in `ClientList.jsx` and `JobList.jsx` into custom cached hooks (e.g., `useClients`, `useJobs`).
  - Ensure navigating between tabs relies on cached data rather than triggering new network requests.
- [x] **Task 8.3: Refactor Write Operations (Mutations)**
  - Update all POST, PUT, and DELETE API calls to utilize mutation hooks.
  - Implement cache invalidation so that when a user adds/edits a record, the specific cache key is cleared and fresh data is seamlessly fetched in the background.
