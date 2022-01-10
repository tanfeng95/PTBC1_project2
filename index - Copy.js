console.log('starting project 2')
import express from 'express';
import methodOverride from 'method-override';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import multer from 'multer';
import paginate from 'paginate'
import moment from 'moment';
import { check, validationResult } from 'express-validator';
import passport  from 'passport';
import fs from 'fs';
import bodyParser from 'body-parser'
import querystring from 'querystring'
import axios from 'axios';

import { router as indexRoute } from './routers.js';


const { Pool } = pg ;
const pgConnectionConfigs = {
  user: 'tanfeng95',
  host: 'localhost',
  database: 'books',
  port: 5432, // Postgres server always runs on this port by default
};

const multerUpload = multer({ dest: 'images/' });
const pool = new Pool(pgConnectionConfigs);
const app = express();
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(express.static('images'));

app.get('/router',indexRoute)

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
app.use((request, response, next) => {
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
app.use((req,res,next)=>{
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
 * adding of book to user library 
 * @param {*} req 
 * @param {*} res 
 * redirect to the library page 
 */
const addToUserLibrary =(req,res)=>{ 
   if (req.isUserLoggedIn === false) {
    const content = { content : 'going into add this book into library' , username : req.usersName}
    res.render('pleaseLoginFirst',content)
    return;
  }
    const today = new Date();
    const inputData = [req.body.book_id , req.user.id,1,today]
    let updateUserLibraryQuery = `insert into book_user (book_id,end_user_id,current_page_chapter,last_read) values ($1,$2,$3,$4) returning *`
    const checkBook = [req.body.book_id , req.user.id]
    let checkBookQuery = 'select * from book_user where book_id = $1 and end_user_id = $2' 
    pool
    .query(checkBookQuery,checkBook)
    .then((results)=>{
      console.log(results.rows.length)
      if(results.rows.length >= 1){
        throw new Error('Unable to add to library,you might have added in your library')
      }else{
        return pool.query(updateUserLibraryQuery,inputData)
      }
    })
    .then((results)=>{
      if(results.rows.length>=1){
        const resultArray = {username : req.usersName }
        // need to send to book page 
        res.redirect('/library') 
      }
    })
    .catch((error)=>{
      const content = { content : error.message ,username : req.usersName}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })

}

/**
 * Direct to the books that user added into library
 * render user library page
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
const userLibrary = (req,res)=>{
   if (req.isUserLoggedIn === false) {
    const content = { content : 'going into user library' ,username : req.usersName }
    res.render('pleaseLoginFirst',content)
    return;
  }
  const userLibQuery = 
          `select * 
          from book_user
          join book
          on book.id = book_user.book_id
          where end_user_id = ${req.user.id}`
  pool
  .query(userLibQuery) 
  .then((result)=>{
    for(let i = 0 ; i < result.rows.length; i++){
      result.rows[i].last_read = moment(result.rows[i].last_read).fromNow();
    }
    let resultArray = { result: result.rows,username : req.usersName};

    res.render('userLibrary',resultArray)
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
/**
 * render add new book page 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
const getAddBook =(req,res)=>{
   if (req.isUserLoggedIn === false) {
    const content = { content : 'going into add book page',username : req.usersName}
    res.render('pleaseLoginFirst',content)
    return;
  }
  let query = 'select * from genres;'
  let result = {}
  pool
  .query(query)
  .then((result1)=>{
    result = {genres :result1.rows ,  username : req.usersName}
    const query2 = 'select * from book_type;'
    // res.render('addBookForm',result1) 
    return pool.query(query2)
  }).then((result2)=>{
    result.bookTypes = result2.rows
    res.render('addBookForm',result)
  })
  .catch((error)=>{
      const content = { content : error.message}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })
  // res.render('addBookForm')
}

/**
 * data validation to add book page and add book into database 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
const postAddBook = (req,res)=>{
  const errors = validationResult(req).array();
  if (errors.length !== 0) {
    const alert = errors;
    // const newAlert = { alert };
    // console.log(newAlert);
      let query = 'select * from genres;'
  let result = {}
  pool
  .query(query)
  .then((result1)=>{
    result = {genres :result1.rows ,  username : req.usersName ,alert : errors}
    const query2 = 'select * from book_type;'
    // res.render('addBookForm',result1) 
    return pool.query(query2)
  }).then((result2)=>{
    result.bookTypes = result2.rows
    res.render('addBookForm',result)
    return
  })
  .catch((error)=>{
      const content = { content : error.message ,username : req.usersName}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })} 
  if(typeof req.file === 'undefined'){
    return
  }
  let inputData = [req.body.bookTitle,req.body.author,req.body.chapters,req.body.bookType,req.body.bookUrl,req.file.filename]
  let sqlQueryInsert = 'insert into book (book_title,author,chapters,book_type_id,book_url,photo) values ($1,$2,$3,$4,$5,$6) RETURNING *;';

  let sqlQueryDoesBookExist = `select * from book where book_title ilike '%${req.body.bookTitle}%';`
  pool
  .query(sqlQueryDoesBookExist)
  .then((result)=>{
      if(result.rows.length >= 1){
          throw new Error('Unable to add to book library,there is simillar book')
      }else{
          return pool.query(sqlQueryInsert,inputData)
      }
    }
  )
  .then((result)=>{
    const bookId = result.rows[0].id;
    let queryDoneCounter = 0 ;

      req.body.genre_id.forEach((genreId,index)=>{
        let inputData2 = [bookId,genreId]
        let sqlQueryInsert2 = 'insert into book_genres (book_id,genres_id) values ($1,$2);';
        pool.query(sqlQueryInsert2,inputData2,(err,result2)=>{
          queryDoneCounter += 1;
          if (queryDoneCounter === req.body.genre_id.length) {
              res.redirect('/');
          }
        })
      })
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
 * render edit chapter page
 * @param {*} req 
 * @param {*} res 
 */
const editBookStatus = (req,res) =>{
  const today = new Date();
  let userId = req.user.id
  let queryStatus = `select * 
                    from book_user
                    join book 
                    on book.id = book_user.book_id
                    where book_id = ${req.params.id} AND end_user_id = ${userId}`
  pool.query(queryStatus)
  .then((result)=>{
    
    let resultArray  = {result : result.rows, username : req.usersName}
    res.render('editChapter',resultArray)
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
 * edit page read by user and update into database
 * @param {*} req 
 * @param {*} res 
 */
const putBookStatus = (req,res)=>{
  const today = new Date();
  let bookId = req.body.book_id
   let userId = req.user.id
  let inputData = [req.body.current_chapter,today]
  let updateQuery = `update book_user
                     set current_page_chapter = $1 ,last_read = $2
                      where book_id = ${bookId} AND end_user_id = ${userId}`
  pool.query(updateQuery,inputData)
  .then((result)=>{
    res.redirect('/library')
  }).catch((error)=>{
      const content = { content : error.message}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })
}
/**
 * delete book from library
 * @param {*} req 
 * @param {*} res 
 */
const deleteBookFromLibrary =(req,res)=>{

  let userId = req.user.id
  let bookId = req.params.id;
  let deleteQuery = `delete from book_user where book_id = ${bookId} AND end_user_id = ${userId}`;
  pool.query(deleteQuery)
  .then((result)=>{
    res.redirect('/library')
  }).catch((error)=>{
      const content = { content : error.stack}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })
}

const getCommentsPage =(req,res)=>{
  if (req.isUserLoggedIn === false) {
    const content = { content : 'going into add comments page' , username : req.usersName}
    res.render('pleaseLoginFirst',content)
    return;
  }
  const bookId = req.params.id;
  const resultArray = {username : req.usersName , book_id : bookId}
  res.render('comments',resultArray);
}

const postComments =(req,res)=>{
  const bookId = req.params.id
  let userId = req.user.id
  let inputData = [req.body.comment1,bookId,userId];
  let insertCommentQuery = 'insert into comments (comments,book_id,user_id) values ($1,$2,$3)'
  pool
  .query(insertCommentQuery,inputData)
  .then((result)=>{
    res.redirect(`/book/${bookId}`)
  }).catch((error)=>{
      const content = { content : error.message}
      console.log(error.message)
      console.log(error.stack)
      res.render('error',content)
      return;
  })
}

// use case 1
app.get('/',getIndexPage)
app.get('/book/:id',getBookById)
// use case 2  add book into library
app.get('/addbook',getAddBook)
app.post('/addbook',multerUpload.single('photo'), [
  check('bookTitle').not().isEmpty().withMessage('Book title is required'),
  check('author').not().isEmpty().withMessage('Author is required'),
  check('chapters').not().isEmpty().withMessage('Chapters is required'),
  check('bookUrl').not().isEmpty().withMessage('Url is required'),
],postAddBook)

app.post('/addToUserLibrary', addToUserLibrary)
// use case 3 ,4 , 5 
app.get('/login',getLogin)
app.post('/login',postLogin)
app.get('/logout', deleteCookie);
app.get('/signup',getSignup)
app.post('/signup',postSignup)
// use case 6 
app.get('/library',userLibrary)
// use case 7 edit current book and reading status 
app.get('/editBook/:id/edit',editBookStatus)
app.put('/editBook/:id/edit',putBookStatus)
// use case 8 delete book from user library
app.delete('/deleteBook/:id/delete',deleteBookFromLibrary)

app.get('/book/:id/comment',getCommentsPage)
app.post('/book/:id/comment',postComments)

app.listen(3004)