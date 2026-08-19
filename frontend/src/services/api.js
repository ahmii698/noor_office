// src/services/api.js
import axios from 'axios';
import { API_URL } from '../../config';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 30000,
    withCredentials: false
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
    (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// ✅ FIXED Response interceptor - Clean // from response
api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
        
        if (typeof response.data === 'string') {
            try {
                let cleanData = response.data.trim();
                if (cleanData.startsWith('//')) {
                    cleanData = cleanData.substring(2);
                }
                response.data = JSON.parse(cleanData);
                console.log('✅ Cleaned response:', response.data);
            } catch (e) {
                console.error('Error parsing response:', e);
            }
        }
        
        return response;
    },
    (error) => {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            console.error('[API Error]', {
                status: status,
                url: error.config?.url,
                message: data?.message,
                data: data
            });
            
            if (status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                
                if (!error.config?.url?.includes('/login')) {
                    window.location.href = '/';
                }
            }
            
            if (status === 500) {
                console.error('[Server Error]', data?.message || 'Internal server error');
            }
            
            if (status === 422) {
                console.error('[Validation Error]', data?.errors);
            }
        } else if (error.request) {
            console.error('[Network Error] No response from server. Make sure backend is running on port 8000');
        } else {
            console.error('[Error]', error.message);
        }
        
        return Promise.reject(error);
    }
);

// Helper function to handle errors with user-friendly messages
export const getErrorMessage = (error) => {
    if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        switch (status) {
            case 401:
                return message || 'Unauthorized. Please login again.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'Resource not found.';
            case 422:
                return message || 'Validation failed. Please check your input.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return message || `Error ${status}: Something went wrong.`;
        }
    } else if (error.request) {
        return 'Cannot connect to server. Please check your internet connection or make sure the backend is running.';
    } else {
        return error.message || 'An unexpected error occurred.';
    }
};

// ==================== SAVED CARTS / DISCARDED BILLS ====================
export const saveCart = async (cartData) => {
    const response = await api.post('/saved-carts', cartData);
    return response.data;
};

export const getDiscardedCarts = async () => {
    const response = await api.get('/saved-carts');
    return response.data;
};

export const getDiscardedCount = async () => {
    const response = await api.get('/saved-carts/count');
    return response.data;
};

export const restoreCart = async (cartId) => {
    const response = await api.post(`/saved-carts/${cartId}/restore`);
    return response.data;
};

export const deleteDiscardedCart = async (cartId) => {
    const response = await api.delete(`/saved-carts/${cartId}`);
    return response.data;
};

export const clearAllDiscarded = async () => {
    const response = await api.delete('/saved-carts/clear-all');
    return response.data;
};

// ==================== ESTIMATES / QUOTATIONS ====================
export const saveEstimate = async (estimateData) => {
    const response = await api.post('/estimates', estimateData);
    return response.data;
};

export const getEstimates = async () => {
    const response = await api.get('/estimates');
    return response.data;
};

export const getEstimate = async (id) => {
    const response = await api.get(`/estimates/${id}`);
    return response.data;
};

export const updateEstimate = async (id, data) => {
    const response = await api.put(`/estimates/${id}`, data);
    return response.data;
};

export const deleteEstimate = async (id) => {
    const response = await api.delete(`/estimates/${id}`);
    return response.data;
};

export const getEstimateCount = async () => {
    const response = await api.get('/estimates/count');
    return response.data;
};

export const convertEstimateToInvoice = async (estimateId) => {
    const response = await api.post(`/estimates/${estimateId}/convert`);
    return response.data;
};

// ==================== BATTERY ENDPOINTS ====================
// ✅ NEW: Battery endpoints - reusing existing product endpoints
// Batteries are products with category 'Battery'
// All product endpoints already work for batteries

// Helper to get only battery products
export const getBatteries = async () => {
    const response = await api.get('/products');
    let products = [];
    if (response.data?.data) {
        products = response.data.data;
    } else if (Array.isArray(response.data)) {
        products = response.data;
    }
    // Filter only battery products
    const batteries = products.filter(p => 
        p.name?.toLowerCase().includes('battery') ||
        p.category?.toLowerCase().includes('battery')
    );
    return { ...response, data: batteries };
};

// Add battery product
export const addBattery = async (data) => {
    const payload = {
        name: data.name,
        purchase_price: data.purchase_price || data.price || 0,
        selling_price: data.selling_price || data.price || 0,
        quantity: data.quantity || 0,
        category: 'Battery',
        is_hidden: 0
    };
    const response = await api.post('/products', payload);
    return response.data;
};

// Update battery
export const updateBattery = async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
};

// Delete battery
export const deleteBattery = async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
};

