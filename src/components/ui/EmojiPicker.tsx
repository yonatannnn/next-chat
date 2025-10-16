import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

const EMOJI_CATEGORIES = {
  'Faces': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'],
  'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
  'Hearts': ['💋', '💌', '💘', '💝', '💖', '💗', '💓', '💕', '💞', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💤', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💤'],
  'Objects': ['🎯', '🎪', '🎨', '🎭', '🎪', '🎫', '🎬', '🎮', '🕹️', '🎰', '🧩', '🎲', '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴', '🎯', '🎪', '🎨', '🎭', '🎪', '🎫', '🎬', '🎮', '🕹️', '🎰', '🧩', '🎲', '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴'],
  'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫒', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🫔', '🥙', '🧆'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦍', '🦧', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🦄', '🐎', '🦓', '🦌', '🐂', '🐃', '🐄', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐐', '🐑', '🐏', '🐖', '🐗', '🐽', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦍', '🦧', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🦄', '🐎', '🦓', '🦌', '🐂', '🐃', '🐄', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐐', '🐑', '🐏', '🐖', '🐗', '🐽']
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Faces');
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  const categories = Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 flex-shrink-0"
        title="Add emoji"
      >
        <Smile size={18} className="md:w-5 md:h-5" />
      </button>

      {isOpen && (
        <div
          ref={pickerRef}
          className="fixed bottom-20 left-0 right-0 mx-auto mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[90vw] sm:w-80 sm:absolute sm:bottom-full sm:left-0 sm:right-auto sm:mx-0 max-h-64 overflow-hidden"
        >
          {/* Category tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-2 sm:px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === category
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="p-2 sm:p-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[selectedCategory].map((emoji, index) => (
                <button
                  key={`${selectedCategory}-${index}`}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
