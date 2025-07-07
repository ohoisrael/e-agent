const axios = require('axios');

const paystack = {
  initializeTransaction: async ({ email, amount, propertyId }) => {
    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: amount * 100, // Convert to kobo
          metadata: { propertyId },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Paystack initialize response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Paystack initialize error - Status:', error.response?.status, 'Data:', error.response?.data, 'Message:', error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize transaction');
    }
  },
  verifyTransaction: async (reference) => {
    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Paystack verify response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Paystack verify error - Status:', error.response?.status, 'Data:', error.response?.data, 'Message:', error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify transaction');
    }
  },
};

module.exports = paystack;