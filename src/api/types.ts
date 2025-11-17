// src/api/types.ts

// --- Photo Types ---

// A single photo object returned by the backend
export interface Photo {
  filename: string;          // The original filename
  uploaded_path: string;     // Local path on the server
  processed_path: string;    // Local path of processed photo
  public_url: string;        // URL to display in the frontend
}

// Response from /photo/list endpoint
export interface PhotosListResponse {
  uploaded_images: Photo[];        // All uploaded photos for the selected profile
  selected_image: Photo | null;    // The currently selected photo, or null if none
}

// --- Profile Types ---

export interface Profile {
  name: string;                    // Profile name (unique identifier)
  created_at?: string;             // Optional: ISO timestamp
  active?: boolean;                // Optional: indicates if currently selected
}