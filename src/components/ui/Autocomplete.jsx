// src/components/ui/Autocomplete.jsx
import { useState, useRef, useEffect } from 'react';

export default function Autocomplete({ 
  value, 
  onChange, 
  options, 
  onSelect,
  placeholder = 'Buscar...',
  labelKey = 'name',
  renderItem
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(prev => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && options[highlighted]) {
      e.preventDefault();
      onSelect(options[highlighted]);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && options.length > 0 && (
        <div className="autocomplete-list">
          {options.map((opt, index) => (
            <div
              key={opt.id || index}
              className={`autocomplete-item ${index === highlighted ? 'highlighted' : ''}`}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
            >
              {renderItem ? renderItem(opt) : opt[labelKey]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
