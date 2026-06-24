// src/services/api.js
import axios from 'axios';
import { API_URL } from '../../config'; // ✅ Import from root config

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

// Response interceptor - Handle responses and errors
api.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
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
    
    // Services
    getServices: () => api.get('/services'),
    
    // Invoices
    getInvoices: () => api.get('/invoices'),
    getInvoice: (id) => api.get(`/invoices/${id}`),
    createInvoice: (data) => api.post('/invoices', data),
    
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
};

export default api;