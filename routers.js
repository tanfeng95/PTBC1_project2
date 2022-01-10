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
  console.log('Time: ', Date.now())
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



export { router }
