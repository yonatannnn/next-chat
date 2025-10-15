import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  images?: string[]; // For multiple images
  currentIndex?: number; // Current image index
  onNavigate?: (index: number) => void; // Navigation callback
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt,
  isOpen,
  onClose,
  images = [],
  currentIndex = 0,
  onNavigate,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    link.target = '_blank';
    link.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handlePrevious = () => {
    if (images.length > 1 && onNavigate) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
      onNavigate(newIndex);
      handleReset(); // Reset zoom/position when changing images
    }
  };

  const handleNext = () => {
    if (images.length > 1 && onNavigate) {
      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      onNavigate(newIndex);
      handleReset(); // Reset zoom/position when changing images
    }
  };

  const currentImageSrc = images.length > 0 ? images[currentIndex] : src;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
        title="Close (Esc)"
      >
        <X size={24} />
      </button>

      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          title="Reset"
        >
          <Maximize2 size={20} />
        </button>
        <button
          onClick={handleRotate}
          className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          title="Rotate"
        >
          <RotateCw size={20} />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          title="Download"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Navigation arrows for multiple images */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            title="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            title="Next image"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Image container */}
      <div
        className="relative max-w-full max-h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <Image
            src={currentImageSrc}
            alt={alt}
            width={800}
            height={600}
            className="max-w-none"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
            }}
            unoptimized
          />
        </div>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Image counter for multiple images */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        <div>
          Scroll to zoom • Drag to pan • ESC to close
          {images.length > 1 && ' • Use arrows to navigate'}
        </div>
      </div>
    </div>
  );
};
