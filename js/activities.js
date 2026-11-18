/*
   REST API Code Lab: Movie Night API. Part 1 (steps 1–8) builds an Express 5 REST API on an in-memory array;
   Part 2 (steps 9–15) moves it to MongoDB with Mongoose (the lab's Mongoose look-alike, seeded from LAB.mongo).
   A stepwise lab (LAB.exam.tries = 4): the proper code, the starters of steps 2–8 and the fixes are NOT
   in this file. They are in the answer key (kept outside this folder) and reach the app encoded in
   js/keypack.js (scripts/pack_key.js), one step at a time.

   The checks test what the API DOES (status codes, JSON bodies, what is saved), never how the code is
   written. Advice about style or placement goes in each step's unmarked `tips`.
*/

/* ---------------------------------------------------------------- the given parts of server.js */
const HEAD_CODE = `const express = require('express');

const app = express();
const port = 3000;`;

const DB_CODE = `// ==================================================
// GIVEN: the Movie Night "database". Do not change this part.
// It works like records.js in the tutorial: every function is
// async (it returns a Promise), so put await in front of each call.
//   await movies.getMovies()         -> an array of all movies
//   await movies.getMovie(id)        -> one movie, or undefined
//   await movies.getRandomMovie()    -> one random movie
//   await movies.createMovie(movie)  -> the new movie, with its id
//   await movies.updateMovie(movie)  -> saves it (found by movie.id)
//   await movies.deleteMovie(movie)  -> removes it (found by movie.id)
// ==================================================
const movieList = [
  { id: 1, title: 'Spirited Away', year: 2001, genre: 'animation' },
  { id: 2, title: 'The Princess Bride', year: 1987, genre: 'comedy' },
  { id: 3, title: 'Inception', year: 2010, genre: 'sci-fi' },
  { id: 4, title: 'Hidden Figures', year: 2016, genre: 'drama' },
  { id: 5, title: 'Paddington 2', year: 2017, genre: 'comedy' },
  { id: 6, title: 'Arrival', year: 2016, genre: 'sci-fi' },
  { id: 7, title: 'Coco', year: 2017, genre: 'animation' }
];
let nextId = 8;
const copy = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const movies = {
  async getMovies() {
    return copy(movieList);
  },
  async getMovie(id) {
    return copy(movieList.find((m) => m.id == id));
  },
  async getRandomMovie() {
    return copy(movieList[Math.floor(Math.random() * movieList.length)]);
  },
  async createMovie(movie) {
    const saved = { id: nextId++, title: movie.title, year: movie.year, genre: movie.genre };
    movieList.push(saved);
    return copy(saved);
  },
  async updateMovie(movie) {
    const saved = movieList.find((m) => m.id == movie.id);
    if (saved) Object.assign(saved, { title: movie.title, year: movie.year, genre: movie.genre });
  },
  async deleteMovie(movie) {
    const i = movieList.findIndex((m) => m.id == movie.id);
    if (i >= 0) movieList.splice(i, 1);
  }
};
// ==================================================`;

const LISTEN_CODE = `app.listen(port, () => {
  console.log('Movie Night API listening on http://localhost:' + port);
});`;

/* ---------------------------------------------------------------- helpers for the checks */
const TITLES = ['Spirited Away', 'The Princess Bride', 'Inception', 'Hidden Figures', 'Paddington 2', 'Arrival', 'Coco'];
const isArr = r => Array.isArray(r.json);
const isMovie = x => !!x && typeof x === 'object' && !Array.isArray(x) && typeof x.title === 'string';
const emptyObj = r => r.status === 200 && r.json && typeof r.json === 'object' && !Array.isArray(r.json) && Object.keys(r.json).length === 0;
const found = r => (r.desc || 'no answer from the server') + (emptyObj(r) ? '  (an empty object {}: is an await missing?)' : '')
  + (r.status === 500 && /req\.body|reading 'title'|reading 'year'|of undefined/i.test(r.text || '') ? '  (req.body is undefined: is the JSON body parser missing, or below the routes?)' : '');
const json = r => /json/i.test(r.type || '');
const expressOwn = r => /cannot\s+(get|post|put|delete|patch)\s/i.test(r.text || '');   // Express's own HTML 404: no route of yours answered
const mine404 = r => r.status === 404 && !expressOwn(r);
const own = r => found(r) + (expressOwn(r) ? '  (this is Express\'s own page: no route of yours answered)' : '');
const hasMessage = r => json(r) && r.json && typeof r.json === 'object' && typeof r.json.message === 'string' && r.json.message.trim() !== '';
const NEW = { title: 'Wallace & Gromit: Vengeance Most Fowl', year: 2024, genre: 'animation' };

/* ---------------------------------------------------------------- helpers for Part 2 (MongoDB): the lab's Mongoose
   look-alike keeps its state in c.server.mongo (connections, models, the in-memory database) */
const NEWM = { title: 'Wallace & Gromit: Vengeance Most Fowl', year: 2024, genre: 'animation', rating: 8 };
const mongo = c => (c.server && c.server.mongo) || { connects: [], models: {}, connected: false };
const models = c => mongo(c).models || {};
const errMsg = r => (r.json && r.json.error && typeof r.json.error.message === 'string' && r.json.error.message) || (r.json && typeof r.json.message === 'string' && r.json.message) || '';
const count = async c => { const r = await c.get('/movies'); return Array.isArray(r.json) ? r.json.length : -1; };
const SEED_IDS = { 'Spirited Away': '665f1c010000000000000001', 'The Princess Bride': '665f1c010000000000000002', 'Inception': '665f1c010000000000000003',
  'Hidden Figures': '665f1c010000000000000004', 'Paddington 2': '665f1c010000000000000005', 'Arrival': '665f1c010000000000000006', 'Coco': '665f1c010000000000000007' };
const idOf = async (c, title) => { const r = await c.get('/movies'); const m = Array.isArray(r.json) && r.json.find(x => x && x.title === title); return (m && m._id) || SEED_IDS[title]; };
/* save a movie straight through the student's Movie model: the error it throws, or null (keep: the saved document) */
const tryCreate = async (c, data, keep) => {
  await c.get('/');
  const M = models(c).Movie;
  if (!M || !mongo(c).connected) return undefined;
  try {
    const d = await M.create(data);
    const copy = JSON.parse(JSON.stringify(d));
    await M.deleteOne({ _id: copy._id });
    return keep ? copy : null;
  } catch (e) { return keep ? undefined : e; }
};

