const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

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

        // Add user to BD
        router.db.get('users').push(
            { 
                id: router.db.get('users').value().length + 1, 
                login: credentials.login, 
                password: credentials.password 
            }
        ).write();

        res.json({
            accessToken: token
        });
    }
  });

// Default json-server behaviour
server.use(router);

// Launch server
server.listen(5500, () => {
  console.log(`JSON server is running at port: 5500`);
});
