import express from 'express'; 
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import multer from 'multer';
import paginate from 'paginate'
import moment from 'moment';
import { check, validationResult } from 'express-validator';
import {pool} from './pgConnection.js';
var router = express.Router();


const multerUpload = multer({ dest: 'images/' });
const SALT = process.env['SALT'];
router.use(express.urlencoded({ extended: false }));
router.use(methodOverride('_method'));
router.use(cookieParser());
router.use(express.static('images'));

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
      const content = { content : "Image required ", username : req.usersName} 
      res.render('error',content)
    return
  }
  let inputData = [req.body.bookTitle,req.body.author,req.body.chapters,req.body.bookType,req.body.bookUrl,req.file.filename,req.body.summary] 
  let sqlQueryInsert = 'insert into book (book_title,author,chapters,book_type_id,book_url,photo,summary) values ($1,$2,$3,$4,$5,$6,$7) RETURNING *;';
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


// use case 2  add book into library
router.get('/addbook',getAddBook)
router.post('/addbook',multerUpload.single('photo'), [
  check('bookTitle').not().isEmpty().withMessage('Book title is required'),
  check('author').not().isEmpty().withMessage('Author is required'),
  check('chapters').not().isEmpty().withMessage('Chapters is required'),
  check('bookUrl').not().isEmpty().withMessage('Url is required'),
],postAddBook)
// use case 6 
// use case 7 edit current book and reading status 
router.get('/editBook/:id/edit',editBookStatus)
router.put('/editBook/:id/edit',putBookStatus)
// use case 8 delete book from user library
router.delete('/deleteBook/:id/delete',deleteBookFromLibrary)
router.get('/:id/comment',getCommentsPage)
router.post('/:id/comment',postComments)
router.post('/addToUserLibrary', addToUserLibrary)
router.get('/',userLibrary)

export { router }