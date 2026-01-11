import React, { ReactNode } from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2
        ${active 
          ? 'border-brand-500 text-brand-500 bg-brand-500/10' 
          : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'}
      `}
    >
      {icon}
      {children}
    </button>
  );
};

export default TabButton;