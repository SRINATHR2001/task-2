const express = require('express');
const { Client } = require('@elastic/elasticsearch')
const ejs = require('ejs');
const compromise = require('compromise');

const app = express();


const client = new Client({
  node: "http://192.168.1.72:9200",
  log: 'info',
});


app.set('view engine', 'ejs');


app.get('/', async (req, res) => {
    try {
      const  body  = await client.search({
        index: 'category_index',
        body: {
          query: {
            match_all: {}, // Retrieve all documents
          },
        },
      });
  
      
  
      if (body.hits && body.hits.hits) {
        const hits = body.hits.hits;
        res.render('home', { data: hits });
      } else {
        console.error('No hits found in Elasticsearch response:', body);
        res.status(404).send('No data found');
      }
    } catch (error) {
      console.error('Error in Elasticsearch query:', error.message);
      res.status(500).send('Internal Server Error');
    }
  });
  
  app.get('/all-products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const pageSize = 10; 

        const body = await client.search({
            index: 'product_index',
            body: {
                query: {
                    match_all: {}, 
                },
            },
            from: (page - 1) * pageSize, 
            size: pageSize,
        });

        

        if (body.hits && body.hits.hits) {
            const hits = body.hits.hits;
            const totalHits = body.hits.total.value; 
            const totalPages = Math.ceil(totalHits / pageSize);

            res.render('all-products', { data: hits, page, totalPages });
        } else {
            console.error('No hits found in Elasticsearch response:', body);
            res.status(404).send('No data found');
        }
    } catch (error) {
        console.error('Error in Elasticsearch query:', error.message);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/categories/type', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 10; 
        const categoryID = req.query.categoryID; 
        console.log(categoryID);
        
        let queryBody = {
            query: {
                term: { 'category_id': categoryID }
            }
        };

        const body = await client.search({
            index: 'product_index',
            body: queryBody,
            from: (page - 1) * pageSize, 
            size: pageSize, 
        });

        

        if (body.hits && body.hits.hits) {
            const hits = body.hits.hits;
            const totalHits = body.hits.total.value; // Total number of documents in the index
            const totalPages = Math.ceil(totalHits / pageSize);

            res.render('each', { data: hits, page, totalPages, categoryID });
        } else {
            console.error('No hits found in Elasticsearch response:', body);
            res.status(404).send('No data found');
        }
    } catch (error) {
        console.error('Error in Elasticsearch query:', error.message);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/search', async (req, res) => {
    try {
        let searchTerm = req.query.q || '';
  
        const words = searchTerm.split(' ');    
        const filteredWords = words.filter((word, index, array) => {
            if ((word.toLowerCase() === 'under' || word.toLowerCase() === 'below') && index < array.length - 1 && !isNaN(array[index + 1])) {
                return false;
            } else if ((word.toLowerCase() === 'above' || word.toLowerCase() === 'over') && index < array.length - 1 && !isNaN(array[index + 1])) {
                return false;
            }
            return true;
        });
  
        const lastElement = filteredWords[filteredWords.length - 1];
        const value = parseInt(lastElement, 10);
        const modifiedSearchTerm = filteredWords.join(' ');
  
        let rangeOperator = 'lte'; 
  
        // Check for "above" or "over" in the request
        if (words.includes('above') || words.includes('over')) {
            rangeOperator = 'gte'; 
        }
  
        const body = await client.search({
            index: "product_index",
            body: {
                query: {
                    bool: {
                        must: [
                            {
                                exists: {
                                    field: "MRP",
                                }
                            },
                            {
                                range: {
                                    MRP: {
                                        [rangeOperator]: value,
                                    }
                                }
                            },
                            {
                                bool: {
                                    should: [
                                        {
                                            multi_match: {
                                                query: modifiedSearchTerm,
                                                fields: ['PD_NAME', 'BRAND', 'CD'],
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                },
                _source: ['PD_NAME', 'BRAND', 'MRP', 'STOCK', 'PD_ID', 'DISCOUNT_AMOUNT', 'CD', 'category_id'],
                size:20
            }
        });
  
        console.log('Elasticsearch Response:', JSON.stringify(body, null, 2));
  
        if (body.hits && body.hits.hits) {
            const hits = body.hits.hits;
  
            // Pagination
            const page = parseInt(req.query.page) || 1; // Current page, default is 1
            const pageSize = 10; // Number of items per page
  
            const totalItems = body.hits.total.value; // Total items matching the query
            const totalPages = Math.ceil(totalItems / pageSize);
  
            const from = (page - 1) * pageSize;
            const to = Math.min(page * pageSize, totalItems);
  
            const paginatedHits = hits.slice(from, to);
  
            // Render the search.ejs with pagination information
            res.render('search', {
                data: paginatedHits,
                currentPage: page,
                totalPages: totalPages,
                searchTerm: searchTerm
            });
        } else {
            console.error('No hits found in Elasticsearch response:', body);
            res.status(404).send('No data found');
        }
    } catch (error) {
        console.error('Error in Elasticsearch query:', error.message);
        res.status(500).send('Internal Server Error');
    }
  });
  





//new commit wsegfwse





// Start the server
const port = 3000;
const host = "0.0.0.0"
app.listen(port, host,() => {

  console.log(`Server is running on http://${host}:${port}`);
});