create table IF NOT EXISTS "book" 
(
  id SERIAL PRIMARY KEY,
  book_title TEXT,
  author TEXT,
  chapters integer,
  book_type_id integer,
  book_genres_id integer,
  book_url text,
  photo text,
  summary text
);

create table IF NOT EXISTS "book_type" 
(
  id SERIAL PRIMARY KEY,
  type_name text
);

create table if not exists "book_genres"
(
  id SERIAL PRIMARY KEY,
  book_id integer,
  genres_id integer
);

create table if not exists "genres"
(
  id SERIAL PRIMARY KEY,
  genres_name text
);

create table if not exists "book_user"
(
  id SERIAL PRIMARY KEY,
  book_id integer,
  end_user_id integer,
  current_page_chapter integer,
  last_read timestamp
);

create table if not exists "end_user"
(
  id SERIAL PRIMARY KEY,
  username text,
  user_password text 
);


create table if not exists "comments"
(
  id SERIAL PRIMARY KEY,
  comments text,
  book_id integer,
  user_id integer
);

