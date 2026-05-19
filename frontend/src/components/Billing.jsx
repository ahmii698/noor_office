// src/components/Billing.jsx
import React, { useState } from 'react';
import CustomerForm from './billing/CustomerForm';
import BillingInvoice from './billing/BillingInvoice';

const Billing = ({ services, invoices, setInvoices, cart, setCart, products, setProducts, darkMode }) => {
  const [step, setStep] = useState(1);
  const [customerDetails, setCustomerDetails] = useState(null);

  const handleCustomerSubmit = (details) => {
    setCustomerDetails(details);
    setStep(2);
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
        />
      )}
    </div>
  );
};

export default Billing;