// src/components/Billing.jsx
import React, { useState, useEffect } from 'react';
import CustomerForm from './billing/CustomerForm';
import BillingInvoice from './billing/BillingInvoice';
import api from '../services/api';
import toast from 'react-hot-toast';

const Billing = ({ services, invoices, setInvoices, cart, setCart, products, setProducts, darkMode }) => {
  const [step, setStep] = useState(1);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoredData, setRestoredData] = useState(null);

  // ✅ Check for restored bill data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('restoredBill');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data && data.cart_items && data.cart_items.length > 0) {
          setRestoredData(data);
          
          // ✅ Get current date/time for restored bill
          const now = new Date();
          const currentDate = now.toISOString();
          
          // Set customer details from restored data
          setCustomerDetails({
            name: data.customer_name || '',
            phone: data.customer_phone || '',
            email: data.customer_email || '',
            carNumber: data.customer_car_number || '',
            carModel: data.customer_car_model || '',
            birthday: data.customer_birthday || '',
            date: currentDate // ✅ Use current date/time for restored bill
          });
          setStep(2);
          toast.success('📦 Restored bill loaded!');
        }
        // Clear localStorage after reading
        localStorage.removeItem('restoredBill');
      } catch (e) {
        console.error('Error parsing restored data:', e);
        localStorage.removeItem('restoredBill');
      }
    }
  }, []);

  // Function to add service reminder for 6 months later
  const addServiceReminder = async (invoiceData, serviceItems) => {
    try {
      const reminderServices = [
        'oil', 'tuning', 'engine', 'performance', 
        'ac service', 'compressor', 'filter', 'gas refill'
      ];
      
      const needsReminder = serviceItems.some(item => 
        reminderServices.some(service => 
          item.service_name?.toLowerCase().includes(service)
        )
      );
      
      if (needsReminder && invoiceData.customer_email) {
        const response = await api.post('/reminders/add', {
          invoice_no: invoiceData.invoice_no,
          customer_name: invoiceData.customer_name,
          customer_phone: invoiceData.customer_phone,
          customer_email: invoiceData.customer_email,
          car_number: invoiceData.customer_car_number,
          service_type: 'service'
        });
        
        if (response.data.success) {
          toast.success('✅ 6-month service reminder scheduled!');
        }
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  // ✅ Handle customer submit - Ensure birthday and date are passed
  const handleCustomerSubmit = async (details) => {
    console.log('📝 Customer details received in Billing:', details);
    
    // ✅ Ensure all fields are set, especially birthday and date
    const customerData = {
      name: details.name || '',
      phone: details.phone || '',
      email: details.email || '',
      carNumber: details.carNumber || '',
      carModel: details.carModel || '',
      birthday: details.birthday || '',
      date: details.date || new Date().toISOString() // ✅ Full datetime with time
    };
    
    console.log('✅ Setting customer details with date:', customerData);
    setCustomerDetails(customerData);
    setStep(2);
  };

  // This function will be called after invoice is successfully created
  const handleInvoiceComplete = async (invoiceData, serviceItems) => {
    setLoading(true);
    try {
      const response = await api.post('/invoices', {
        invoice_no: invoiceData.invoice_no,
        customer_name: invoiceData.customer_name,
        customer_phone: invoiceData.customer_phone,
        customer_email: invoiceData.customer_email,
        customer_car_number: invoiceData.customer_car_number,
        customer_car_model: invoiceData.customer_car_model,
        customer_birthday: customerDetails?.birthday || null,
        total_amount: invoiceData.total_amount,
        paid_amount: invoiceData.paid_amount,
        remaining_amount: invoiceData.remaining_amount,
        payment_method: invoiceData.payment_method,
        status: invoiceData.status,
        items: serviceItems,
        invoice_date: customerDetails?.date || new Date().toISOString() // ✅ Use customer date with time or current datetime
      });
      
      if (response.data) {
        setInvoices(prev => [response.data, ...prev]);
        await addServiceReminder(invoiceData, serviceItems);
        toast.success('Invoice created successfully!');
        return true;
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Called by BillingInvoice after a payment is successfully saved.
  // Resets customer data + sends user back to Step 1 (empty form)
  const handlePaymentSuccess = () => {
    setCustomerDetails(null);
    setRestoredData(null);
    setStep(1);
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <CustomerForm 
          invoices={invoices}
          onCustomerSubmit={handleCustomerSubmit}
          initialData={null}
          darkMode={darkMode}
        />
      )}
      
      {step === 2 && (
        <BillingInvoice 
          services={services}
          products={products}
          setProducts={setProducts}
          invoices={invoices}
          setInvoices={setInvoices}
          customerDetails={customerDetails}
          darkMode={darkMode}
          onInvoiceComplete={handleInvoiceComplete}
          onPaymentSuccess={handlePaymentSuccess}
          loading={loading}
          restoredData={restoredData}
        />
      )}
    </div>
  );
};

export default Billing;