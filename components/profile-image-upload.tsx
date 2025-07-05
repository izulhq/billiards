"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User } from "lucide-react";

interface ProfileImageUploadProps {
  currentImage?: string | null;
  playerName: string;
  onImageChange: (imagePath: string) => void;
}

export default function ProfileImageUpload({
  currentImage,
  playerName,
  onImageChange,
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const sanitizedName = playerName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      const fileName = `player_${sanitizedName}_${timestamp}.${
        file.type.split("/")[1]
      }`;

      // In a real application, you would upload to a cloud storage service
      // For now, we'll simulate the upload and use a placeholder path

      // Convert file to base64 for preview (in production, upload to actual storage)
      const reader = new FileReader();
      reader.onload = () => {
        const imagePath = `/players/${fileName}`;
        onImageChange(imagePath);
      };
      reader.readAsDataURL(file);

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const getImageSrc = () => {
    if (currentImage) {
      // If it starts with /players/, it's a local image
      if (currentImage.startsWith("/players/")) {
        return currentImage;
      }
      // If it's a full URL, use it directly
      if (currentImage.startsWith("http")) {
        return currentImage;
      }
      // Otherwise, treat it as a public folder image
      return `/${currentImage}`;
    }
    return "/placeholder-user.jpg";
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={getImageSrc()} alt={playerName} />
        <AvatarFallback>
          <User className="h-8 w-8" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Change Photo"}
        </Button>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-xs text-gray-500">Max 2MB • JPG, PNG, GIF</p>
      </div>
    </div>
  );
}
