import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  glassmorphism?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  glassmorphism = false,
  closeOnBackdropClick = true,
  className = ''
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md', 
    lg: 'modal-lg',
    xl: 'modal-xl',
    full: 'modal-full'
  };

  const modalClass = glassmorphism 
    ? `modal modal-glassmorphism ${sizeClasses[size]}`
    : `modal ${sizeClasses[size]}`;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`${modalClass} ${className}`}>
        {title && (
          <div className={glassmorphism ? "modal-glass-header" : "modal-header"}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">
                {title}
              </h3>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-all duration-200 ${
                  glassmorphism 
                    ? 'hover:bg-white/20 text-primary' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        <div className={glassmorphism ? "modal-glass-body" : "modal-body"}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const ModalHeader: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  glassmorphism?: boolean;
}> = ({
  children,
  className = '',
  glassmorphism = false
}) => (
  <div className={`${glassmorphism ? 'modal-glass-header' : 'modal-header'} ${className}`}>
    {children}
  </div>
);

export const ModalBody: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  glassmorphism?: boolean;
}> = ({
  children,
  className = '',
  glassmorphism = false
}) => (
  <div className={`${glassmorphism ? 'modal-glass-body' : 'modal-body'} ${className}`}>
    {children}
  </div>
);

export const ModalFooter: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  glassmorphism?: boolean;
}> = ({
  children,
  className = '',
  glassmorphism = false
}) => (
  <div className={`${glassmorphism ? 'modal-glass-footer' : 'modal-footer'} flex justify-end space-x-2 ${className}`}>
    {children}
  </div>
); 