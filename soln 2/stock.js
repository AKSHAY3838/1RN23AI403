const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());


class StockDataStore {
  constructor() {
    this.stocks = new Map();
    this.priceHistory = new Map();
    this.initializeData();
  }

  initializeData() {
    
    const sampleStocks = {
      "AMD": "Advanced Micro Devices, Inc.",
      "GOOGL": "Alphabet Inc. Class A",
      "GOOG": "Alphabet Inc. Class C",
      "AMZN": "Amazon.com, Inc.",
      "AMGN": "Amgen Inc.",
      "AAPL": "Apple Inc.",
      "BRKB": "Berkshire Hathaway Inc.",
      "BKNG": "Booking Holdings Inc.",
      "AVGO": "Broadcom Inc.",
      "CSX": "CSX Corporation",
      "LLY": "Eli Lilly and Company",
      "MAR": "Marriott International, Inc.",
      "MRVL": "Marvell Technology, Inc.",
      "META": "Meta Platforms, Inc.",
      "MSFT": "Microsoft Corporation",
      "NVDA": "Nvidia Corporation",
      "PYPL": "PayPal Holdings, Inc.",
      "2330TW": "TSMC",
      "TSLA": "Tesla, Inc.",
      "V": "Visa Inc."
    };

    this.stocks = new Map(Object.entries(sampleStocks));
    
    
    this.initializePriceHistory();
  }

  initializePriceHistory() {
    const now = new Date();
    
    
    const basePrices = {
      "NVDA": 666.66,
      "PYPL": 680.59,
      "AMD": 453.56,
      "GOOGL": 204.00,
      "META": 458.60
    };

    Object.entries(basePrices).forEach(([ticker, basePrice]) => {
      const history = [];
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - (i * 60000));
        const priceVariation = (Math.random() - 0.5) * 20; 
        history.push({
          price: parseFloat((basePrice + priceVariation).toFixed(4)),
          lastUpdatedAt: timestamp.toISOString()
        });
      }
      this.priceHistory.set(ticker, history.reverse());
    });
  }

  addPricePoint(ticker, price) {
    if (!this.priceHistory.has(ticker)) {
      this.priceHistory.set(ticker, []);
    }
    
    const history = this.priceHistory.get(ticker);
    history.push({
      price: parseFloat(price),
      lastUpdatedAt: new Date().toISOString()
    });

    
    if (history.length > 100) {
      history.shift();
    }
  }

  getPriceHistory(ticker, minutes = 60) {
    const history = this.priceHistory.get(ticker) || [];
    const cutoffTime = new Date(Date.now() - minutes * 60000);
    
    return history.filter(entry => 
      new Date(entry.lastUpdatedAt) >= cutoffTime
    );
  }

  getAveragePrice(ticker, minutes = 60) {
    const history = this.getPriceHistory(ticker, minutes);
    if (history.length === 0) return null;
    
    const sum = history.reduce((acc, entry) => acc + entry.price, 0);
    return parseFloat((sum / history.length).toFixed(4));
  }
}

const dataStore = new StockDataStore();


function calculateCorrelation(prices1, prices2) {
  if (prices1.length !== prices2.length || prices1.length === 0) {
    return 0;
  }

  const n = prices1.length;
  const mean1 = prices1.reduce((a, b) => a + b, 0) / n;
  const mean2 = prices2.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = prices1[i] - mean1;
    const diff2 = prices2[i] - mean2;
    
    numerator += diff1 * diff2;
    sum1Sq += diff1 * diff1;
    sum2Sq += diff2 * diff2;
  }

  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  return denominator === 0 ? 0 : parseFloat((numerator / denominator).toFixed(4));
}

app.get('/stocks', (req, res) => {
  const stocksObject = {};
  dataStore.stocks.forEach((name, ticker) => {
    stocksObject[name] = ticker;
  });
  
  res.json({ stocks: stocksObject });
});


