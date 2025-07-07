const axios = require('axios');
const FormData = require('form-data');

const sms = {
  sendOTP: async (phone, otp) => {
    const formData = new FormData();
    formData.append('to', phone); 
    formData.append('text', `Your OTP is ${otp}. Valid for 15 minutes.`);
    formData.append('sender', 'Latictech');
    formData.append('type', '0');
    formData.append('api', '8b81efecf4477a5e98091b2f93c7d86974edb71260d21b500c423bad7818d63e'); 

    try {
      const response = await axios.post(
        'https://api.smsonlinegh.com/v5/message/sms/send',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Accept': 'application/json',
            'Authorization': `key 8b81efecf4477a5e98091b2f93c7d86974edb71260d21b500c423bad7818d63e`, // API key in Authorization header
            'Host': 'api.smsonlinegh.com',
          },
        }
      );

      if (response.status === 200) {
        const responseData = response.data;
        if (responseData.handshake && responseData.handshake.label === 'HSHK_OK') {
          console.log(`OTP sent successfully to ${phone}`);
          return true;
        } else {
          console.error('SMS delivery failed:', responseData);
          throw new Error(`SMS delivery failed: ${responseData.handshake?.label || 'Unknown error'} (ID: ${responseData.handshake?.id || 'N/A'})`);
        }
      } else {
        console.error('SMS request failed:', response.status, response.data);
        throw new Error(`SMS request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('SMS sending failed:', error.response ? error.response.data : error.message);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  },
};

module.exports = sms;