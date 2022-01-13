console.log('starting project 2')
import express from 'express';
import methodOverride from 'method-override';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import multer from 'multer';

import { router as indexRoute } from './basicRouters.js';
import { router as libraryRoute } from './bookLibraryRouter.js';

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

app.use('/',indexRoute)
app.use('/library',libraryRoute)

app.listen(3004)