# Supabase Integration Setup Guide

This guide explains how to set up Supabase authentication and database integration for the Quiz App.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the Supabase dashboard

## Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Migration

Run the migration file `20250127_integrate_supabase_auth.sql` in your Supabase SQL editor to:

1. Create the users table that integrates with Supabase auth
2. Set up Row Level Security (RLS) policies
3. Create automatic user profile creation triggers
4. Configure proper foreign key relationships

## Authentication Features

The application now uses Supabase's built-in authentication system:

### User Registration
- Uses `supabase.auth.signUp()` with email/password
- Automatically creates user profile in the database
- Supports custom metadata (username)

### User Login
- Uses `supabase.auth.signInWithPassword()`
- Automatic session management
- Persistent authentication state

### User Logout
- Uses `supabase.auth.signOut()`
- Clears all authentication state

## Row Level Security (RLS)

The database is secured with RLS policies:

### Users Table
- Users can only view/edit their own profile
- Admins can view all users

### Quizzes Table
- All users can view quizzes
- Users can only create/edit/delete their own quizzes
- Admins have full access

### Quiz Attempts Table
- Users can only view their own attempts
- Quiz creators can view attempts on their quizzes
- Admins have full access

## Key Changes Made

1. **Authentication System**: Replaced custom password hashing with Supabase's built-in auth
2. **User Management**: Users table now references `auth.users(id)`
3. **Session Management**: Automatic session handling with `onAuthStateChange`
4. **Security**: All database operations now use RLS for security
5. **Foreign Keys**: Proper relationships between users, quizzes, and attempts

## Testing

1. Start the development server: `npm run dev`
2. Try registering a new user
3. Test login/logout functionality
4. Verify that users can only access their own data

## Troubleshooting

- Ensure your `.env` file is not committed to version control
- Check Supabase dashboard for any authentication or RLS policy errors
- Verify that the migration was applied successfully
- Check browser console for any authentication errors
