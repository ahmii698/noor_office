// src/components/Billing.jsx
import React, { useState } from 'react';
import CustomerForm from './billing/CustomerForm';
import BillingInvoice from './billing/BillingInvoice';
import api from '../services/api';
import toast from 'react-hot-toast';

const Billing = ({ services, invoices, setInvoices, cart, setCart, products, setProducts, darkMode }) => {
  const [step, setStep] = useState(1);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // ✅ Handle customer submit - Ensure birthday is passed
  const handleCustomerSubmit = async (details) => {
    console.log('📝 Customer details received in Billing:', details); // Debug
    
    // ✅ Ensure all fields are set, especially birthday
    const customerData = {
      name: details.name || '',
      phone: details.phone || '',
      email: details.email || '',
      carNumber: details.carNumber || '',
      carModel: details.carModel || '',
      birthday: details.birthday || '', // ✅ Birthday properly passed
      date: details.date || new Date().toISOString().split('T')[0]
    };
    
    console.log('✅ Setting customer details with birthday:', customerData); // Debug
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
        customer_birthday: customerDetails?.birthday || null, // ✅ Send birthday
        total_amount: invoiceData.total_amount,
        paid_amount: invoiceData.paid_amount,
        remaining_amount: invoiceData.remaining_amount,
        payment_method: invoiceData.payment_method,
        status: invoiceData.status,
        items: serviceItems,
        invoice_date: new Date().toISOString()
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
          loading={loading}
        />
      )}
    </div>
  );
};

export default Billing;