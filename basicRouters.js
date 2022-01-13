import express from 'express'; 
import methodOverride from 'method-override';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import multer from 'multer';
import paginate from 'paginate'
import moment from 'moment';
import { check, validationResult } from 'express-validator';

var router = express.Router();

router.use(function timeLog (req, res, next) {
  console.log('basic router: ', Date.now())
  next()
})

const { Pool } = pg ;
const pgConnectionConfigs = {
  user: 'tanfeng95',
  host: 'localhost',
  database: 'books',
  port: 5432, // Postgres server always runs on this port by default
};

const multerUpload = multer({ dest: 'images/' });
const pool = new Pool(pgConnectionConfigs);

router.use(express.urlencoded({ extended: false }));
router.use(methodOverride('_method'));
router.use(cookieParser());
router.use(express.static('images'));
const SALT = process.env['SALT'];
/**
 * Hashing string and changing into hex
 * @param {*} input 
 * @returns shaObj hex object
 */
const getHash = (input) => {
  // create new SHA object
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  // create an unhashed cookie string based on user ID and salt
  const unhashedString = `${input}-${SALT}`;
  // generate a hashed cookie string using SHA object
  shaObj.update(unhashedString);
  return shaObj.getHash('HEX');
};
/**
 *  Middleware for hashing user id and loggedIn 
 */
router.use((request, response, next) => {
  // set the default value
  request.defaultUser ='guest123';
  request.isUserLoggedIn = false;
  // check to see if the cookies you need exists
  if (request.cookies.loggedIn && request.cookies.userId) {
    // get the hased value that should be inside the cookie
    const hash = getHash(request.cookies.userId);
    // test the value of the cookie
    if (request.cookies.loggedIn === hash) {
      request.isUserLoggedIn = true;
      const values = [request.cookies.userId]
      pool.query('select * from end_user where id = $1',values, (err,result)=>{
        if (err || result.rows.length < 1) {
          response.status(503).send('sorry!');
          return;
        }
        request.user = result.rows[0];
        next();
      });
      return;
    }
  }
  next();
});

/**
 * Middleware for user name 
 */
router.use((req,res,next)=>{
    let defaultUser = req.defaultUser;
    if (req.isUserLoggedIn === true) {
      defaultUser = req.user.username;
    }
    req.usersName = defaultUser
 next();
})


/**
 * Router for index page of the app
 * querying * from book table 
 * @param {*} req 
 * @param {*} res 
 */
const getIndexPage =(req,res)=>{
  let queryIndex = ''
  if(req.query.q){
    queryIndex = `select * from book where book_title ilike '%${req.query.q}%'`;
  }else{
    queryIndex = 'select * from book;'
  }
    const whenDoneWithQuery = (error, result) => {
    if (error) {
      const content = { content : error.message}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
    }
    const resultArray = { result: result.rows ,
    username : req.usersName };
    res.render('index', resultArray);
  };
  pool.query(queryIndex,whenDoneWithQuery)
}


/**
 * Router for getting a single book by Id 
 * @param {*} req 
 * @param {*} res 
 * render index page
 */
const getBookById = (req,res)=>{
  let getBookByIdQuery = 
  `select book.id , book.book_title , book.author, book.chapters , book_type.type_name,
  genres.genres_name,book.photo,book.book_url,book.summary 
  from book  
  join book_type 
  on book.book_type_id = book_type.id
  join book_genres
  on book_genres.book_id = book.id 
  join genres
  on genres.id = book_genres.genres_id
  where book.id = ${req.params.id};`

  const getbookComments = 
  `select comments.comments , end_user.username
  from comments
  join book
  on comments.book_id = book.id
  join end_user
  on end_user.id = comments.user_id
  where book.id = ${req.params.id}`;

  let resultArray;
  pool
  .query(getBookByIdQuery)
  .then((result)=>{
    resultArray = {result : result.rows,username : req.usersName }
    return pool.query(getbookComments)
  })
  .then((result)=>{
    resultArray.comments = result.rows
    res.render('book',resultArray)
  })
  .catch((error)=>{
      const content = { content : error.message , username : req.usersName}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })
}

/**
 * render login page
 * @param {*} req 
 * @param {*} res 
 */
const getLogin = (req,res)=>{
  const resultArray = { username : req.usersName, loginFail : false};
  res.render('login',resultArray);
}
/**
 * autheticate user login and process user login 
 * @param {*} req 
 * @param {*} res 
 */
const postLogin = (req,res)=>{
   const values = [req.body.username];
   let userQuery = `select * from end_user where username = $1;`
   pool
   .query(userQuery,values)
   .then((result)=>{
    const user = result.rows[0]
    if(typeof user === 'undefined'){
       const resultArray = { username : req.usersName,
                              loginFail : true};
        res.render('login',resultArray);
      return;
    }
    const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    // input the password from the request to the SHA object
    shaObj.update(req.body.password);
    // get the hashed value as output from the SHA object
    const hashedPassword = shaObj.getHash('HEX');
    if(user.user_password !==  hashedPassword){
       res.redirect('/login')
      return;
    }
     const loggedInCookie = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
     const unHashCookie = `${user.id}-${SALT}`;
     loggedInCookie.update(unHashCookie);
     const hashCookieString = loggedInCookie.getHash('HEX');
      res.cookie("userId",user.id)
      res.cookie('loggedIn',hashCookieString)
      res.redirect('/')
   })
   .catch((error)=>{
      const content = { content : error.message}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
   })

}

/**
 * Process user logout and delete cookies 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
const deleteCookie = (req, res) => {
   if (req.isUserLoggedIn === false) {
    const content = { content : 'please login first before logout',username : req.usersName}
    res.render('pleaseLoginFirst',content)
    return;
  }
  const resultArray = { username :  req.usersName};
  res.clearCookie('loggedIn');
  res.clearCookie('userId')
  res.render('logout',resultArray);
};

/**
 * Render signup page 
 * @param {*} req 
 * @param {*} res 
 */
const getSignup =(req,res)=>{

  const resultArray = { username : req.usersName};
  res.render('signup',resultArray)
}
/**
 * Process user sign up and register the signup
 * @param {*} req 
 * @param {*} res 
 */
const postSignup = (req,res)=>{
  // initialise the SHA object
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  // input the password from the request to the SHA object
  shaObj.update(req.body.password);
  // get the hashed password as output from the SHA object
  const hashedPassword = shaObj.getHash('HEX');
  const inputData = [req.body.username,hashedPassword]
  const insertQuery = 'insert into end_user (username,user_password) values ($1,$2) '
  pool.query(insertQuery,inputData)
  .then((result)=>{
    res.redirect('/login')
  })
    .catch((error)=>{
      const content = { content : error.message}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })
}

// use case 1
router.get('/',getIndexPage)
router.get('/book/:id',getBookById)
// use case 3 ,4 , 5 
router.get('/login',getLogin)
router.post('/login',postLogin)
router.get('/logout', deleteCookie);
router.get('/signup',getSignup)
router.post('/signup',postSignup)
export { router }
