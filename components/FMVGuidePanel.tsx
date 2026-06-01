'use client';
import { useEffect, useRef } from 'react';

const GUIDE_SECTIONS = [
  {
    category: 'Bedding & Linens',
    items: [
      { name: 'Sheets', range: '$10–$25' },
      { name: 'Blankets', range: '$10–$30' },
      { name: 'Pillows', range: '$5–$15' },
      { name: 'Towels', range: '$5–$15' },
    ],
  },
  {
    category: 'Kitchen & Dining',
    items: [
      { name: 'Small appliances', range: '$10–$50' },
      { name: 'Dishware / utensils', range: '$15–$50' },
      { name: 'Full kitchen set', range: '$50–$150' },
    ],
  },
  {
    category: 'Furniture',
    items: [
      { name: 'Chairs', range: '$10–$40 each' },
      { name: 'Bookshelves / dressers', range: '$25–$100' },
      { name: 'Sofas / chairs', range: '$75–$300' },
      { name: 'Living room set', range: '$150–$400' },
      { name: 'Twin bed frame', range: '$75–$200' },
      { name: 'Full / Queen bed frame', range: '$100–$300' },
      { name: 'Twin mattress', range: '$50–$75' },
      { name: 'Full / Queen mattress', range: '$50–$150' },
    ],
  },
  {
    category: 'Electronics & Lighting',
    items: [
      { name: 'Refrigerator', range: '$150–$400' },
      { name: 'Freezer', range: '$100–$300' },
      { name: 'Small electronics', range: '$10–$50' },
    ],
  },
  {
    category: 'Baby & Children',
    items: [
      { name: 'Toys / books', range: '$10–$40' },
      { name: 'Games', range: '$10–$30' },
      { name: 'School / art supplies', range: '$10–$30' },
    ],
  },
  {
    category: 'Hygiene & Personal Care',
    items: [
      { name: 'Individual hygiene items', range: '$5–$15' },
      { name: 'Hygiene bundle', range: '$20–$50' },
    ],
  },
  {
    category: 'Cleaning Supplies',
    items: [
      { name: 'Individual cleaning items', range: '$5–$15' },
      { name: 'Cleaning bundle', range: '$20–$50' },
    ],
  },
  {
    category: 'Pantry & Food',
    items: [
      { name: 'Canned / dry goods (per item)', range: '$1–$5' },
      { name: 'Pantry bundle', range: '$10–$40' },
    ],
  },
  {
    category: 'Clothing & Shoes',
    items: [
      { name: 'Adult clothing (per item)', range: '$5–$20' },
      { name: "Children's clothing (per item)", range: '$3–$10' },
      { name: 'Shoes (per pair)', range: '$5–$20' },
    ],
  },
  {
    category: 'Office & School Supplies',
    items: [
      { name: 'School supplies bundle', range: '$10–$30' },
      { name: 'Office supplies bundle', range: '$10–$30' },
    ],
  },
  {
    category: 'Miscellaneous',
    items: [
      { name: 'Household starter set', range: '$50–$150' },
      { name: 'Bedroom setup bundle', range: '$100–$300' },
      { name: 'Living room setup bundle', range: '$150–$400' },
    ],
  },
];

// Maps app category names to guide section names
const CATEGORY_MAP: Record<string, string> = {
  'Furniture': 'Furniture',
  'Bedding & Linens': 'Bedding & Linens',
  'Kitchen & Dining': 'Kitchen & Dining',
  'Pantry & Food': 'Pantry & Food',
  'Hygiene & Personal Care': 'Hygiene & Personal Care',
  'Cleaning Supplies': 'Cleaning Supplies',
  'Baby & Children': 'Baby & Children',
  'Clothing & Shoes': 'Clothing & Shoes',
  'Electronics & Lighting': 'Electronics & Lighting',
  'Office & School Supplies': 'Office & School Supplies',
  'Miscellaneous': 'Miscellaneous',
};

type Props = {
  open: boolean;
  onClose: () => void;
  activeCategory?: string;
};

export default function FMVGuidePanel({ open, onClose, activeCategory }: Props) {
  const activeSectionRef = useRef<HTMLDivElement>(null);

  // Scroll to the active category when the panel opens
  useEffect(() => {
    if (open && activeSectionRef.current) {
      setTimeout(() => {
        activeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [open, activeCategory]);

  const matchedCategory = activeCategory ? CATEGORY_MAP[activeCategory] : undefined;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-up panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-96 md:rounded-2xl">
        {/* Handle / header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 md:hidden" />
            <h2 className="font-semibold text-gray-900 text-base">FMV Reference Guide</h2>
            <p className="text-xs text-gray-400 mt-0.5">Used items in good condition</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Core rules banner */}
        <div className="mx-4 mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shrink-0">
          <p className="text-xs font-semibold text-amber-800 mb-1">Core Rules</p>
          <ul className="text-xs text-amber-700 space-y-0.5">
            <li>• FMV = thrift/resale value, NOT retail</li>
            <li>• Use midpoint of range unless condition varies</li>
            <li>• When unsure, choose the conservative estimate</li>
            <li>• Do NOT value broken or unsafe items</li>
          </ul>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-6 pt-2">
          {GUIDE_SECTIONS.map(section => {
            const isActive = section.category === matchedCategory;
            return (
              <div
                key={section.category}
                ref={isActive ? activeSectionRef : undefined}
                className={`mb-3 rounded-xl border transition-colors ${
                  isActive
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`px-4 py-2.5 flex items-center justify-between rounded-t-xl ${
                  isActive ? 'bg-green-100' : 'bg-gray-50'
                }`}>
                  <span className={`text-sm font-semibold ${isActive ? 'text-green-800' : 'text-gray-700'}`}>
                    {section.category}
                  </span>
                  {isActive && (
                    <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                      Selected
                    </span>
                  )}
                </div>
                <div className="px-4 py-2 divide-y divide-gray-100">
                  {section.items.map(item => (
                    <div key={item.name} className="flex justify-between items-center py-1.5 text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className={`font-medium tabular-nums ${isActive ? 'text-green-700' : 'text-gray-800'}`}>
                        {item.range}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Footer note */}
          <p className="text-xs text-gray-400 mt-2 italic px-1">
            "Values are estimated based on fair market value for used items in good condition.
            Final determination of value is the responsibility of the donor."
          </p>
        </div>
      </div>
    </>
  );
}
