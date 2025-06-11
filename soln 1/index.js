const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 3000;

const windows = {
  p: [],
  f: [],
  e: [],
  r: [],
};

const apiMap = {
  p: 'http://20.244.56.144/evaluation-service/primes',
  f: 'http://20.244.56.144/evaluation-service/fibo',
  e: 'http://20.244.56.144/evaluation-service/even',
  r: 'http://20.244.56.144/evaluation-service/rand',
};

const credentials = {
    "email": "akshayjs23aimldip@rnsit.ac.in",
    "name": "akshay j s",
    "rollNo": "1rn23ai403",
    "accessCode": "pmVsEh",
    "clientID": "32a526ed-80c4-47a5-a84e-87dc95abe29f",
    "clientSecret": "WhjwgKXDtHstvudP"
}


async function getAccessToken() {
  try {
    const response = await axios.post('http://20.244.56.144/evaluation-service/auth', credentials);
    console.log('Token response:', response.data);
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get token:', error.response?.data || error.message);
    throw error;
  }
}

app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;

  if (!apiMap[numberid]) {
    return res.status(400).json({ error: 'Invalid number id' });
  }

  const windowPrevState = [...windows[numberid]];

  try {
    const token = await getAccessToken();

    const response = await axios.get(apiMap[numberid], {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 500,
    });

    const numbers = response.data.numbers || response.data;

    console.log('Received numbers:', numbers);

    if (!Array.isArray(numbers)) {
      return res.status(500).json({ error: 'API did not return an array of numbers', data: numbers });
    }

    numbers.forEach((num) => {
      windows[numberid].push(num);
      if (windows[numberid].length > 10) {
        windows[numberid].shift();
      }
    });

    const windowCurrState = [...windows[numberid]];

    const avg = windows[numberid].reduce((acc, val) => acc + val, 0) / windows[numberid].length;

    res.json({
      windowPrevState,
      windowCurrState,
      numbers,
      avg,
    });
  } catch (error) {
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    } else {
      console.error('Error message:', error.message);
    }
    res.status(500).json({ error: 'Failed to fetch numbers' });
  }
});

app.listen(PORT, () => {
  console.log(`server running on port: ${PORT}`);
});
