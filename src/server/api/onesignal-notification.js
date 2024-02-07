const axios = require('axios');
const sendNotificationViaTemplate = async (req, res) => {
  const data = { ...req.body, app_id: process.env.ONESIGNAL_APP_ID };
  console.log('data of onesignal ', JSON.stringify(data));
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    Authorization: `Basic ${process.env.ONESIGNAL_AUTH_TOKEN}`,
  };
  try {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', data, {
      headers,
    });
    console.log('RESPONSE of onesignal ', response?.data);
    return res
      .status(200)
      .send({})
      .end();
  } catch (error) {
    console.log('error', error);
    return res
      .status(400)
      .send(error)
      .end();
  }
};
module.exports = { sendNotificationViaTemplate };