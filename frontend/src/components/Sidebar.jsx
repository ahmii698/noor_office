// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { FiPackage, FiDollarSign, FiFileText, FiBarChart2, FiChevronDown, FiChevronUp, FiList, FiPieChart, FiTrendingUp, FiHome, FiBell } from 'react-icons/fi';
import { HiMenu, HiX } from 'react-icons/hi';
import api from '../services/api';

const Sidebar = ({ activeMenu, setActiveMenu, isOpen, setIsOpen, darkMode }) => {
  const [logoExists, setLogoExists] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [reminderCount, setReminderCount] = useState(0);

  const menuItems = [
    { id: 'all-data', label: 'Dashboard', icon: FiHome, path: '/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: FiPackage, path: '/inventory' },
    { id: 'finance', label: 'Finance', icon: FiDollarSign, hasSubmenu: true },
    { id: 'billing', label: 'Billing', icon: FiFileText, path: '/billing' },
    { id: 'record', label: 'Records', icon: FiBarChart2, path: '/records' },
    { id: 'reminders', label: 'Reminders', icon: FiBell, path: '/reminders', badge: reminderCount },
  ];

  // Finance Submenu
  const financeSubmenu = [
    { id: 'finance-overview', label: 'Overview', icon: FiTrendingUp, path: '/finance' },
    { id: 'finance-expenses', label: 'Expenses', icon: FiList, path: '/finance-expenses' },
    { id: 'finance-charts', label: 'Charts', icon: FiPieChart, path: '/finance-charts' },
  ];

  // ✅ Fetch reminder count
  const fetchReminderCount = async () => {
    try {
      // Fetch birthday count from customers table
      const birthdayRes = await api.get('/birthday-reminders/today');
      const birthdayCount = birthdayRes.data.birthday_customers?.length || 0;
      
      // Fetch service reminders count (tuning + oil change)
      const serviceRes = await api.get('/service-reminders/all');
      const tuningCount = serviceRes.data.tuning?.length || 0;
      const oilChangeCount = serviceRes.data.oil_change?.length || 0;
      
      const total = birthdayCount + tuningCount + oilChangeCount;
      setReminderCount(total);
    } catch (error) {
      // Silent fail - don't show error to user
      console.error('Error fetching reminder count:', error);
    }
  };

  // Check window size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024 && isOpen) {
        setIsOpen(false);
      }
      if (window.innerWidth >= 1024 && !isOpen) {
        setIsOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    const img = new Image();
    img.src = '/logo.jpg';
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
  }, []);

  // ✅ Fetch reminder count on mount and every 60 seconds
  useEffect(() => {
    fetchReminderCount();
    const interval = setInterval(fetchReminderCount, 60000);
    
    // ✅ Event listener for manual update from Reminders page
    const handleReminderUpdate = () => {
      fetchReminderCount();
    };
    window.addEventListener('reminder-update', handleReminderUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('reminder-update', handleReminderUpdate);
    };
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
      if (isMobile) {
        setIsOpen(false);
      }
    }
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-40 bg-black shadow-2xl transition-all duration-300 h-full
        ${isOpen ? 'w-72' : 'w-20'}
        ${isMobile && isOpen ? 'left-0' : isMobile && !isOpen ? '-left-72' : ''}
      `}>
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
            const showBadge = item.badge > 0;
            
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
                  {isOpen && (
                    <div className="flex items-center gap-2">
                      {showBadge && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                          {item.badge}
                        </span>
                      )}
                      {item.hasSubmenu && (
                        <span>{isFinanceOpen ? <FiChevronUp className="text-sm" /> : <FiChevronDown className="text-sm" />}</span>
                      )}
                    </div>
                  )}
                  {/* Badge show when sidebar is closed */}
                  {!isOpen && showBadge && (
                    <span className="absolute right-0 top-0 -mr-1 -mt-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
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
                            if (isMobile) {
                              setIsOpen(false);
                            }
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

      {/* Mobile Menu Toggle Button - Always visible on mobile */}
      <button 
        onClick={toggleSidebar} 
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-black rounded-xl text-white shadow-lg hover:bg-gray-800 transition-all duration-300"
        style={{ 
          left: isOpen ? '260px' : '16px',
          transition: 'left 0.3s ease'
        }}
      >
        {isOpen ? <HiX className="text-xl" /> : <HiMenu className="text-xl" />}
      </button>

      {/* Overlay for mobile - closes sidebar when clicking outside */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;