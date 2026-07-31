# Epic 06: Error Handling & UX Safety Nets

## Overview
Ensure the application handles failures gracefully, prevents user frustration through clear form validation, and never exposes raw backend database errors to the end-user.

## Tasks
- [x] **Task 6.1: Global React Error Boundary**
  Wrap the main app in an Error Boundary. Catch component crashes and display a friendly "Something went wrong" UI with a "Reload Page" button to prevent white-screening.
- [x] **Task 6.2: Inline Form Validation**
  Implement real-time, inline validation for all forms (e.g., `AddClientModal`). Show red helper text under fields (like "Email is required") *before* the API request fires.
- [x] **Task 6.3: API Error Translation**
  Create a utility function to intercept raw API/database errors and translate them into plain English (e.g., "This email is already registered") before triggering Toast notifications.
- [x] **Task 6.4: Offline & Network Status Detection**
  Implement a global event listener for browser network status. Display a persistent, non-intrusive banner at the top of the app notifying the user when they lose cellular/Wi-Fi connection.