// ==================== BATTERY SALE ====================
// ✅ NEW: Battery sale endpoint - uses existing invoice system
export const sellBattery = async (saleData) => {
    const payload = {
        invoice_no: saleData.invoice_no || `INV-${Date.now()}`,
        customer_name: saleData.customer_name || 'Guest',
        customer_phone: saleData.customer_phone || 'N/A',
        customer_email: saleData.customer_email || null,
        customer_car_number: saleData.customer_car_number || null,
        customer_car_model: saleData.customer_car_model || null,
        subtotal: saleData.subtotal || saleData.battery_price || 0,
        discount: saleData.discount || saleData.trade_in || 0,
        discount_note: saleData.discount_note || (saleData.trade_in ? 'Battery Trade-in' : null),
        total_amount: saleData.total_amount || (saleData.battery_price - (saleData.trade_in || 0)),
        paid_amount: saleData.paid_amount || 0,
        remaining_amount: saleData.remaining_amount || (saleData.total_amount || (saleData.battery_price - (saleData.trade_in || 0))),
        payment_method: saleData.payment_method || 'Cash',
        status: saleData.status || 'Pending',
        invoice_date: saleData.invoice_date || new Date().toISOString(),
        items: [{
            service_name: saleData.battery_name,
            service_category: 'Battery',
            price: saleData.battery_price,
            quantity: 1,
            mileage: null
        }]
    };
    const response = await api.post('/invoices', payload);
    return response.data;
};

// ==================== BATTERY STATS ====================
// ✅ Get battery sales stats
export const getBatteryStats = async () => {
    const response = await api.get('/invoices');
    let invoices = [];
    if (response.data?.data) {
        invoices = response.data.data;
    } else if (Array.isArray(response.data)) {
        invoices = response.data;
    }
    // Filter battery sales
    const batterySales = invoices.filter(inv => 
        inv.items?.some(item => 
            item.service_category?.toLowerCase().includes('battery') ||
            item.service_name?.toLowerCase().includes('battery')
        )
    );
    return { ...response, data: batterySales };
};

// API methods for common operations
export const apiService = {
    // Auth
    login: (credentials) => api.post('/login', credentials),
    logout: () => api.post('/logout'),
    forgotPassword: (email) => api.post('/forgot-password', { email }),
    verifyOtp: (data) => api.post('/verify-otp', data),
    resetPassword: (data) => api.post('/reset-password', data),
    getMe: () => api.get('/me'),
    
    // Products
    getProducts: () => api.get('/products'),
    getProduct: (id) => api.get(`/products/${id}`),
    createProduct: (data) => api.post('/products', data),
    updateProduct: (id, data) => api.put(`/products/${id}`, data),
    deleteProduct: (id) => api.delete(`/products/${id}`),
    
    // ✅ Battery specific
    getBatteries: getBatteries,
    addBattery: addBattery,
    updateBattery: updateBattery,
    deleteBattery: deleteBattery,
    sellBattery: sellBattery,
    getBatteryStats: getBatteryStats,
    
    // Services
    getServices: () => api.get('/services'),
    
    // Invoices
    getInvoices: () => api.get('/invoices'),
    getInvoice: (id) => api.get(`/invoices/${id}`),
    createInvoice: (data) => api.post('/invoices', data),
    updateInvoice: (id, data) => api.put(`/invoices/${id}`, data),
    deleteInvoice: (id) => api.delete(`/invoices/${id}`),
    
    // Expenses
    getExpenses: () => api.get('/expenses'),
    createExpense: (data) => api.post('/expenses', data),
    updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
    deleteExpense: (id) => api.delete(`/expenses/${id}`),
    
    // Reminders
    getReminders: () => api.get('/reminders'),
    createReminder: (data) => api.post('/reminders', data),
    updateReminder: (id, data) => api.put(`/reminders/${id}`, data),
    deleteReminder: (id) => api.delete(`/reminders/${id}`),
    
    // Dashboard
    getDashboardStats: () => api.get('/dashboard/stats'),
    getRecentInvoices: () => api.get('/dashboard/recent-invoices'),
    getLowStockProducts: () => api.get('/dashboard/low-stock'),
    
    // Discarded Bills (Saved Carts)
    getDiscardedCarts: () => api.get('/saved-carts'),
    getDiscardedCount: () => api.get('/saved-carts/count'),
    saveCart: (data) => api.post('/saved-carts', data),
    restoreCart: (id) => api.post(`/saved-carts/${id}/restore`),
    deleteDiscardedCart: (id) => api.delete(`/saved-carts/${id}`),
    clearAllDiscarded: () => api.delete('/saved-carts/clear-all'),
    
    // Estimates
    getEstimates: () => api.get('/estimates'),
    getEstimate: (id) => api.get(`/estimates/${id}`),
    createEstimate: (data) => api.post('/estimates', data),
    updateEstimate: (id, data) => api.put(`/estimates/${id}`, data),
    deleteEstimate: (id) => api.delete(`/estimates/${id}`),
    getEstimateCount: () => api.get('/estimates/count'),
    convertEstimateToInvoice: (id) => api.post(`/estimates/${id}/convert`),
};

export default api;