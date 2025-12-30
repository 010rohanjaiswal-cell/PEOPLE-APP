#!/usr/bin/env python3
"""
Script to set up app icon from a source image
Usage: python3 setup-icon.py <path-to-icon-image>
"""

import sys
import os
from PIL import Image

def setup_icon(source_image_path):
    """Generate all required icon files from source image"""
    
    if not os.path.exists(source_image_path):
        print(f"Error: Image file not found: {source_image_path}")
        return False
    
    assets_dir = "./assets"
    os.makedirs(assets_dir, exist_ok=True)
    
    try:
        # Open source image
        img = Image.open(source_image_path)
        
        # Convert to RGBA if needed (for transparency support)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        print(f"Source image: {img.size[0]}x{img.size[1]} pixels")
        
        # Create 1024x1024 icon.png
        print("Creating icon.png (1024x1024)...")
        icon = img.resize((1024, 1024), Image.Resampling.LANCZOS)
        icon.save(os.path.join(assets_dir, "icon.png"), "PNG")
        
        # Create adaptive-icon.png (1024x1024) - same as icon for Android
        print("Creating adaptive-icon.png (1024x1024)...")
        adaptive_icon = img.resize((1024, 1024), Image.Resampling.LANCZOS)
        adaptive_icon.save(os.path.join(assets_dir, "adaptive-icon.png"), "PNG")
        
        # Create splash-icon.png (1024x1024)
        print("Creating splash-icon.png (1024x1024)...")
        splash_icon = img.resize((1024, 1024), Image.Resampling.LANCZOS)
        splash_icon.save(os.path.join(assets_dir, "splash-icon.png"), "PNG")
        
        # Create favicon.png (512x512 for web)
        print("Creating favicon.png (512x512)...")
        favicon = img.resize((512, 512), Image.Resampling.LANCZOS)
        favicon.save(os.path.join(assets_dir, "favicon.png"), "PNG")
        
        print("✅ Icon setup complete!")
        print(f"All icon files have been created in {assets_dir}")
        return True
        
    except Exception as e:
        print(f"Error processing image: {e}")
        print("\nMake sure Pillow is installed: pip install Pillow")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 setup-icon.py <path-to-icon-image>")
        print("Example: python3 setup-icon.py ~/Downloads/app-icon.png")
        sys.exit(1)
    
    success = setup_icon(sys.argv[1])
    sys.exit(0 if success else 1)

