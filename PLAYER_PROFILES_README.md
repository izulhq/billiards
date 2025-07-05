# Player Profile System Update

## What's Changed

This update implements a player profile system with the following features:

### 1. Database Changes

- Added `player_profiles` table for storing unique player information
- Added `profile_id` column to `players` table to link tournament players to profiles
- Created a PostgreSQL function `get_or_create_player_profile()` for managing profiles

### 2. Profile Pictures

- Players can now have profile pictures stored in `/public/players/` folder
- Profile images replace the Home/Plane icons in match cards
- Images are displayed as avatars throughout the application

### 3. Reduced Player Duplication

- Players with the same name across different tournaments now share the same profile
- Profile information (including images) is preserved across tournaments
- Only tournament-specific stats (points, wins, losses) are separate per tournament

## How to Use

### Setting Up the Database

1. Run the migration script: `004-add-player-profiles.sql`
2. This will create the necessary tables and functions

### Adding Players with Photos

1. When creating a tournament, add players as usual
2. Click "Edit Photo" next to any player to upload their profile picture
3. Supported formats: JPG, PNG, GIF (max 2MB)
4. Images are automatically resized and stored in `/public/players/`

### Profile Picture Storage

- Images are stored in `/public/players/` folder
- Naming convention: `player_{sanitized_name}_{timestamp}.{extension}`
- Fallback to `/placeholder-user.jpg` if no image is set

## Database Schema

### player_profiles table

```sql
- id (UUID, Primary Key)
- name (VARCHAR, Unique)
- profile_image (VARCHAR, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### players table (updated)

```sql
- ... existing columns ...
- profile_id (UUID, Foreign Key to player_profiles)
```

## Components Updated

1. **match-card.tsx** - Now displays player avatars instead of icons
2. **participant-manager.tsx** - Added profile image upload functionality
3. **tournament-schedule.tsx** - Loads player profiles with tournament data
4. **profile-image-upload.tsx** - New component for handling image uploads

## Technical Notes

- Player profiles are created/updated when tournaments are created
- The system gracefully handles missing profile images
- Images are validated for type and size before upload
- The `get_or_create_player_profile()` function prevents duplicate profiles

## Future Enhancements

- Cloud storage integration (AWS S3, Cloudinary, etc.)
- Image resizing and optimization
- Bulk player import with profile data
- Player statistics across all tournaments
