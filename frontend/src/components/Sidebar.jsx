// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiChevronDown, FiChevronUp, FiList, FiPieChart, 
  FiTrendingUp, FiHome, FiBell, FiUser, FiUsers, 
  FiLogOut, FiCreditCard, FiClock, FiFile,
  FiArchive, FiTruck, FiBookOpen, FiClipboard, FiBriefcase
} from 'react-icons/fi';
import { FaCar } from 'react-icons/fa';
import { HiMenu, HiX } from 'react-icons/hi';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

// ✅ Module-level cache: Sidebar dobara mount ho to data dobara fetch na ho
let cachedUser = null;
let cachedCounts = { reminder: 0, discarded: 0 };
let cachedCountsAt = 0;
const COUNTS_TTL = 20000; // 20 seconds

// ✅ localStorage se user padho (flicker / loading se bachne ke liye)
const getStoredUser = () => {
  if (cachedUser) return cachedUser;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const checkIsAdmin = (u) => !!u && (u.is_admin === true || u.is_admin === 1 || u.role === 'admin');

const Sidebar = ({ activeMenu, setActiveMenu, isOpen, setIsOpen, darkMode }) => {
  const initialUser = getStoredUser();

  const [logoExists, setLogoExists] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCarOpen, setIsCarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [reminderCount, setReminderCount] = useState(cachedCounts.reminder);
  const [discardedCount, setDiscardedCount] = useState(cachedCounts.discarded);
  const [estimateCount, setEstimateCount] = useState(0);
  const [user, setUser] = useState(initialUser);
  const [isAdmin, setIsAdmin] = useState(checkIsAdmin(initialUser));

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 401 par soft redirect (full page reload nahi)
  const clearSessionAndGoToLogin = () => {
    cachedUser = null;
    cachedCounts = { reminder: 0, discarded: 0 };
    cachedCountsAt = 0;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    navigate('/', { replace: true });
  };

  // ✅ Same page par dobara click ho to navigate na karo
  const goTo = (path) => {
    if (path && location.pathname !== path) {
      navigate(path);
    }
  };

  // ✅ Inventory Submenu - click par hi dikhega (Finance ki tarah)
  // Admin: Overview + Battery Record/Sale + Product/Sale Record + Inventory History
  // Employee: Overview + Battery Record/Sale
  const inventorySubmenu = isAdmin
    ? [
        { id: 'inventory', label: 'Overview', icon: FiList, path: '/inventory' },
        { id: 'old-batteries', label: 'Battery Record/Sale', icon: FiArchive, path: '/old-batteries' },
        { id: 'product-record', label: 'Product/Sale Record', icon: FiClipboard, path: '/product-record' },
        { id: 'inventory-history', label: 'Inventory History', icon: FiClock, path: '/inventory-history' }, // ✅ NEW
      ]
    : [
        { id: 'inventory', label: 'Overview', icon: FiList, path: '/inventory' },
        { id: 'old-batteries', label: 'Battery Record/Sale', icon: FiArchive, path: '/old-batteries' },
      ];

  // ✅ Car Submenu - Admin sees all, Employee sees only Car Info & Car Sell
  const carSubmenu = isAdmin
    ? [
        { id: 'car-purchase', label: 'Car Info', icon: FiTruck, path: '/car-purchase' },
        { id: 'car-sell', label: 'Car Sell', icon: FiTruck, path: '/car-sell' },
        { id: 'car-records', label: 'Car Records', icon: FiBookOpen, path: '/car-records' },
      ]
    : [
        { id: 'car-purchase', label: 'Car Info', icon: FiTruck, path: '/car-purchase' },
        { id: 'car-sell', label: 'Car Sell', icon: FiTruck, path: '/car-sell' },
      ];

  // ✅ Finance Submenu - Admin only
  const financeSubmenu = [
    { id: 'finance-overview', label: 'Overview', icon: FiTrendingUp, path: '/finance' },
    { id: 'finance-expenses', label: 'Expenses', icon: FiList, path: '/finance-expenses' },
    { id: 'finance-charts', label: 'Charts', icon: FiPieChart, path: '/finance-charts' },
    { id: 'finance-credit', label: 'Credit', icon: FiCreditCard, path: '/finance-credit' },
  ];

  // ✅ Admin menu items (full access)
  const adminMenuItems = [
    { id: 'all-data', label: 'Dashboard', icon: FiHome, path: '/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: FiPackage, hasSubmenu: true }, // 👈 submenu: Overview, Battery Record/Sale, Product/Sale Record, Inventory History
    { id: 'cash-in-hand', label: 'Cash in Hand', icon: FiBriefcase, path: '/cash-in-hand' }, // ✅ Inventory se bahar, alag item
    { id: 'finance', label: 'Finance', icon: FiDollarSign, hasSubmenu: true },
    { id: 'billing', label: 'Billing', icon: FiFileText, path: '/billing' },
    { id: 'car', label: 'Car', icon: FaCar, hasSubmenu: true },
    { id: 'estimate', label: 'Estimate', icon: FiFile, path: '/estimate', badge: estimateCount },
    { id: 'estimate-records', label: 'Estimate Records', icon: FiArchive, path: '/estimate-records' },
    { id: 'reminders', label: 'Reminders', icon: FiBell, path: '/reminders', badge: reminderCount },
    { id: 'discarded', label: 'Draft', icon: FiClock, path: '/discarded', badge: discardedCount },
    { id: 'record', label: 'Records', icon: FiBarChart2, path: '/records' },
    { id: 'users', label: 'Users', icon: FiUsers, path: '/users' },
  ];

  // ✅ Employee menu items — Product Record & Estimate Records removed
  const employeeMenuItems = [
    { id: 'inventory', label: 'Inventory', icon: FiPackage, hasSubmenu: true }, // 👈 submenu: Overview, Battery Record/Sale (baqi sirf admin)
    { id: 'billing', label: 'Billing', icon: FiFileText, path: '/billing' },
    { id: 'car', label: 'Car', icon: FaCar, hasSubmenu: true },
    { id: 'estimate', label: 'Estimate', icon: FiFile, path: '/estimate', badge: estimateCount },
    // ❌ estimate-records removed for employees
    { id: 'reminders', label: 'Reminders', icon: FiBell, path: '/reminders', badge: reminderCount },
    { id: 'discarded', label: 'Discarded', icon: FiClock, path: '/discarded', badge: discardedCount },
  ];

  const isFinanceActive = () => {
    return financeSubmenu.some(item => item.id === activeMenu);
  };

  const isInventoryActive = () => {
    return inventorySubmenu.some(item => item.id === activeMenu);
  };

  const isCarActive = () => {
    return carSubmenu.some(item => item.id === activeMenu);
  };

  // ✅ activeMenu (URL se sync hota hai) badle to related submenu khul jaye
  useEffect(() => {
    if (isFinanceActive()) setIsFinanceOpen(true);
    if (isInventoryActive()) setIsInventoryOpen(true);
    if (isCarActive()) setIsCarOpen(true);
  }, [activeMenu]);

  // ✅ Fetch user — cache ho to dobara API call nahi
  const fetchUserData = async () => {
    if (cachedUser) {
      setUser(cachedUser);
      setIsAdmin(checkIsAdmin(cachedUser));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/me');
      if (response.data?.user) {
        cachedUser = response.data.user;
        setUser(cachedUser);
        setIsAdmin(checkIsAdmin(cachedUser));
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error.response?.status === 401) {
        clearSessionAndGoToLogin();
      }
    }
  };

  // ✅ Reminder count
  const fetchReminderCount = async () => {
    try {
      const birthdayRes = await api.get('/birthday-reminders/today');
      const birthdayCount = birthdayRes.data.birthday_customers?.length || 0;

      const serviceRes = await api.get('/service-reminders/all');
      const tuningCount = serviceRes.data.tuning?.length || 0;
      const oilChangeCount = serviceRes.data.oil_change?.length || 0;

      const total = birthdayCount + tuningCount + oilChangeCount;
      cachedCounts.reminder = total;
      setReminderCount(total);
    } catch (error) {
      console.error('Error fetching reminder count:', error);
    }
  };

  // ✅ Discarded count
  const fetchDiscardedCount = async () => {
    try {
      const response = await api.get('/saved-carts/count');
      if (response.data?.success) {
        const count = response.data.count || 0;
        cachedCounts.discarded = count;
        setDiscardedCount(count);
      }
    } catch (error) {
      console.error('Error fetching discarded count:', error);
    }
  };

  const fetchEstimateCount = async () => {
    setEstimateCount(0);
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    clearSessionAndGoToLogin();
  };

  // ✅ Resize handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024 && isOpen) setIsOpen(false);
      if (window.innerWidth >= 1024 && !isOpen) setIsOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, setIsOpen]);

  // ✅ Logo check — sirf ek baar
  useEffect(() => {
    const img = new Image();
    img.src = '/logo.jpg';
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
  }, []);

  // ✅ MAIN useEffect — cache ke saath, intervals hamesha sahi se chalte hain
  useEffect(() => {
    fetchUserData();
    fetchEstimateCount();

    // Sirf tab fetch karo jab cache purana ho (page badalne par dobara API calls nahi)
    if (Date.now() - cachedCountsAt > COUNTS_TTL) {
      cachedCountsAt = Date.now();
      fetchReminderCount();
      fetchDiscardedCount();
    }

    const reminderInterval = setInterval(fetchReminderCount, 60000);
    const discardedInterval = setInterval(fetchDiscardedCount, 30000);

    const handleReminderUpdate = () => fetchReminderCount();
    window.addEventListener('reminder-update', handleReminderUpdate);

    const handleDiscardedUpdate = () => fetchDiscardedCount();
    window.addEventListener('discarded-update', handleDiscardedUpdate);

    return () => {
      clearInterval(reminderInterval);
      clearInterval(discardedInterval);
      window.removeEventListener('reminder-update', handleReminderUpdate);
      window.removeEventListener('discarded-update', handleDiscardedUpdate);
    };
  }, []);

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      if (item.id === 'car') {
        setIsCarOpen(!isCarOpen);
        setActiveMenu('car-purchase');
        goTo('/car-purchase');
        if (isMobile) setIsOpen(false);
      } else if (item.id === 'inventory') {
        setIsInventoryOpen(!isInventoryOpen);
        if (!isInventoryOpen && !isInventoryActive()) {
          setActiveMenu('inventory');
          goTo('/inventory');
        }
      } else if (item.id === 'finance') {
        setIsFinanceOpen(!isFinanceOpen);
        if (!isFinanceOpen && !isFinanceActive()) {
          setActiveMenu('finance-overview');
          goTo('/finance'); // ✅ URL bhi badlo, warna URL aur menu sync se bahar ho jate hain
        }
      }
    } else {
      setActiveMenu(item.id);
      goTo(item.path);
      if (isMobile) setIsOpen(false);
    }
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const allMenuItems = isAdmin ? adminMenuItems : employeeMenuItems;

  return (
    <>
      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-40 bg-black shadow-2xl transition-all duration-300 h-full flex flex-col
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

        {/* Menu Section - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {allMenuItems.map((item) => {
            const Icon = item.icon;
            const isFinanceMenuItem = item.id === 'finance';
            const isInventoryMenuItem = item.id === 'inventory';
            const isCarMenuItem = item.id === 'car';
            const isActive = activeMenu === item.id || 
                           (isFinanceMenuItem && isFinanceActive()) ||
                           (isInventoryMenuItem && isInventoryActive()) ||
                           (isCarMenuItem && isCarActive());
            const showBadge = item.badge > 0;

            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
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
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${
                          item.id === 'discarded' 
                            ? 'bg-yellow-500 text-white' 
                            : item.id === 'estimate'
                              ? 'bg-blue-500 text-white'
                              : 'bg-red-500 text-white'
                        } animate-pulse`}>
                          {item.badge}
                        </span>
                      )}
                      {item.hasSubmenu && (
                        <span>
                          {item.id === 'inventory' && (isInventoryOpen ? <FiChevronUp className="text-sm" /> : <FiChevronDown className="text-sm" />)}
                          {item.id === 'finance' && (isFinanceOpen ? <FiChevronUp className="text-sm" /> : <FiChevronDown className="text-sm" />)}
                          {item.id === 'car' && (isCarOpen ? <FiChevronUp className="text-sm" /> : <FiChevronDown className="text-sm" />)}
                        </span>
                      )}
                    </div>
                  )}
                  {!isOpen && showBadge && (
                    <span className={`absolute -right-1 -top-1 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                      item.id === 'discarded' ? 'bg-yellow-500' : 
                      item.id === 'estimate' ? 'bg-blue-500' : 'bg-red-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Inventory Submenu - click par khulta hai */}
                {isOpen && item.id === 'inventory' && isInventoryOpen && (
                  <div className="ml-8 mt-1 mb-2 space-y-1">
                    {inventorySubmenu.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          type="button"
                          key={subItem.id}
                          onClick={() => {
                            setActiveMenu(subItem.id);
                            goTo(subItem.path);
                            if (isMobile) setIsOpen(false);
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

                {/* Finance Submenu - Admin only */}
                {isOpen && isAdmin && item.id === 'finance' && isFinanceOpen && (
                  <div className="ml-8 mt-1 mb-2 space-y-1">
                    {financeSubmenu.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          type="button"
                          key={subItem.id}
                          onClick={() => {
                            setActiveMenu(subItem.id);
                            goTo(subItem.path);
                            if (isMobile) setIsOpen(false);
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

                {/* Car Submenu - Filtered for employees */}
                {isOpen && item.id === 'car' && isCarOpen && (
                  <div className="ml-8 mt-1 mb-2 space-y-1">
                    {carSubmenu.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          type="button"
                          key={subItem.id}
                          onClick={() => {
                            setActiveMenu(subItem.id);
                            goTo(subItem.path);
                            if (isMobile) setIsOpen(false);
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

        {/* User Profile Section - Bottom */}
        <div className="border-t border-gray-800">
          {isOpen ? (
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <FiUser className="text-red-500 text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{user?.name || 'User'}</p>
                  <p className="text-xs truncate flex items-center gap-1">
                    {user?.role === 'admin' ? (
                      <span className="text-red-400">👑 Admin</span>
                    ) : (
                      <span className="text-blue-400">👤 Employee</span>
                    )}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                  title="Logout"
                >
                  <FiLogOut className="text-lg" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 flex justify-center">
              <div className="relative group">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <FiUser className="text-red-500 text-xl" />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {user?.name || 'User'} ({user?.role || 'employee'})
                </div>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="absolute inset-0 rounded-full hover:bg-red-500/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <FiLogOut className="text-red-400 text-sm" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Toggle Button */}
      <button 
        type="button"
        onClick={toggleSidebar} 
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-black rounded-xl text-white shadow-lg hover:bg-gray-800 transition-all duration-300"
        style={{ 
          left: isOpen ? '260px' : '16px',
          transition: 'left 0.3s ease'
        }}
      >
        {isOpen ? <HiX className="text-xl" /> : <HiMenu className="text-xl" />}
      </button>

      {/* Overlay for mobile */}
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