// src/api/types.ts

// A single photo object returned by the backend
export interface Photo {
  filename: string;          // The original filename
  uploaded_path: string;     // Local path on the server
  processed_path: string;    // Local path of processed photo
  public_url: string;        // URL to display in the frontend
}

// Response from /photo/list endpoint
export interface PhotosListResponse {
  uploaded_images: Photo[];  // All uploaded photos for the selected profile
  selected_image: Photo | null; // The currently selected photo, or null if none
}