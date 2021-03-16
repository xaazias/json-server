const jsonServer = require('json-server');
const axios = require('axios')
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

const API_KEY = '571933242285687'
const API_SECRET = 'TLNWyse5COF1sc45thgJOgBQVL8'
const HOST_URL = `https://${API_KEY}:${API_SECRET}@api.cloudinary.com/v1_1/xaazias`

// Generate access token
function makeToken(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Use default middlewares (e.g. cors, logger)
server.use(middlewares);

// Parse json from request body
server.use(jsonServer.bodyParser);

// Protect admin paths
server.use((req, res, next) => {
  let authorized = false;

  if (req.method === 'GET' || req.path === '/login' || req.path === '/register') {
    next();
  } else {
    const token = req.headers.authorization;
    
    router.db.get('tokens').value().forEach((_token) => {
      if (token === 'Bearer ' + _token) {
        authorized = true;
        next();
      }
    });

    if (!authorized) res.sendStatus(401);
  }
});

// Admin authorization
server.post('/login', (req, res) => {
  const credentials = req.body;
  let authToken = null;

  router.db.get('users').value().forEach((user) => {
    if (user.login === credentials.login && user.password === credentials.password) {
      // Generate token
      const token = makeToken(100);
      
      // Add token to DB
      router.db.get('tokens').push(token).write();
      
      authToken = token
    }
  });

  res.json({
    accessToken: authToken
  });
});

// User registration
server.post('/register', (req, res) => {
    const credentials = req.body;
    let isRegistered = false;
  
    router.db.get('users').value().forEach((user) => {
      if (user.login === credentials.login) {
        res.json({
            accessToken: null
        })
        isRegistered = true
      }
    });
  
    if (!isRegistered) {
        // Generate token
        const token = makeToken(100);
            
        // Add token to DB
        router.db.get('tokens').push(token).write();

        // Add token to DB
        router.db.get('tokens').push(token).write();

        const [lastUser] = router.db.get('users').value().slice(-1)

        // Add user to BD
        router.db.get('users').push({ 
          id: lastUser.id + 1, 
          login: credentials.login, 
          password: credentials.password 
        }).write();

        res.json({
            accessToken: token
        });
    }
});

// Add article
server.post('/add_article', (req, res) => {
  const body = req.body;
  const [lastItem] = router.db.get('articles').value().slice(-1)
  const time = new Date()

  router.db.get('articles').push(
    {...body, id: lastItem.id + 1, time: time }).write();
      
  res.json({
    id: lastItem.id + 1
  });
});

/*  Delete unused images from hosting on article edit */
server.patch('/articles/:id', (req, res, next) => {
  
  const body = req.body
  const { id, preview, content } = body

  let images = content
    .filter(item => (item.type === 'image' && item.url !== null))
    .map(item => item.url)
  if (preview !== null) 
    images.push(preview)
 
  new Promise((resolve, reject) => {
    axios({ 
      method: 'get', 
      url: `${HOST_URL}/resources/search`, 
      responseType: 'json', 
      data: {
        expression: `folder:${id}`
      }
    })
    .then(response => {
      const filtered = response.data.resources
        .filter(item => (images.includes(item.secure_url) === false))
        .map(item => item.public_id)    
      resolve(filtered)
    })
    .catch(error => reject(error))
  })
  .then(response => {
    if (response.length > 0) {
      axios({
        method: 'delete',
        url: `${HOST_URL}/resources/image/upload`,
        responseType: 'json',
        data: {
          public_ids: response
        }
      })
      .then(() => next())
      .catch(error => console.log(error))
    }
    else next()
  })
  .catch(error => console.log(error))
})

/*  Delete unused images from hosting on article delete */
server.delete('/articles/:id', (req, res, next) => {
  
  const body = req.body
  const { id } = body

  let isFolder = false
 
  new Promise((resolve, reject) => {
    axios({ 
      method: 'get', 
      url: `${HOST_URL}/resources/search`, 
      responseType: 'json', 
      data: {
        expression: `folder:${id}`
      }
    })
    .then(response => {
      if (response.data.total_count > 0)
        isFolder = true
      resolve(isFolder)
    })
    .catch(error => reject(error))
  })
  .then(response => {
    if (response) {
      axios({
        method: 'delete',
        url: `${HOST_URL}/resources/image/upload`,
        responseType: 'json',
        data: {
          prefix: `${id}/`
        }
      })
      .then(() => {
        next()
      })
      .catch(error => console.log(error))
    }
    else {
      next()
    }
  })
  .catch(error => console.log(error))
})

// Default json-server behaviour
server.use(router);

// Launch server
server.listen(5500, () => {
  console.log(`JSON server is running at port: 5500`);
});
