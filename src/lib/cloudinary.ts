import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

/**
 * Configure Cloudinary instance using server-side environment variables.
 * Credentials are never exposed to client bundles.
 */
export function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials are not configured. Please define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validate image file metadata against security constraints.
 */
export function validateImageFile(file: { size: number; type: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "No image file provided." };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Image file exceeds maximum permitted size of 5 MB.",
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, and WebP raster images are supported.",
    };
  }

  return { valid: true };
}

/**
 * Validate external image URL.
 * Only HTTPS URLs with a valid hostname and scheme are accepted.
 */
export function validateExternalImageUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Image URL cannot be empty." };
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return {
        valid: false,
        error: "Image URL must use secure HTTPS protocol (https://).",
      };
    }

    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, error: "Invalid image URL host." };
    }
  } catch {
    return { valid: false, error: "Invalid image URL format." };
  }

  return { valid: true };
}

/**
 * Upload an image buffer to Cloudinary with optimized responsive transformation.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  options?: { folder?: string }
): Promise<{ url: string; publicId: string }> {
  const cld = configureCloudinary();
  const folder = options?.folder || "pulse/polls";

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
          { width: 1400, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(new Error(error?.message || "Cloudinary image upload failed."));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Safely delete an image from Cloudinary.
 * Strictly verifies ownership by asserting that publicId is inside the 'pulse/' namespace.
 */
export async function deleteImageFromCloudinary(
  publicId: string
): Promise<{ success: boolean; result?: string }> {
  if (!publicId || typeof publicId !== "string") {
    return { success: false };
  }

  const trimmed = publicId.trim();
  // Ownership verification: Reject arbitrary asset IDs outside pulse/
  if (!trimmed.startsWith("pulse/")) {
    console.warn(`[Cloudinary] Asset deletion blocked for non-pulse identifier: ${trimmed}`);
    return { success: false };
  }

  try {
    const cld = configureCloudinary();
    const res = await cld.uploader.destroy(trimmed, { resource_type: "image" });
    return { success: res.result === "ok", result: res.result };
  } catch (err: unknown) {
    console.error("[Cloudinary] Deletion error:", err instanceof Error ? err.message : err);
    return { success: false };
  }
}