app.get('/stocks/:ticker', (req, res) => {
  const { ticker } = req.params;
  const { minutes = 60 } = req.query;
  
  const upperTicker = ticker.toUpperCase();
  
  if (!dataStore.stocks.has(upperTicker)) {
    return res.status(404).json({ error: 'Stock not found' });
  }

  const history = dataStore.getPriceHistory(upperTicker, parseInt(minutes));
  res.json(history);
});


app.get('/hostname/stocks/:ticker', (req, res) => {
  const { ticker } = req.params;
  const { minutes = 60, aggregation = 'average' } = req.query;
  
  const upperTicker = ticker.toUpperCase();
  
  if (!dataStore.stocks.has(upperTicker)) {
    return res.status(404).json({ error: 'Stock not found' });
  }

  if (aggregation !== 'average') {
    return res.status(400).json({ error: 'Only average aggregation is supported' });
  }

  const avgPrice = dataStore.getAveragePrice(upperTicker, parseInt(minutes));
  const priceHistory = dataStore.getPriceHistory(upperTicker, parseInt(minutes));

  if (avgPrice === null) {
    return res.status(404).json({ error: 'No price data available for the specified time period' });
  }

  res.json({
    averageStockPrice: avgPrice,
    priceHistory: priceHistory
  });
});


app.get('/hostname/stockcorrelation', (req, res) => {
  const { minutes = 60, ticker1, ticker2 } = req.query;
  
  if (!ticker1 || !ticker2) {
    return res.status(400).json({ 
      error: 'Both ticker1 and ticker2 parameters are required' 
    });
  }

  const upperTicker1 = ticker1.toUpperCase();
  const upperTicker2 = ticker2.toUpperCase();

  if (!dataStore.stocks.has(upperTicker1) || !dataStore.stocks.has(upperTicker2)) {
    return res.status(404).json({ error: 'One or both stocks not found' });
  }

  const history1 = dataStore.getPriceHistory(upperTicker1, parseInt(minutes));
  const history2 = dataStore.getPriceHistory(upperTicker2, parseInt(minutes));

  if (history1.length === 0 || history2.length === 0) {
    return res.status(404).json({ 
      error: 'Insufficient price data for correlation calculation' 
    });
  }

 
  const minLength = Math.min(history1.length, history2.length);
  const prices1 = history1.slice(-minLength).map(h => h.price);
  const prices2 = history2.slice(-minLength).map(h => h.price);

  const correlation = calculateCorrelation(prices1, prices2);


  const avg1 = prices1.reduce((a, b) => a + b, 0) / prices1.length;
  const avg2 = prices2.reduce((a, b) => a + b, 0) / prices2.length;

  res.json({
    correlation: correlation,
    stocks: {
      [upperTicker1]: {
        averagePrice: parseFloat(avg1.toFixed(4)),
        priceHistory: history1.slice(-minLength)
      },
      [upperTicker2]: {
        averagePrice: parseFloat(avg2.toFixed(4)),
        priceHistory: history2.slice(-minLength)
      }
    }
  });
});


app.post('/stocks/:ticker/price', (req, res) => {
  const { ticker } = req.params;
  const { price } = req.body;
  
  const upperTicker = ticker.toUpperCase();
  
  if (!price || isNaN(price)) {
    return res.status(400).json({ error: 'Valid price is required' });
  }


  if (!dataStore.stocks.has(upperTicker)) {
    dataStore.stocks.set(upperTicker, `Stock ${upperTicker}`);
  }

  dataStore.addPricePoint(upperTicker, parseFloat(price));
  
  res.json({ 
    message: 'Price updated successfully',
    ticker: upperTicker,
    price: parseFloat(price),
    timestamp: new Date().toISOString()
  });
});


app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stocksCount: dataStore.stocks.size
  });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});


app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});


app.listen(PORT, () => {
  console.log(`Stock Price Aggregation Microservice running on port ${PORT}`);
  console.log(`Available endpoints:  GET   /stocks , /stocks/:ticker?minutes=m, /hostname/stocks/:ticker?minutes=m&aggregation=average ,GET /hostname/stockcorrelation?minutes=m&ticker1=T1&ticker2=T2, /health `);

  console.log(`  POST /stocks/:ticker/price - Add price point (for testing)`);

})
module.exports = app;