const ACTIVITIES = [
  /* ------------------------------------------------------------------ 1 */
  {
    id: 1,
    module: 'Step 1',
    topic: 'res.json, async / await',
    edit: 'js',
    start: '/movies',
    title: 'GET /movies: send the whole list as JSON',
    art: 'img/a1.png',
    story: 'Movie Night is getting an **API**, so the React app (and later a phone app) can ask for the movies as **JSON** instead of HTML pages. The movies live in a small "database", the `movies` object given at the top of `server.js`. Like `records.js` in the tutorial, each of its functions is **async**: it returns a Promise. Test your API in the panel on the right: pick the method, type the path, press **Send**.',
    steps: [
      'Below the `// Step 1` comment, add a route for **`GET /movies`**.',
      { text: 'Make the route function `async`, get the list with `await movies.getMovies()`, and send it with `res.json(...)`:', code: "app.get('/movies', async (req, res) => {\n  const list = await movies.getMovies();\n  res.json(list);\n});" },
      'Send **GET `/movies`**: you should see an array of 7 movies and the status **200 OK**. Then try it **without** `await` once, to see what the client gets.'
    ],
    practise: ['app.get', 'async', 'await', 'res.json'],
    starter: { js: HEAD_CODE + '\n\n' + DB_CODE + '\n\n// Step 1: GET /movies -> every movie, as JSON\n\n' + LISTEN_CODE + '\n' },
    solution: { js: null },
    checks: [
      { text: '`GET /movies` answers **200** with a JSON body', pts: 2,
        test: async c => { const r = await c.get('/movies'); return c.ok(r.status === 200 && json(r), found(r)); },
        explain: '`res.json()` turns the value into JSON text and sets the header `Content-Type: application/json`, which tells the client what kind of data it received. Status 200 is the default.' },
      { text: 'The body is an **array** of movies (not `{}`)', pts: 2,
        test: async c => { const r = await c.get('/movies'); return c.ok(isArr(r) && r.json.every(isMovie), isArr(r) ? r.json.length + ' item(s) in an array' : found(r)); },
        explain: '`movies.getMovies()` returns a **Promise** right away. Without `await`, `res.json()` receives the pending Promise, which becomes `{}`. `await` (inside an `async` function) waits for the real array.' },
      { text: 'All **7** movies are in the list', pts: 1,
        test: async c => { const r = await c.get('/movies'); const t = isArr(r) ? r.json.map(m => m && m.title) : [];
          return c.ok(t.length === 7 && TITLES.every(x => t.includes(x)), isArr(r) ? t.length + ' movie(s): ' + t.slice(0, 3).join(', ') + (t.length > 3 ? ', …' : '') : found(r)); },
        explain: 'A collection endpoint such as `/movies` sends the whole collection. Filtering comes later, through the query string.' }
    ],
    tips: [
      c => /res\s*\.\s*(send|end)\s*\(\s*JSON\.stringify/.test(c.code.js) ? '`res.json(list)` does the `JSON.stringify` for you **and** sets the header `Content-Type: application/json`, so clients know the body is JSON.' : null
    ]
  },

  /* ------------------------------------------------------------------ 2 */
  {
    id: 2,
    module: 'Step 2',
    topic: 'req.params, 404',
    edit: 'js',
    start: '/movies/3',
    title: 'GET /movies/:id: one movie, or 404',
    art: 'img/a2.png',
    story: 'The React app needs a page per movie, so the API must send **one** movie when asked for `/movies/3`. When the id does not exist, a good API does not send an empty 200: it says **404 Not Found**, with a short JSON message the client can show.',
    steps: [
      'Below the `// Step 2` comment, add **`GET /movies/:id`**. The part of the path after `/movies/` arrives in `req.params.id` (as a **string**).',
      'Get the movie with `await movies.getMovie(req.params.id)`. If there is one, send it with `res.json(...)`.',
      { text: 'If there is none (`undefined`), send status **404** and a message:', code: "res.status(404).json({ message: 'Movie not found.' });" },
      'Test **GET `/movies/3`** (Inception) and **GET `/movies/99`** (404).'
    ],
    practise: ['req.params', 'res.status', '404', 'if / else'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '`GET /movies/3` answers **200** with the movie whose id is 3 (Inception)', pts: 2,
        test: async c => { const r = await c.get('/movies/3'); return c.ok(r.status === 200 && isMovie(r.json) && r.json.id == 3 && r.json.title === 'Inception', found(r)); },
        explain: 'A route parameter (`:id`) matches any value in that part of the path and puts it in `req.params.id`. It is always a string, so `"3"` must be compared with `==` or turned into a number with `Number()`; the given `getMovie` already does that.' },
      { text: 'Another id works too: `GET /movies/6` is Arrival', pts: 1,
        test: async c => { const r = await c.get('/movies/6'); return c.ok(r.status === 200 && isMovie(r.json) && r.json.title === 'Arrival', found(r)); },
        explain: 'One route serves every movie: the id comes from the URL, so nothing about a particular movie is written in the code.' },
      { text: '`GET /movies/99` answers **404 Not Found**', pts: 2,
        test: async c => { const r = await c.get('/movies/99'); return c.ok(mine404(r), own(r)); },
        explain: 'Status codes tell the client what happened before it reads the body. 4xx means "the request was wrong"; 404 means "no such resource". Without `res.status(404)`, Express sends 200.' },
      { text: 'The 404 reply is JSON with a `message`', pts: 1,
        test: async c => { const r = await c.get('/movies/99'); return c.ok(r.status === 404 && hasMessage(r), found(r)); },
        explain: 'An API answers errors in JSON too, so every client can read them the same way: `{ "message": "Movie not found." }`.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: 3,
    module: 'Step 3',
    topic: 'query string, req.query',
    edit: 'js',
    start: '/movies?genre=comedy',
    title: 'GET /movies?genre=comedy: filter with a query string',
    art: 'img/a3.png',
    story: 'Movie Night wants genre buttons. Instead of one route per genre, the client adds an option to the collection URL: a **query string** such as `?genre=comedy`. Express puts it in **`req.query`**, so `req.query.genre` is `"comedy"`.',
    steps: [
      'Change your **`GET /movies`** route (do not add a new one). Use `let` for the list, because you may replace it.',
      'If `req.query.genre` has a value, keep only the movies whose `genre` equals it, with the array method `filter()`. Make it work whatever the capitals: `?genre=Comedy` also gives the comedies (`toLowerCase()`).',
      'Without `?genre=`, the route still sends **all** movies.',
      'Test `/movies?genre=comedy` (2 movies), `/movies?genre=Sci-Fi` (2), `/movies?genre=western` (an empty array) and `/movies` (7).'
    ],
    practise: ['req.query', 'filter()', 'toLowerCase()'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '`/movies?genre=comedy` sends only the **2** comedies', pts: 2,
        test: async c => { const r = await c.get('/movies?genre=comedy'); const t = isArr(r) ? r.json.map(m => m && m.title) : [];
          return c.ok(t.length === 2 && t.includes('The Princess Bride') && t.includes('Paddington 2'), isArr(r) ? t.length + ' movie(s): ' + t.join(', ') : found(r)); },
        explain: 'Everything after `?` is a list of `key=value` pairs. Express parses it into `req.query`, an object, so `req.query.genre` is the text after `genre=`.' },
      { text: 'Capitals do not matter: `/movies?genre=Sci-Fi` sends the 2 sci-fi movies', pts: 1,
        test: async c => { const r = await c.get('/movies?genre=Sci-Fi'); const t = isArr(r) ? r.json.map(m => m && m.title) : [];
          return c.ok(t.length === 2 && t.includes('Inception') && t.includes('Arrival'), isArr(r) ? t.length + ' movie(s): ' + t.join(', ') : found(r)); },
        explain: 'Users type queries in any case. Comparing lower-case to lower-case (`toLowerCase()`) makes the filter forgiving.' },
      { text: 'An unknown genre gives **200** and an empty array `[]`', pts: 1,
        test: async c => { const r = await c.get('/movies?genre=western'); return c.ok(r.status === 200 && isArr(r) && r.json.length === 0, found(r)); },
        explain: 'A search with no results is not an error: the request was fine, the answer is just empty. So it is 200 with `[]`, not 404.' },
      { text: 'Without `?genre=`, `/movies` still sends all 7 movies', pts: 1,
        test: async c => { const f = await c.get('/movies?genre=comedy'); const filtered = isArr(f) && f.json.length === 2;
          const r = await c.get('/movies');
          return c.ok(filtered && isArr(r) && r.json.length === 7, !filtered ? 'the genre filter is not working yet' : isArr(r) ? r.json.length + ' movie(s)' : found(r)); },
        explain: 'When the key is missing, `req.query.genre` is `undefined`, which is falsy, so the `if` skips the filter and the full list is sent.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 4 */
  {
    id: 4,
    module: 'Step 4',
    topic: 'route order',
    edit: 'js',
    start: '/movies/random',
    title: 'GET /movies/random: and why route order matters',
    art: 'img/a4.png',
    story: 'Can\'t decide what to watch? `GET /movies/random` should pick one movie at random, with `movies.getRandomMovie()`. Careful: Express tries the routes **from top to bottom** and stops at the first match, and `/movies/:id` matches `/movies/random` too (with `id = "random"`).',
    steps: [
      'Before you write anything, send **GET `/movies/random`** and look at the answer. Which route answered?',
      'Add **`GET /movies/random`**: `await movies.getRandomMovie()` and send it as JSON.',
      'Put it where Express will reach it: **above** `GET /movies/:id`. Fixed paths go before paths with parameters.',
      'Send it a few times: the movie changes (sometimes the same one twice). `/movies/3` must still work.'
    ],
    practise: ['route order', 'getRandomMovie()'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '`GET /movies/random` answers **200** with one movie (an object, not a list)', pts: 2,
        test: async c => { const r = await c.get('/movies/random'); return c.ok(r.status === 200 && isMovie(r.json) && TITLES.includes(r.json.title), found(r) + (r.status === 404 && hasMessage(r) ? '  (this is your /movies/:id route answering, with id = "random")' : '')); },
        explain: 'Express checks routes in the order they were added. `/movies/:id` matches **any** second segment, so if it comes first it answers `/movies/random` with `id = "random"` and finds nothing. A fixed path must be added **above** the parameter route.' },
      { text: 'It really is random: 20 requests give at least 2 different movies', pts: 1,
        test: async c => { const seen = new Set(); let last;
          for (let i = 0; i < 20; i++) { last = await c.get('/movies/random'); if (isMovie(last.json)) seen.add(last.json.title); }
          return c.ok(seen.size >= 2, seen.size + ' different movie(s) in 20 requests' + (seen.size ? '' : ': ' + found(last))); },
        explain: '`getRandomMovie()` picks a new index every time, so the route must call it on **every** request (not once when the server starts).' },
      { text: '`/movies/3` still answers with Inception', pts: 1,
        test: async c => { const x = await c.get('/movies/random'); const ok = x.status === 200 && isMovie(x.json);
          const r = await c.get('/movies/3');
          return c.ok(ok && r.status === 200 && isMovie(r.json) && r.json.title === 'Inception', !ok ? '/movies/random is not working yet' : found(r)); },
        explain: 'Moving `/movies/random` above `/movies/:id` does not break the id route: any other value still falls through to it.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 5 */
  {
    id: 5,
    module: 'Step 5',
    topic: 'POST, express.json(), 201, 400',
    edit: 'js',
    start: '/movies',
    title: 'POST /movies: add a movie',
    art: 'img/a5.png',
    story: 'Club members want to suggest movies. A client sends **POST `/movies`** with the new movie in the request **body** as JSON, for example `{ "title": "Wallace & Gromit: Vengeance Most Fowl", "year": 2024, "genre": "animation" }`. The client does **not** send an id: `movies.createMovie()` gives one, as a database would.',
    steps: [
      { text: 'Express does not read request bodies by itself. At the `// Step 5a` comment (**before** the routes), add the middleware that turns a JSON body into `req.body`:', code: 'app.use(express.json());' },
      'At `// Step 5b`, add **`POST /movies`**. Read `title`, `year` and `genre` from `req.body`.',
      'The body is valid only if it has a `title` and a `year` that is a **number** (`typeof year === \'number\'`). Otherwise send **400** and a JSON `message`, and create nothing (`return` so the route stops there).',
      'If it is valid, `await movies.createMovie({ title, year, genre })` and send what it returns with status **201 Created**.',
      'Test it: choose **POST** in the panel, path `/movies`, type the JSON in the Body box, press **Send**. Then **GET `/movies`**: there are 8 movies. Try a body without a title, and one with `"year": "soon"`.'
    ],
    practise: ['express.json()', 'req.body', 'POST', '201', '400'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: 'A valid **POST `/movies`** answers **201 Created**', pts: 2,
        test: async c => { const r = await c.send('POST', '/movies', NEW); return c.ok(r.status === 201, found(r)); },
        explain: 'Without `express.json()`, `req.body` is `undefined` and `req.body.title` throws, so Express answers 500. The middleware must be added **before** the routes, because middleware runs in order. 201 is the success code for "a new resource was made".' },
      { text: 'The reply is the new movie, **with an id** and the title you sent', pts: 1,
        test: async c => { const r = await c.send('POST', '/movies', NEW); return c.ok(r.status === 201 && isMovie(r.json) && r.json.id != null && r.json.title === NEW.title && r.json.year === 2024, found(r)); },
        explain: 'Sending the created item back lets the client learn its **id** straight away (to link to it, edit it or delete it).' },
      { text: 'The new movie is saved: `GET /movies` has one more movie, and `GET /movies/<new id>` finds it', pts: 1,
        test: async c => { const b = await c.get('/movies'); const before = isArr(b) ? b.json.length : -1;
          const p = await c.send('POST', '/movies', NEW); const id = p.json && p.json.id;
          const all = await c.get('/movies'); const one = id != null ? await c.get('/movies/' + id) : null;
          return c.ok(p.status === 201 && before >= 0 && isArr(all) && all.json.length === before + 1 && one && one.status === 200 && one.json.title === NEW.title,
            p.status !== 201 ? found(p) : (isArr(all) ? before + ' movie(s) before the POST, ' + all.json.length + ' after' : found(all)) + (one ? '; ' + found(one) : '')); },
        explain: 'The route must `await movies.createMovie(...)`: the "database" is what remembers the movie, so every later request sees it.' },
      { text: 'A body **without a title** gets **400** with a JSON `message`', pts: 1,
        test: async c => { const r = await c.send('POST', '/movies', { year: 2020, genre: 'drama' }); return c.ok(r.status === 400 && hasMessage(r), found(r)); },
        explain: 'A good API refuses bad data and says why. 400 Bad Request means "your request is wrong; fix it and try again".' },
      { text: 'A **year that is not a number** (`"soon"`) gets **400**, and nothing is added', pts: 1,
        test: async c => { const b = await c.get('/movies'); const before = isArr(b) ? b.json.length : -1;
          const r = await c.send('POST', '/movies', { title: 'Mystery Film', year: 'soon' }); const all = await c.get('/movies');
          return c.ok(r.status === 400 && isArr(all) && all.json.length === before, r.status !== 400 ? found(r) : isArr(all) ? before + ' movie(s) before the refused POST, ' + all.json.length + ' after' : found(all)); },
        explain: '`typeof year === \'number\'` is true only for a real number; `"soon"` (or even `"2020"` in quotes) is a string. Check first, then `return` the 400, so `createMovie` never runs for bad data.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 6 */
  {
    id: 6,
    module: 'Step 6',
    topic: 'PUT, 204, 404, 400',
    edit: 'js',
    start: '/movies/2',
    title: 'PUT /movies/:id: edit a movie',
    art: 'img/a6.png',
    story: 'Someone typed a movie wrong. **PUT `/movies/:id`** replaces a movie\'s `title`, `year` and `genre` with the ones in the body. On success there is nothing new to send back, so the API answers **204 No Content** with an empty body.',
    steps: [
      'At `// Step 6`, add **`PUT /movies/:id`**. First `await movies.getMovie(req.params.id)`; if there is no such movie, send **404** and a JSON `message`.',
      'Check the body with the same rule as POST (a `title`, and a `year` that is a number); if it is bad, send **400** and a JSON `message`.',
      { text: 'Otherwise copy the new values onto the movie, save it, and end with 204:', code: 'movie.title = title;\nmovie.year = year;\nmovie.genre = genre;\nawait movies.updateMovie(movie);\nres.status(204).end();' },
      'Test: **PUT `/movies/2`** with `{ "title": "The Princess Bride", "year": 1987, "genre": "fantasy" }`, then **GET `/movies/2`**. Try `/movies/99` too.'
    ],
    practise: ['PUT', '204', 'res.end()', '404', '400'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: 'A valid **PUT `/movies/2`** answers **204 No Content**', pts: 2,
        test: async c => { const r = await c.send('PUT', '/movies/2', { title: 'The Princess Bride', year: 1987, genre: 'fantasy' }); return c.ok(r.status === 204, found(r)); },
        explain: '204 means "done, and there is no body". `res.status(204).end()` finishes the response without sending anything; with 204, any body you try to send is dropped anyway.' },
      { text: 'The change is saved: `GET /movies/2` shows the new values', pts: 2,
        test: async c => { const p = await c.send('PUT', '/movies/2', { title: 'The Princess Bride (1987)', year: 1987, genre: 'fantasy' }); const r = await c.get('/movies/2');
          return c.ok(r.status === 200 && isMovie(r.json) && r.json.title === 'The Princess Bride (1987)' && r.json.genre === 'fantasy', p.status !== 204 && p.status !== 200 ? found(p) : found(r)); },
        explain: '`getMovie()` returns a **copy**, as a real database would. Changing the copy is not enough: `await movies.updateMovie(movie)` is what saves it.' },
      { text: '**PUT `/movies/99`** answers **404**', pts: 1,
        test: async c => { const r = await c.send('PUT', '/movies/99', { title: 'Nope', year: 2000 }); return c.ok(mine404(r), own(r)); },
        explain: 'You cannot edit what does not exist. Checking for the movie first gives the client a clear 404 instead of a crash (500).' },
      { text: 'A body **without a year** gets **400**, and the movie is unchanged', pts: 1,
        test: async c => { const r = await c.send('PUT', '/movies/4', { title: 'Hidden Numbers' }); const g = await c.get('/movies/4');
          return c.ok(r.status === 400 && isMovie(g.json) && g.json.title === 'Hidden Figures', r.status !== 400 ? found(r) : 'after the refused PUT: ' + found(g)); },
        explain: 'Validate before you save. A PUT replaces the movie\'s data, so a body missing a field would wipe that field.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 7 */
  {
    id: 7,
    module: 'Step 7',
    topic: 'DELETE, 204, 404',
    edit: 'js',
    start: '/movies',
    title: 'DELETE /movies/:id: remove a movie',
    art: 'img/a7.png',
    story: 'The club voted a movie off the list. **DELETE `/movies/:id`** removes one movie. Like PUT, a success answers **204 No Content**; a movie that does not exist answers **404**.',
    steps: [
      'At `// Step 7`, add **`DELETE /movies/:id`**: find the movie with `await movies.getMovie(...)`.',
      'If it exists, `await movies.deleteMovie(movie)` and answer **204** with `res.status(204).end()`.',
      'If it does not, answer **404** with a JSON `message`.',
      'Test: **DELETE `/movies/5`** (204), then **GET `/movies/5`** (404), then the same DELETE again (404). (Any change to your code restarts the server with all 7 movies back.)'
    ],
    practise: ['DELETE', '204', '404'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '**DELETE `/movies/5`** answers **204 No Content**', pts: 2,
        test: async c => { const r = await c.send('DELETE', '/movies/5'); return c.ok(r.status === 204, found(r)); },
        explain: 'DELETE goes to **one item** (`/movies/5`), never to the whole collection. 204 says it worked and there is nothing to send back.' },
      { text: 'The movie is really gone: after **DELETE `/movies/6`**, `GET /movies/6` is 404 and the list has one movie fewer', pts: 1,
        test: async c => { const b = await c.get('/movies'); const before = isArr(b) ? b.json.length : -1;
          const d = await c.send('DELETE', '/movies/6'); const one = await c.get('/movies/6'); const all = await c.get('/movies');
          return c.ok(d.status === 204 && one.status === 404 && isArr(all) && all.json.length === before - 1 && !all.json.some(m => m.title === 'Arrival'),
            d.status !== 204 ? found(d) : one.status !== 404 ? found(one) : isArr(all) ? before + ' movie(s) before, ' + all.json.length + ' after' : found(all)); },
        explain: 'Only `await movies.deleteMovie(movie)` removes it from the "database". Sending 204 without calling it changes nothing.' },
      { text: '**DELETE `/movies/99`** (and a second DELETE of the same movie) answers **404**', pts: 1,
        test: async c => { const a = await c.send('DELETE', '/movies/99'); await c.send('DELETE', '/movies/1'); const b = await c.send('DELETE', '/movies/1');
          return c.ok(mine404(a) && mine404(b), !mine404(a) ? own(a) : 'second delete: ' + own(b)); },
        explain: 'Deleting something that is not there is the client\'s mistake, so it is a 4xx answer. Checking first also avoids passing `undefined` to the database.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 8 */
  {
    id: 8,
    module: 'Step 8',
    topic: '404 middleware, error handler',
    edit: 'js',
    start: '/hello',
    title: 'Errors in one place: the 404 and the error handler',
    art: 'img/a8.png',
    story: 'Send **GET `/hello`**: Express answers with its own **HTML** page, odd for an API that speaks JSON. And the given route **`GET /broken`** fails on purpose: Express sends an HTML error page with a stack trace. Two middleware functions at the end of the file make **every** error come back as JSON.',
    steps: [
      { text: 'At `// Step 8a` (after all the routes), add a middleware that only runs when **no route matched**. It makes a 404 error and passes it on:', code: "app.use((req, res, next) => {\n  const err = new Error('Not Found');\n  err.status = 404;\n  next(err);\n});" },
      'At `// Step 8b`, add the **error handler**: a middleware with **four** parameters `(err, req, res, next)`. It sends status `err.status`, or **500** if there is none, and the JSON `{ "error": { "message": err.message } }`.',
      'Keep both just above `app.listen(...)`, in this order.',
      'Test **GET `/hello`** (404 JSON), **GET `/broken`** (500 JSON: "The projector broke"), and check that `/movies` still works.'
    ],
    practise: ['app.use', 'next(err)', 'error handler', '500'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: 'An unknown URL (`GET /hello`) answers **404** from your own middleware', pts: 1,
        test: async c => { const r = await c.get('/hello'); return c.ok(mine404(r), own(r)); },
        explain: 'Middleware with no path at the end of the file is reached only when no route above it answered, which is exactly "not found".' },
      { text: 'The 404 is **JSON**: `{ "error": { "message": "Not Found" } }`', pts: 2,
        test: async c => { const r = await c.get('/hello'); const m = r.json && r.json.error && r.json.error.message;
          return c.ok(r.status === 404 && json(r) && typeof m === 'string' && /not\s*found/i.test(m), found(r) + (/cannot get/i.test(r.text || '') ? '  (this is still Express\'s own HTML page)' : '')); },
        explain: '`next(err)` skips every normal route and goes straight to the error handler. Express knows the error handler by its **four** parameters; with three it is an ordinary middleware and is skipped for errors.' },
      { text: 'A failing route (`GET /broken`) answers **500** with `error.message` "The projector broke"', pts: 2,
        test: async c => { const r = await c.get('/broken'); const m = r.json && r.json.error && r.json.error.message;
          return c.ok(r.status === 500 && json(r) && /projector broke/i.test(m || ''), found(r) + (r.status === 500 && !json(r) ? '  (still Express\'s own HTML error page)' : '')); },
        explain: 'When an `async` route throws, Express 5 passes the error to the error handler for you (with `try`/`catch` you would call `next(err)` yourself). The handler uses `err.status || 500`: errors with no status are server errors.' },
      { text: 'The real routes still work: `/movies` is 200 with 7 movies and `/movies/99` is still 404', pts: 1,
        test: async c => { const h = await c.get('/hello'); const mine = h.status === 404 && json(h);
          const r = await c.get('/movies'); const m = await c.get('/movies/99');
          return c.ok(mine && isArr(r) && r.json.length === 7 && m.status === 404, !mine ? 'the JSON 404 is not working yet' : !isArr(r) ? found(r) : found(m)); },
        explain: 'If the 404 middleware comes **before** the routes, it answers first and every URL becomes "not found". Order matters: routes, then 404, then the error handler.' }
    ],
    tips: [
      c => { const l = c.code.js.search(/app\s*\.\s*listen\s*\(/), u = c.code.js.lastIndexOf('app.use('); return l >= 0 && u > l ? 'It works, but keep the 404 middleware and the error handler just **above** `app.listen()`, so the file reads in the order Express runs it.' : null; }
    ]
  },
  /* ================================================================== PART 2: MongoDB and Mongoose */

  /* ------------------------------------------------------------------ 9 */
  {
    id: 9,
    module: 'Step 9',
    topic: 'dotenv, mongoose.connect',
    edit: 'js',
    start: '/',
    title: 'Part 2 begins: connect to MongoDB, then listen',
    art: 'img/a9.png',
    story: 'Part 2: the movies move from the `movieList` array into **MongoDB**. This lab gives you a MongoDB database that already holds the 7 movies (in the collection `movies`) and a `.env` file with `MONGODB_URI`, so there is nothing to install. `server.js` starts again from a short file. First job, as in the tutorial: load the secret, **connect**, and only then **listen**.',
    steps: [
      { text: 'At `// Step 9a`, the very top of the file, load `dotenv` first (so `process.env.MONGODB_URI` exists), then `mongoose`:', code: "require('dotenv').config({ quiet: true });\nconst express = require('express');\nconst mongoose = require('mongoose');" },
      'At `// Step 9b`, write an `async function start()` that `await`s `mongoose.connect(process.env.MONGODB_URI)`, logs **Connected to MongoDB**, and **then** calls `app.listen(...)`. Wrap it in `try`/`catch`: on failure log the error message.',
      'Call `start()` at the end of the file. Test **GET `/`** and read the terminal under the panel: "Connected to MongoDB" comes before the "listening" line.'
    ],
    practise: ['dotenv', 'process.env', 'mongoose.connect', 'async / await'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: 'The server runs: `GET /` answers **200** with the JSON welcome message', pts: 2,
        test: async c => { const r = await c.get('/'); return c.ok(r.status === 200 && hasMessage(r), found(r)); },
        explain: 'Until something calls `app.listen()`, the API does not answer at all. In this step `listen` is called inside `start()`, after the connection succeeds.' },
      { text: 'It connects to the database in `.env` (`process.env.MONGODB_URI`)', pts: 1,
        test: async c => { await c.get('/'); const m = mongo(c); const uri = (LAB.mongo && LAB.mongo.env || {}).MONGODB_URI;
          return c.ok(m.connects.includes(uri), m.connects.length ? 'connected to ' + m.connects.map(u => u.replace(/\/\/[^@]*@/, '//…@')).join(', ') : 'mongoose.connect() was never called'); },
        explain: 'The connection string holds a password, so it lives in `.env`, never in the code. `dotenv` copies it into `process.env.MONGODB_URI`; that is why `require(\'dotenv\').config()` must run before anything uses it.' },
      { text: 'It **connects first, then listens** (`app.listen` runs after `await mongoose.connect`)', pts: 1,
        test: async c => { await c.get('/'); const m = mongo(c); return c.ok(m.connects.length > 0 && m.connected && !m.listenedBeforeConnect, !m.connects.length ? 'mongoose.connect() was never called' : m.listenedBeforeConnect ? 'app.listen() ran before the connection was ready' : 'listening after the connection'); },
        explain: 'An API that cannot reach its database should not accept requests. `await` pauses `start()` until `mongoose.connect()` has finished; only then does `app.listen()` run. If the connection fails, the `catch` runs and the server never pretends to work.' },
      { text: 'The terminal shows a "connected" message', pts: 1,
        test: async c => { await c.get('/'); const t = (c.logs || []).join('\n'); return c.ok(/connect/i.test(t), t ? 'terminal: ' + t.replace(/\s+/g, ' ').slice(0, 90) : 'nothing in the terminal'); },
        explain: 'A log line on startup tells you at a glance that the database is reachable, which saves a lot of guessing when something else goes wrong.' }
    ],
    tips: [
      c => /mongodb(\+srv)?:\/\//.test(c.code.js) ? 'Do not write the connection string in `server.js`: it contains a password. Read it from `process.env.MONGODB_URI`.' : null
    ]
  },

  /* ------------------------------------------------------------------ 10 */
  {
    id: 10,
    module: 'Step 10',
    topic: 'Schema, model, find()',
    edit: 'js',
    start: '/movies',
    title: 'The Movie schema and model, and GET /movies',
    art: 'img/a10.png',
    story: 'MongoDB accepts any document; **Mongoose** lets us say what a movie must look like. From the **schema** we make a **model**, `Movie`, which reads and writes the `movies` collection. Then `GET /movies` can ask MongoDB for every movie with `Movie.find()`.',
    steps: [
      { text: 'At `// Step 10a`, define the schema and the model (the model name `Movie` becomes the collection `movies`):', code: "const movieSchema = new mongoose.Schema(\n  {\n    title: { type: String, required: true, trim: true },\n    year: { type: Number, required: true, min: 1888 },\n    genre: { type: String, required: true, lowercase: true, trim: true },\n    rating: { type: Number, min: 0, max: 10 }\n  },\n  { timestamps: true }\n);\nconst Movie = mongoose.model('Movie', movieSchema);" },
      'At `// Step 10b`, add **`GET /movies`**: `await Movie.find()` and send the result with `res.json(...)`.',
      'Sort the movies from the oldest to the newest year: `Movie.find().sort({ year: 1 })`.',
      'Test **GET `/movies`**: 7 movies, each with an `_id` that MongoDB created.'
    ],
    practise: ['mongoose.Schema', 'mongoose.model', 'find()', 'sort()'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '`GET /movies` answers **200** with the **7** movies from MongoDB (each with an `_id`)', pts: 2,
        test: async c => { const r = await c.get('/movies'); const ok = isArr(r) && r.json.length === 7 && r.json.every(m => isMovie(m) && /^[0-9a-f]{24}$/.test(m._id));
          return c.ok(r.status === 200 && ok, isArr(r) ? r.json.length + ' movie(s)' + (r.json[0] && !r.json[0]._id ? ' without _id (not from MongoDB?)' : '') : found(r) + (/circular structure/i.test(r.text || '') ? '  (res.json got a Query: is an await missing?)' : '')); },
        explain: '`Movie.find()` returns a **query**, which runs when you `await` it and gives an array of documents. Without `await`, `res.json()` receives the query object itself and fails. Every document has an `_id`, an ObjectId that MongoDB created.' },
      { text: 'The movies are sorted by year, oldest first', pts: 1,
        test: async c => { const r = await c.get('/movies'); const y = isArr(r) ? r.json.map(m => m.year) : [];
          return c.ok(y.length > 1 && y.every((v, i) => i === 0 || y[i - 1] <= v), y.length ? 'years: ' + y.join(', ') : found(r)); },
        explain: '`.sort({ year: 1 })` asks MongoDB to sort: `1` is ascending, `-1` descending. The database does the work, not your JavaScript.' },
      { text: 'A model called `Movie` exists, so the collection is `movies`', pts: 1,
        test: async c => { await c.get('/'); const M = models(c).Movie; return c.ok(!!M && M.collection.name === 'movies', Object.keys(models(c)).length ? 'models: ' + Object.keys(models(c)).join(', ') : 'no model yet'); },
        explain: 'Mongoose turns the model name into the collection name: lower case and plural, so `Movie` reads and writes `movies`. A different name would point at an empty collection.' },
      { text: 'Schema rules: a movie without a **title**, **year** or **genre** is refused', pts: 1,
        test: async c => { const e = await tryCreate(c, { rating: 5 }); const keys = e && e.errors ? Object.keys(e.errors) : [];
          return c.ok(['title', 'year', 'genre'].every(k => keys.includes(k)), e === null ? 'the empty movie was saved' : e && e.name ? e.name + (keys.length ? ' for: ' + keys.join(', ') : ': ' + e.message) : 'no Movie model'); },
        explain: '`required: true` makes Mongoose refuse to save a document without that field, with a `ValidationError` that lists every problem.' },
      { text: 'Schema rules: `year` must be at least **1888** and `rating` between **0 and 10**', pts: 1,
        test: async c => { const a = await tryCreate(c, { title: 'Old', year: 1500, genre: 'drama' }); const b = await tryCreate(c, { title: 'Wow', year: 2000, genre: 'drama', rating: 11 });
          const ok = a && a.errors && a.errors.year && b && b.errors && b.errors.rating;
          return c.ok(!!ok, !(a && a.errors && a.errors.year) ? 'year 1500 was accepted' : 'rating 11 was accepted'); },
        explain: '`min` and `max` check numbers before saving. 1888 is the year of the oldest surviving film, so an earlier year must be a typing mistake.' },
      { text: 'Schema options: `genre` is stored in lower case, `title` trimmed, with `createdAt` / `updatedAt`', pts: 1,
        test: async c => { const d = await tryCreate(c, { title: '  Trim Me  ', year: 2001, genre: 'DRAMA' }, true);
          return c.ok(!!d && d.title === 'Trim Me' && d.genre === 'drama' && !!d.createdAt && !!d.updatedAt, d && d.title !== undefined ? 'saved as title "' + d.title + '", genre "' + d.genre + '"' + (d.createdAt ? '' : ', no createdAt') : 'could not save a valid movie'); },
        explain: '`trim`, `lowercase` and `{ timestamps: true }` let Mongoose clean the data and record when each document was created and changed, without any code in the routes.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 11 */
  {
    id: 11,
    module: 'Step 11',
    topic: 'findById, a filter',
    edit: 'js',
    start: '/movies?genre=comedy',
    title: 'GET /movies/:id with findById, and ?genre= as a MongoDB filter',
    art: 'img/a11.png',
    story: 'Now one movie by its `_id`, and the genre buttons again. In Part 1 you filtered the array yourself; now MongoDB does it: `Movie.find({ genre: \'comedy\' })` is the same filter you would type in mongosh.',
    steps: [
      'At `// Step 11a`, add **`GET /movies/:id`**: `await Movie.findById(req.params.id)`. It gives `null` when no movie has that id: then send **404** and a JSON `message`.',
      'At `// Step 11b`, change `GET /movies`: build a `filter` object; if `req.query.genre` has a value, set `filter.genre` to it; pass it to `Movie.find(filter)` (keep the sort). `?genre=Comedy` works too: the schema\'s `lowercase: true` also lower-cases values in queries.',
      'Test: copy an `_id` from `/movies` and open `/movies/<that id>`; change one character of it (404); try `/movies?genre=Comedy` (2 movies) and `/movies` (still 7).'
    ],
    practise: ['findById', 'null', 'find(filter)', 'req.query'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '`GET /movies/<id of Inception>` answers **200** with that movie', pts: 2,
        test: async c => { const id = await idOf(c, 'Inception'); const r = await c.get('/movies/' + (id || '665f1c010000000000000003'));
          return c.ok(r.status === 200 && isMovie(r.json) && r.json.title === 'Inception', found(r)); },
        explain: '`findById(id)` looks for the document whose `_id` equals the id from the URL. Mongoose turns the 24-character string into an ObjectId for you.' },
      { text: 'A valid id that is not in the collection answers **404** with a JSON `message`', pts: 1,
        test: async c => { const r = await c.get('/movies/665f1c0100000000000000ff'); return c.ok(mine404(r) && hasMessage(r), own(r)); },
        explain: 'When nothing matches, `findById` resolves to `null` (it does not throw). Checking `if (!movie)` turns that into a clear 404 instead of an empty 200.' },
      { text: '`/movies?genre=Comedy` sends only the **2** comedies', pts: 1,
        test: async c => { const r = await c.get('/movies?genre=Comedy'); const t = isArr(r) ? r.json.map(m => m.title) : [];
          return c.ok(t.length === 2 && t.includes('The Princess Bride') && t.includes('Paddington 2'), isArr(r) ? t.length + ' movie(s): ' + t.join(', ') : found(r)); },
        explain: 'The object you pass to `find()` is a **filter**: only documents whose fields match are returned. Mongoose casts the filter with the schema, so `lowercase: true` turns "Comedy" into "comedy" before MongoDB compares.' },
      { text: 'Without `?genre=`, `/movies` still sends all 7, sorted by year', pts: 1,
        test: async c => { const f = await c.get('/movies?genre=comedy'); const filtered = isArr(f) && f.json.length === 2; const r = await c.get('/movies');
          const y = isArr(r) ? r.json.map(m => m.year) : [];
          return c.ok(filtered && y.length === 7 && y.every((v, i) => i === 0 || y[i - 1] <= v), !filtered ? 'the genre filter is not working yet' : isArr(r) ? y.length + ' movie(s)' : found(r)); },
        explain: 'An empty filter `{}` matches every document, so the same route serves both cases.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 12 */
  {
    id: 12,
    module: 'Step 12',
    topic: 'create()',
    edit: 'js',
    start: '/movies',
    title: 'POST /movies with Movie.create()',
    art: 'img/a12.png',
    story: 'Adding a movie is now one line: `Movie.create()` checks the schema, saves the document, and gives it back with its new `_id`. The rules you wrote in Step 10 protect the database from bad data.',
    steps: [
      'At `// Step 12`, add **`POST /movies`**. Take `title`, `year`, `genre` and `rating` from `req.body` (only those four).',
      '`await Movie.create({ title, year, genre, rating })` and send the result with status **201**.',
      'Test: **POST `/movies`** with `{ "title": "  Wallace & Gromit ", "year": 2024, "genre": "Animation" }`: look at how the title and genre were saved. Then try a body without a title: what does the client get? (Step 15 makes it a proper 400.)'
    ],
    practise: ['Model.create', '201', 'ValidationError'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: 'A valid **POST `/movies`** answers **201 Created**', pts: 2,
        test: async c => { const r = await c.send('POST', '/movies', NEWM); return c.ok(r.status === 201, found(r)); },
        explain: '`Movie.create()` returns a Promise of the saved document; `await` it, then answer 201, the status for "a new resource was made".' },
      { text: 'The reply is the saved movie: an `_id`, the title trimmed, the genre in lower case, and `createdAt`', pts: 1,
        test: async c => { const r = await c.send('POST', '/movies', { title: '  Wallace & Gromit ', year: 2024, genre: 'Animation' }); const m = r.json || {};
          return c.ok(r.status === 201 && /^[0-9a-f]{24}$/.test(m._id || '') && m.title === 'Wallace & Gromit' && m.genre === 'animation' && !!m.createdAt, found(r)); },
        explain: 'What `create()` gives back is the document **as saved**, after the schema cleaned it. Sending it back tells the client its new `_id`.' },
      { text: 'It is really saved: `GET /movies` has one more movie, and `GET /movies/<new _id>` finds it', pts: 1,
        test: async c => { const before = await count(c); const p = await c.send('POST', '/movies', NEWM); const id = p.json && p.json._id;
          const after = await count(c); const one = id ? await c.get('/movies/' + id) : null;
          return c.ok(p.status === 201 && after === before + 1 && one && one.status === 200, p.status !== 201 ? found(p) : before + ' movie(s) before, ' + after + ' after' + (one ? '; ' + found(one) : '')); },
        explain: 'The database, not the server, remembers the movie, so every later request (and a restart) still sees it.' },
      { text: 'A movie **without a title** is not saved', pts: 1,
        test: async c => { const before = await count(c); const p = await c.send('POST', '/movies', { year: 2020, genre: 'drama' }); const after = await count(c);
          return c.ok(p.status >= 400 && !expressOwn(p) && after === before, expressOwn(p) ? own(p) : p.status < 400 ? found(p) : before + ' movie(s) before, ' + after + ' after'); },
        explain: '`create()` validates first. A `ValidationError` rejects the Promise, so the route stops at `await` and nothing is saved. Until Step 15, Express answers that with a 500 HTML page.' }
    ],
    tips: [
      c => /create\s*\(\s*req\.body\s*\)/.test(c.code.js) ? 'It works, but pick the fields you accept (`const { title, year, genre, rating } = req.body`) instead of passing the whole body: a client cannot slip in fields you did not plan for.' : null
    ]
  },

  /* ------------------------------------------------------------------ 13 */
  {
    id: 13,
    module: 'Step 13',
    topic: 'findByIdAndUpdate',
    edit: 'js',
    start: '/movies',
    title: 'PUT /movies/:id with findByIdAndUpdate',
    art: 'img/a13.png',
    story: '`findByIdAndUpdate(id, changes, options)` finds a movie, applies the changes and saves it in one call. Two options matter: send back the movie **after** the change, and **run the schema rules** on updates too.',
    steps: [
      { text: 'At `// Step 13`, add **`PUT /movies/:id`**. Take the four fields from `req.body` and update:', code: "const movie = await Movie.findByIdAndUpdate(\n  req.params.id,\n  { title, year, genre, rating },\n  { returnDocument: 'after', runValidators: true }\n);" },
      'If `movie` is `null`, send **404** and a JSON `message`; otherwise send the updated movie (status 200).',
      'Test: **PUT** the Princess Bride\'s `_id` with `{ "genre": "Fantasy", "rating": 9 }`: only those fields change, and `updatedAt` moves. Then try `{ "rating": 20 }`.'
    ],
    practise: ['findByIdAndUpdate', 'returnDocument', 'runValidators'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: 'A valid **PUT** answers **200** with the movie **after** the change', pts: 2,
        test: async c => { const id = await idOf(c, 'The Princess Bride'); const r = await c.send('PUT', '/movies/' + id, { genre: 'Fantasy', rating: 9 });
          return c.ok(r.status === 200 && isMovie(r.json) && r.json.genre === 'fantasy' && r.json.rating === 9, found(r) + (r.status === 200 && r.json && r.json.genre === 'comedy' ? '  (this is the movie BEFORE the change: returnDocument: \'after\' is missing)' : '')); },
        explain: 'By default Mongoose returns the document as it was **before** the update. `returnDocument: \'after\'` returns the new version, which is what a client expects. (Older code writes `new: true`, which Mongoose 9 has deprecated.)' },
      { text: 'Only the fields you send change; the change is saved', pts: 1,
        test: async c => { const id = await idOf(c, 'Coco'); await c.send('PUT', '/movies/' + id, { rating: 9.1 }); const g = await c.get('/movies/' + id);
          return c.ok(g.status === 200 && g.json && g.json.rating === 9.1 && g.json.title === 'Coco' && g.json.year === 2017, found(g)); },
        explain: 'Fields you leave out of the body are `undefined`, and Mongoose skips them, so a PUT with `{ rating }` changes only the rating.' },
      { text: 'A valid id that does not exist answers **404**', pts: 1,
        test: async c => { const r = await c.send('PUT', '/movies/665f1c0100000000000000ff', { rating: 5 }); return c.ok(mine404(r), own(r)); },
        explain: '`findByIdAndUpdate` resolves to `null` when there is no such document, just like `findById`.' },
      { text: 'The schema rules apply to updates: `{ "rating": 20 }` is **not** saved', pts: 1,
        test: async c => { const id = await idOf(c, 'Arrival'); const p = await c.send('PUT', '/movies/' + id, { rating: 20 }); const g = await c.get('/movies/' + id);
          return c.ok(g.json && g.json.rating !== 20 && p.status >= 400 && !expressOwn(p), g.json && g.json.rating === 20 ? 'rating 20 was saved: runValidators is missing' : own(p)); },
        explain: 'Updates skip the schema rules unless you ask for them with `runValidators: true`. Without it, `min` and `max` are not checked and bad data reaches the database.' }
    ],
    tips: [
      c => /new\s*:\s*true/.test(c.code.js) ? '`new: true` still works but Mongoose 9 warns that it is deprecated: write `returnDocument: \'after\'`.' : null
    ]
  },

  /* ------------------------------------------------------------------ 14 */
  {
    id: 14,
    module: 'Step 14',
    topic: 'findByIdAndDelete',
    edit: 'js',
    start: '/movies',
    title: 'DELETE /movies/:id with findByIdAndDelete',
    art: 'img/a14.png',
    story: 'Last of the CRUD routes. `findByIdAndDelete` removes the movie and gives back what it removed, or `null` if there was nothing to remove.',
    steps: [
      'At `// Step 14`, add **`DELETE /movies/:id`**: `await Movie.findByIdAndDelete(req.params.id)`.',
      'If the result is `null`, answer **404** with a JSON `message`; otherwise **204** with `res.status(204).end()`.',
      'Test: delete one movie (204), then send the same request again (404).'
    ],
    practise: ['findByIdAndDelete', '204', '404'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '**DELETE** an existing movie answers **204 No Content**', pts: 2,
        test: async c => { const id = await idOf(c, 'Hidden Figures'); const r = await c.send('DELETE', '/movies/' + id); return c.ok(r.status === 204, found(r)); },
        explain: '204 says "done, and there is nothing to send back". The deleted document is in the result if you ever need it (for a log, or an undo).' },
      { text: 'The movie is really gone: `GET` gives 404 and the list has one movie fewer', pts: 1,
        test: async c => { const id = await idOf(c, 'Arrival'); const before = await count(c); const d = await c.send('DELETE', '/movies/' + id);
          const one = await c.get('/movies/' + id); const after = await count(c);
          return c.ok(d.status === 204 && one.status === 404 && after === before - 1, d.status !== 204 ? found(d) : one.status !== 404 ? found(one) : before + ' movie(s) before, ' + after + ' after'); },
        explain: 'Once deleted, `findById` finds nothing, so your Step 11 route answers 404 for it.' },
      { text: 'Deleting a movie that is not there answers **404**', pts: 1,
        test: async c => { const r = await c.send('DELETE', '/movies/665f1c0100000000000000ff'); return c.ok(mine404(r) && hasMessage(r), own(r)); },
        explain: '`findByIdAndDelete` resolves to `null` when there was nothing to delete: the client asked for something that does not exist.' }
    ],
    tips: []
  },

  /* ------------------------------------------------------------------ 15 */
  {
    id: 15,
    module: 'Step 15',
    topic: 'CastError, ValidationError',
    edit: 'js',
    start: '/movies/abc',
    title: 'Mongoose errors in one place: 400s, a JSON 404',
    art: 'img/a15.png',
    story: 'Two Mongoose errors still reach the client as 500 HTML pages: a **CastError** (`/movies/abc` is not an ObjectId) and a **ValidationError** (data that breaks a schema rule). Both are the **client\'s** mistake, so they should be **400** with a JSON message. One error handler fixes every route at once.',
    steps: [
      'At `// Step 15a` (after all the routes), add the middleware that makes a 404 `Error(\'Not Found\')` and passes it on with `next(err)`, as in Part 1.',
      { text: 'At `// Step 15b`, add the error handler (four parameters). Check `err.name` first:', code: "if (err.name === 'CastError') {\n  return res.status(400).json({ error: { message: 'That is not a valid movie id.' } });\n}\nif (err.name === 'ValidationError') {\n  return res.status(400).json({ error: { message: err.message } });\n}\nres.status(err.status || 500).json({ error: { message: err.message } });" },
      'Test **GET `/movies/abc`**, a **POST** without a title, a **PUT** with `{ "rating": 20 }`, and **GET `/hello`**.'
    ],
    practise: ['error handler', 'err.name', 'CastError', 'ValidationError'],
    starter: { js: null },
    solution: { js: null },
    checks: [
      { text: '`GET /movies/abc` answers **400** with a JSON `error.message`', pts: 1,
        test: async c => { const r = await c.get('/movies/abc'); return c.ok(r.status === 400 && errMsg(r) !== '', found(r)); },
        explain: '`findById(\'abc\')` cannot even search: Mongoose throws a **CastError** because "abc" is not a 24-character ObjectId. Express 5 passes it to the error handler, which recognises it by `err.name`.' },
      { text: 'A **POST** without a title answers **400**, and the message names the problem (`title`)', pts: 2,
        test: async c => { const r = await c.send('POST', '/movies', { year: 2020, genre: 'drama' }); return c.ok(r.status === 400 && /title/i.test(errMsg(r)), found(r)); },
        explain: 'A **ValidationError** lists every broken rule in `err.message` ("Movie validation failed: title: Path `title` is required."), so sending it back tells the client exactly what to fix.' },
      { text: 'A **PUT** with `{ "rating": 20 }` answers **400**', pts: 1,
        test: async c => { const id = await idOf(c, 'Spirited Away'); const r = await c.send('PUT', '/movies/' + id, { rating: 20 }); return c.ok(r.status === 400 && errMsg(r) !== '', found(r)); },
        explain: 'With `runValidators: true`, an update that breaks a rule throws the same ValidationError, so the same handler covers it.' },
      { text: 'An unknown URL answers **404** with `{ "error": { "message": "Not Found" } }`', pts: 1,
        test: async c => { const r = await c.get('/hello'); return c.ok(mine404(r) && /not\s*found/i.test(errMsg(r)), own(r)); },
        explain: 'The 404 middleware is reached only when no route answered; `next(err)` hands its error to the handler, so even "not found" comes back as JSON.' },
      { text: 'The real routes still work (`/movies` 200 with every movie, a missing id still 404)', pts: 1,
        test: async c => { const h = await c.get('/movies/abc'); const mine = h.status === 400; const r = await c.get('/movies'); const m = await c.get('/movies/665f1c0100000000000000ff');
          return c.ok(mine && isArr(r) && r.json.length >= 5 && m.status === 404, !mine ? 'the error handler is not working yet' : !isArr(r) ? found(r) : found(m)); },
        explain: 'The 404 middleware and the error handler must come **after** the routes: middleware runs in order, and a catch-all placed first would answer every request.' }
    ],
    tips: []
  }
];

/* Files the student does not edit are the same in starter and solution. */
ACTIVITIES.forEach(a => {
  for (const f of ['html', 'css', 'js']) if (a.solution[f] == null && a.starter[f] != null) a.solution[f] = a.starter[f];
});
