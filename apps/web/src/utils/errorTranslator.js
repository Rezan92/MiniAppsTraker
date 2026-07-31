/**
 * Translates raw API or database errors into user-friendly messages.
 * 
 * @param {Error|object|string} err - The error object returned from a catch block
 * @returns {string} - A human-readable error message
 */
export const translateApiError = (err) => {
  if (!err) return "An unexpected error occurred.";

  const message = typeof err === 'string' ? err : (err.message || '');
  
  // Handle Supabase/PostgreSQL Specific Constraint Violations by their raw string leakage
  if (message.includes('23505') || message.toLowerCase().includes('duplicate key') || message.toLowerCase().includes('already exists')) {
    if (message.toLowerCase().includes('email')) {
      return "This email address is already registered.";
    }
    if (message.toLowerCase().includes('phone')) {
      return "This phone number is already registered.";
    }
    return "A record with this information already exists. Please check for duplicates.";
  }

  if (message.includes('23503') || message.toLowerCase().includes('foreign key constraint')) {
    return "This record is linked to other data and cannot be modified or deleted directly.";
  }

  if (message.includes('42501') || message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('policy')) {
    return "You do not have permission to perform this action on this record.";
  }

  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('failed to fetch')) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  if (message.includes('Failed to fetch')) {
    // Vite / Fetch specific error when API is totally down
    return "The server is currently unreachable. Please try again later.";
  }

  // Fallback to the exact message if it's already a cleanly formatted custom API error
  // (Assuming our backend returns clean error messages for validation like "Invalid email format")
  if (message && message.length < 100 && !message.includes('{"')) {
    return message;
  }

  return "An unexpected error occurred while processing your request.";
};
