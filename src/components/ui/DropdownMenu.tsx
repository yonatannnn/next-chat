import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, Info, X } from 'lucide-react';

interface DropdownItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
  items: DropdownItem[];
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemClick = (item: DropdownItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="More options"
      >
        <MoreVertical size={18} className="md:w-5 md:h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-40 md:w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                item.variant === 'danger' 
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              <span className="text-xs md:text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
