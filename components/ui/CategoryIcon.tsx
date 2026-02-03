import React from 'react';
import {
  Home,
  ShoppingBasket,
  Coffee,
  Car,
  Heart,
  Film,
  MoreHorizontal,
  PiggyBank,
  Tag,
  Plane,
  Gift,
  ShoppingBag,
  Smartphone,
  Wifi,
  Zap,
  Droplets,
  Baby,
  Dog,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Music,
  Gamepad2,
  Book,
  Shirt,
  Scissors,
  Wrench,
  Pill,
  Stethoscope,
  Bus,
  Train,
  Fuel,
  CreditCard,
  Wallet,
  CircleDollarSign,
  Receipt,
  Building2,
  Trees,
  Utensils,
  Beer,
  Wine,
  type LucideIcon
} from 'lucide-react';

// Map of icon names to components
const iconMap: Record<string, LucideIcon> = {
  Home,
  ShoppingBasket,
  Coffee,
  Car,
  Heart,
  Film,
  MoreHorizontal,
  PiggyBank,
  Tag,
  Plane,
  Gift,
  ShoppingBag,
  Smartphone,
  Wifi,
  Zap,
  Droplets,
  Baby,
  Dog,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Music,
  Gamepad2,
  Book,
  Shirt,
  Scissors,
  Wrench,
  Pill,
  Stethoscope,
  Bus,
  Train,
  Fuel,
  CreditCard,
  Wallet,
  CircleDollarSign,
  Receipt,
  Building2,
  Trees,
  Utensils,
  Beer,
  Wine,
};

// Export list for picker
export const AVAILABLE_ICONS = Object.keys(iconMap);

interface CategoryIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ icon, size = 18, className = '' }) => {
  const IconComponent = iconMap[icon] || Tag;
  return <IconComponent size={size} className={className} />;
};

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">Wybierz ikonę</h2>
        <div className="grid grid-cols-6 gap-2 overflow-y-auto flex-1 pb-2">
          {AVAILABLE_ICONS.map(iconName => {
            const isSelected = iconName === selectedIcon;
            return (
              <button
                key={iconName}
                onClick={() => {
                  onSelect(iconName);
                  onClose();
                }}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                  isSelected
                    ? 'bg-calm-blue text-white shadow-md'
                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <CategoryIcon icon={iconName} size={22} />
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 border border-neutral-200 rounded-xl text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
};
