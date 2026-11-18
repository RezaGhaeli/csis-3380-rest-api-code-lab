/*
   Lab settings: everything that makes this lab yours. The engine (app.js, checker.js) reads
   these values; the activities themselves live in activities.js.
   Image paths are relative to index.html. Any image can be null: the app then draws a
   coloured banner instead.
*/
const LAB = {
  title: 'REST API Code Lab: Movie Night API',                    // big title on the home page and in the browser tab
  brand: 'REST API Lab',                    // short name beside the logo in the top bar, e.g. "Code Lab"
  kicker: 'CSIS 3380 · Module 8 · REST APIs, MongoDB and Mongoose',
  scope: 'Module 8',                    // used in sentences, e.g. "Modules 1–6"
  lead: 'Build a REST API for Movie Night in fifteen steps. Part 1 (steps 1–8): JSON routes, route parameters, query strings, POST, PUT, DELETE, status codes and error handling. Part 2 (steps 9–15): move it to MongoDB with Mongoose: connect, schema and model, find, create, update, delete, and Mongoose errors. Four tries per step, guidance after every try, and a final score with a PDF report.',
  footer: 'CSIS 3380 · Full Stack Development with JavaScript',                  // footer text, e.g. "CSIS 1280 · Web Design"
  storageKey: 'codeLab.rest-api-code-lab-movie-night-api.v1',         // unique per lab, so two labs never share progress
  author: { name: 'Reza Ghaeli', url: 'https://github.com/RezaGhaeli' },

  logo: null,                            // e.g. 'img/logo.png' (wide logo for the dark top bar)
  heroArt: 'img/hero.png',
  heroAlt: 'A request from the client goes through the Express routes to the data and back as JSON',
  summaryArt: 'img/summary.png',
  how: [
    { img: 'img/how-json.png', title: 'One step at a time', text: 'Fifteen steps build one API. Part 1 keeps the movies in an array; Part 2 moves them to MongoDB with Mongoose. A step opens when the one before it is marked.' },
    { img: 'img/how-tester.png', title: 'Test as you go', text: 'The panel beside your code is an API tester: choose GET, POST, PUT or DELETE, type the path and a JSON body, and press Send.' },
    { img: 'img/how-mongo.png', title: 'A database included', text: 'In Part 2 the lab gives you a MongoDB database with the 7 movies and a .env with MONGODB_URI. Mongoose works as in the tutorial, error messages included; nothing to install.' },
    { img: 'img/how-feedback.png', title: 'Four tries, then the proper code', text: 'After each try you see what your API answered and why each check matters. Your best try counts; at the end you get your total and a PDF report.' }
  ],
  guide: null,                           // e.g. 'guide/Student_Guide.pdf' adds a "Student guide" button

  files: { js: 'server.js' },   // names on the editor tabs and in <link>/<script src>
  jsx: false,                            // true: compile the JS file from JSX with Babel (React labs); see the React section of the authoring guide
  express: true,                         // true: the JS file is an Express server (server.js) run in the browser; see "Express labs" in the authoring guide
  apiTester: true,
  mongo: {                               // Part 2: the database the lab's Mongoose look-alike starts with, and the .env it sees
    env: { MONGODB_URI: 'mongodb+srv://movienight:lab-password@cluster0.lab.mongodb.net/movienight?retryWrites=true&w=majority', PORT: '3000' },
    seed: {
      movies: [
        { _id: '665f1c010000000000000001', title: 'Spirited Away', year: 2001, genre: 'animation', rating: 8.6, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', __v: 0 },
        { _id: '665f1c010000000000000002', title: 'The Princess Bride', year: 1987, genre: 'comedy', rating: 8, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', __v: 0 },
        { _id: '665f1c010000000000000003', title: 'Inception', year: 2010, genre: 'sci-fi', rating: 8.8, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', __v: 0 },
        { _id: '665f1c010000000000000004', title: 'Hidden Figures', year: 2016, genre: 'drama', rating: 7.8, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', __v: 0 },
        { _id: '665f1c010000000000000005', title: 'Paddington 2', year: 2017, genre: 'comedy', rating: 7.8, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', __v: 0 },
        { _id: '665f1c010000000000000006', title: 'Arrival', year: 2016, genre: 'sci-fi', rating: 7.9, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', __v: 0 },
        { _id: '665f1c010000000000000007', title: 'Coco', year: 2017, genre: 'animation', rating: 8.4, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', __v: 0 }
      ]
    }
  },
  readySelector: null,                   // grading waits until this element has children (default '#root' when jsx is true)

  python: false,                    // true: students write Python (lab.py) run by Pyodide; set files to { py: 'lab.py' }
  pyPackages: ['numpy', 'pandas', 'scikit-learn'],   // loaded when Python starts (matplotlib loads on first import)
  pyData: [],                            // data files students read by name, e.g. ['data/diabetes.csv'] → pd.read_csv('diabetes.csv')
  pyTimeout: 60000,                      // stop a run after this many milliseconds

  /* Exam mode (null = a practice lab). A timed, one-sitting exam: students enter name + id and start a timer;
     all activities ("sections") are open; nothing is graded or shown until they finish (or time runs out);
     then they download a Word report (.docx) carrying their code, which grade.html re-grades in bulk.
     Keep solutions OUT of activities.js in an exam: see "Exams" in references/authoring-activities.md. e.g.
     { minutes: 40, idLabel: 'Student number', accessCode: null, review: false, rules: ['Work alone.', …] } */
  exam: {
    tries: 4,                            // four tries per step; the best one counts
    practice: true,                      // a practice lab: buttons and messages say "lab", not "exam"
    minutes: null,                       // no time limit: this is practice
    idLabel: 'Student number',
    accessCode: null,
    review: true,                        // every try shows why each failed check matters (guidance), not only what was found
    reportTag: 'REST-API-Lab',
    rules: [
      'This lab practises **Module 8**. Do the tutorial **Build a REST API with Express** before Part 1 (steps 1–8), and **MongoDB and Mongoose, Step by Step** before Part 2 (steps 9–15).',
      'Do the steps in order. Each step has **four tries**: after each try you see what your API answered and why each check matters. Your best try counts.',
      'Test your API in the panel beside the code before you check an answer: every check uses up a try.',
      'The checks test what your API **does** (status codes, JSON, what is saved), not how the code is written.',
      'When a step is marked you see the proper code, and the next step starts from it.',
      'At the end you get your score for every step and the total. Download the **PDF report** if your instructor asks for it.',
      'Use one browser and do not clear its data: your work is saved there.'
    ]
  },

  chromeOnly: false,                     // true: the lab opens only in Google Chrome (other browsers see a 'please use Chrome' page)
  passMark: 80,                          // "redo anything below this" advice on the results page
  desktopWidth: 960,                     // width of the hidden grading frame for desktop checks
  phoneWidth: 400                        // width used for csN()/rectN() checks and the Phone preview
};
