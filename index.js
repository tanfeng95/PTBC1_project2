console.log('starting project 2')
import express from 'express';
import methodOverride from 'method-override';

import cookieParser from 'cookie-parser';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { router as indexRoute } from './router/basicRouters.js';
import { router as libraryRoute } from './router/bookLibraryRouter.js';


const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// const multerUpload = multer({ dest: 'images/' });

const app = express();
// app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
// app.use(methodOverride('_method'));
// app.use(cookieParser());
app.use(express.static('images'));
app.use(express.static('static'));

app.use('/',indexRoute)
app.use('/library',libraryRoute)

app.listen(3004)