# Epic 14: Advanced Offline Sync & Mutation Queueing

## Overview
Elevate the mobile/field experience by allowing users to continue working even when they completely lose internet connection. The app should store these actions locally and seamlessly sync them to the backend once the connection is restored.

## Tasks
- [ ] **Task 14.1: Persistent Cache Setup**
  Integrate `@tanstack/query-sync-storage-persister` to persist the React Query cache into the browser's IndexedDB.
- [ ] **Task 14.2: Offline Mutation Queue**
  Intercept API `POST`/`PUT`/`DELETE` requests when `navigator.onLine` is false and store them in a local queue.
- [ ] **Task 14.3: Background Sync Manager**
  Create a listener that detects when the network is restored, iterates through the offline queue, and executes the API calls.
- [ ] **Task 14.4: Offline UI Indicators**
  Add visual indicators to the UI for pending syncs (e.g., a cloud icon next to pending rows).
