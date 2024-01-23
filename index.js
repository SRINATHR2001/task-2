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

    // Exclude 'under' only when it comes before the price
    const regex = /\bunder\b\s*(\d+(\.\d+)?)?/i;
    searchTerm = searchTerm.replace(regex, '');
    var value=parseFloat(searchTerm);

    const body = await client.search({
      index:"product_index",
      body:{
        query:{
          bool:{
            must:[
              {
                exists:{
                  field:"MRP",
                }
              },
              {
                range:{
                  MRP:{
                    lte:value,
                  }
                }
              },
              {
                bool:{
                  should:[
                    {
                      multi_match:{
                        query:searchTerm,
                        fields:['PD_NAME','BRAND','CD'],
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        _source: ['PD_NAME', 'BRAND', 'MRP', 'STOCK', 'PD_ID', 'DISCOUNT_AMOUNT', 'CD', 'category_id'],
      }
    });
    console.log('Elasticsearch Response:', JSON.stringify(body, null, 2));

    if (body.hits && body.hits.hits) {
      const hits = body.hits.hits;
      res.render('search', { data: hits });
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