CREATE TABLE IF NOT EXISTS public."user"
(
    "id " SERIAL PRIMARY KEY,
    "book_title " text,
    "author" text,
    "book_type_id" INTEGER,
);

-- -- This script was generated by a beta version of the ERD tool in pgAdmin 4.
-- -- Please log an issue at https://redmine.postgresql.org/projects/pgadmin4/issues/new if you find any bugs, including reproduction steps.
-- BEGIN;


-- CREATE TABLE IF NOT EXISTS public.book
-- (
--     "id " integer NOT NULL,
--     "book_name " text,
--     book_type_id integer,
--     author_name text,
--     PRIMARY KEY ("id ")
-- );

-- CREATE TABLE IF NOT EXISTS public.book_type
-- (
--     id integer NOT NULL,
--     type_name text,
--     PRIMARY KEY (id)
-- );

-- CREATE TABLE IF NOT EXISTS public.book_user
-- (
--     id integer NOT NULL,
--     book_id integer,
--     user_id integer,
--     current_chap_page integer,
--     last_read date,
--     PRIMARY KEY (id)
-- );

-- CREATE TABLE IF NOT EXISTS public."user"
-- (
--     id integer NOT NULL,
--     username text,
--     password text,
--     PRIMARY KEY (id)
-- );

-- ALTER TABLE IF EXISTS public.book_type
--     ADD FOREIGN KEY (id)
--     REFERENCES public.book (book_type_id) MATCH SIMPLE
--     ON UPDATE NO ACTION
--     ON DELETE NO ACTION
--     NOT VALID;


-- ALTER TABLE IF EXISTS public.book_type
--     ADD FOREIGN KEY (id)
--     REFERENCES public.book (book_type_id) MATCH SIMPLE
--     ON UPDATE NO ACTION
--     ON DELETE NO ACTION
--     NOT VALID;


-- ALTER TABLE IF EXISTS public.book_user
--     ADD FOREIGN KEY (book_id)
--     REFERENCES public.book ("id ") MATCH SIMPLE
--     ON UPDATE NO ACTION
--     ON DELETE NO ACTION
--     NOT VALID;


-- ALTER TABLE IF EXISTS public.book_user
--     ADD FOREIGN KEY (user_id)
--     REFERENCES public."user" (id) MATCH SIMPLE
--     ON UPDATE NO ACTION
--     ON DELETE NO ACTION
--     NOT VALID;

-- END;