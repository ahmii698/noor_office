// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { FiPackage, FiDollarSign, FiFileText, FiBarChart2, FiChevronDown, FiChevronUp, FiList, FiPieChart, FiTrendingUp, FiHome } from 'react-icons/fi';
import { HiMenu, HiX } from 'react-icons/hi';

const Sidebar = ({ activeMenu, setActiveMenu, isOpen, setIsOpen, darkMode }) => {
  const [logoExists, setLogoExists] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  
  const menuItems = [
    { id: 'all-data', label: 'All Data', icon: FiHome, path: '/all-data' },
    { id: 'inventory', label: 'Inventory', icon: FiPackage, path: '/inventory' },
    { id: 'finance', label: 'Finance', icon: FiDollarSign, hasSubmenu: true },
    { id: 'billing', label: 'Billing', icon: FiFileText, path: '/billing' },
    { id: 'record', label: 'Records', icon: FiBarChart2, path: '/records' },
  ];

  const financeSubmenu = [
    { id: 'finance-overview', label: 'Overview', icon: FiTrendingUp, path: '/finance' },
    { id: 'finance-expenses', label: 'Expenses', icon: FiList, path: '/finance-expenses' },
    { id: 'finance-charts', label: 'Charts', icon: FiPieChart, path: '/finance-charts' },
    { id: 'finance-reports', label: 'Reports', icon: FiBarChart2, path: '/finance-reports' },
  ];

  useEffect(() => {
    const img = new Image();
    img.src = '/logo.jpg';
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
  }, []);

  const isFinanceActive = () => {
    return financeSubmenu.some(item => item.id === activeMenu);
  };

  useEffect(() => {
    if (isFinanceActive()) {
      setIsFinanceOpen(true);
    }
  }, [activeMenu]);

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      setIsFinanceOpen(!isFinanceOpen);
      if (!isFinanceOpen && !isFinanceActive()) {
        setActiveMenu('finance-overview');
      }
    } else {
      setActiveMenu(item.id);
      if (window.innerWidth < 1024) setIsOpen(false);
    }
  };

  return (
    <>
      <div className={`fixed lg:relative z-40 bg-black shadow-2xl transition-all duration-300 h-full ${isOpen ? 'w-72' : 'w-20'}`}>
        {/* Logo Section */}
        <div className={`pt-6 pb-4 px-6 border-b border-gray-800 flex justify-center ${!isOpen ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center justify-center overflow-hidden transition-all duration-300 ${isOpen ? 'w-56 h-32 rounded-xl' : 'w-12 h-12 rounded-full'}`}>
            {logoExists ? (
              <img src="/logo.jpg" alt="Noorani Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-4xl">❄️</span>
            )}
          </div>
        </div>

        {/* Menu Section */}
        <div className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isFinanceMenuItem = item.id === 'finance';
            const isActive = activeMenu === item.id || (isFinanceMenuItem && isFinanceActive());
            
            return (
              <div key={item.id}>
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl mb-1 transition-all duration-300 ${
                    isActive
                      ? 'bg-red-500/20 text-red-500'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  } ${!isOpen ? 'justify-center' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <Icon className="text-2xl shrink-0" />
                    {isOpen && <span className="font-medium">{item.label}</span>}
                  </div>
                  {isOpen && item.hasSubmenu && (
                    <span>{isFinanceOpen ? <FiChevronUp className="text-sm" /> : <FiChevronDown className="text-sm" />}</span>
                  )}
                </button>
                
                {/* Finance Submenu */}
                {isOpen && item.hasSubmenu && isFinanceOpen && (
                  <div className="ml-8 mt-1 mb-2 space-y-1">
                    {financeSubmenu.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => {
                            setActiveMenu(subItem.id);
                            if (window.innerWidth < 1024) setIsOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                            activeMenu === subItem.id
                              ? 'bg-red-500/20 text-red-500'
                              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                          }`}
                        >
                          <SubIcon className="text-base" />
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu Toggle Button */}
      <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-black rounded-lg text-white">
        {isOpen ? <HiX className="text-2xl" /> : <HiMenu className="text-2xl" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-30 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default Sidebar;