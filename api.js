// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');

// const app = express();
// const port = process.env.PORT || 5000;


// app.use(cors());
// app.use(bodyParser.json());

// // Function to extract function names from the PyTeal code
// const extractFunctionNames = (code) => {
//   const functionNames = [];
//   const functionRegex = /def\s+(\w+)\s*\(/g;
//   let match;
//   while ((match = functionRegex.exec(code)) !== null) {
//     functionNames.push(match[1]);
//   }
//   return functionNames;
// };

// // Function to extract event handlers from the PyTeal code
// const extractEventHandlers = (code) => {
//   const eventHandlers = [];
//   const eventRegex = /Txn\.application_args\[0\]\s*==\s*Bytes\("([^"]+)"\)/g;
//   let match;
//   while ((match = eventRegex.exec(code)) !== null) {
//     eventHandlers.push(match[1]);
//   }
//   return eventHandlers;
// };

// // Endpoint to handle the smart contract code
// app.post('/api/smart-contract', (req, res) => {
//   const { code } = req.body;
//   if (!code) {
//     return res.status(400).json({ error: 'Smart contract code is required' });
//   }

//   try {
//     const functions = extractFunctionNames(code);
//     const events = extractEventHandlers(code);
//     return res.json({ functions, events });
//   } catch (error) {
//     console.error('Error processing smart contract code:', error);
//     return res.status(500).json({ error: 'Error processing smart contract code' });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const helmet = require('helmet');

// const app = express();
// const port = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(helmet()); // Adds security headers
// app.use(bodyParser.json());

// // Function to extract function names from the PyTeal code
// const extractFunctionNames = (code) => {
//   const functionNames = [];
//   const functionRegex = /def\s+(\w+)\s*\(/g;
//   let match;
//   while ((match = functionRegex.exec(code)) !== null) {
//     functionNames.push(match[1]);
//   }
//   return functionNames;
// };

// // Function to extract event handlers from the PyTeal code
// const extractEventHandlers = (code) => {
//   const eventHandlers = [];
//   const eventRegex =  /(Seq|If|Assert)\(\s*([^)]+)\)/g;
//   let match;
//   while ((match = eventRegex.exec(code)) !== null) {
//     eventHandlers.push(match[1]);
//   }
//   return eventHandlers;
// };

// // Endpoint to handle the smart contract code
// app.post('/api/smart-contract', (req, res) => {
//   const { code } = req.body;
//   if (!code) {
//     return res.status(400).json({ error: 'Smart contract code is required' });
//   }

//   try {
//     const functions = extractFunctionNames(code);
//     const events = extractEventHandlers(code);
//     return res.json({ functions, events });
//   } catch (error) {
//     console.error('Error processing smart contract code:', error);
//     return res.status(500).json({ error: 'Error processing smart contract code' });
//   }
// });

// // Basic route to check if server is running
// app.get('/', (req, res) => {
//   res.send('Server is running');
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet()); // Adds security headers
app.use(bodyParser.json());

// In-memory store for events
let eventsStore = [];

// Function to extract function names from the PyTeal code
const extractFunctionNames = (code) => {
  const functionNames = [];
  const functionRegex = /def\s+(\w+)\s*\(/g;
  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    functionNames.push(match[1]);
  }
  return functionNames;
};

// Function to extract event handlers from the PyTeal code
const extractEventHandlers = (code) => {
  const eventHandlers = [];
  // Regex to capture event names in `Txn.application_args` comparisons
  const eventRegex = /Txn\.application_args\[0\]\s*==\s*Bytes\("([^"]+)"\)/g;
  let match;
  while ((match = eventRegex.exec(code)) !== null) {
    eventHandlers.push(match[1]);
  }
  return eventHandlers;
};

// Endpoint to handle the smart contract code
app.post('/api/smart-contract', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Smart contract code is required' });
  }

  try {
    const functions = extractFunctionNames(code);
    const events = extractEventHandlers(code);
    eventsStore = events; // Store events in the in-memory store
    return res.json({ functions, events });
  } catch (error) {
    console.error('Error processing smart contract code:', error);
    return res.status(500).json({ error: 'Error processing smart contract code' });
  }
});
app.get('/transactions', async (req, res) => {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
  
    try {
      const url = `https://explorer.bitquery.io/algorand_testnet/address/${address}/transactions`;
      const { data } = await axios.get(url);
  
      const $ = cheerio.load(data);
      const transactions = [];
  
      // Assuming you can identify the relevant transaction data in the HTML:
      $('.transaction-row').each((index, element) => {
        const txn = {
          id: $(element).find('.txn-id').text(),
          sender: $(element).find('.sender').text(),
          receiver: $(element).find('.receiver').text(),
          amount: $(element).find('.amount').text(),
          note: $(element).find('.note').text(),
        };
        transactions.push(txn);
      });
  
      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
  });
// Endpoint to add an event
app.post('/api/add_event', (req, res) => {
  try {
    const { name, mid, arguments } = req.body;
    
    // Here you would typically add this event to your database
    // For now, let's just add it to our in-memory store
    const newEvent = { name, mid, arguments };
    eventsStore.push(newEvent);

    console.log('Added new event:', newEvent);
    
    return res.status(200).json({ message: 'Event added successfully' });
  } catch (error) {
    console.error('Error adding event:', error);
    return res.status(500).json({ error: 'Error adding event' });
  }
});

// Endpoint to get events
app.get('/api/events', (req, res) => {
  try {
    return res.json(eventsStore);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Error fetching events' });
  }
});

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});