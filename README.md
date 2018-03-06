# OEVENT Frontend

Is an Angular application for browsing startlist and results of Oevent. Provided is also a `live` page which updates itself regulary...

## Installation
Requires NodeJs > 8, then use
`npm install` or `yarn install`

## Configuration
Configuration has to be done in `src/environments/environment`:
- baseUrl: string to the URL of the backend. Leave empty if running on the same server and port as the backend.
- firstStart: date object of the first start.
- columnDefinitions: array of array of category ids. Outer array defines the number of columns for the LIVE page, while the inner array defines the categories to be shown in each columns.

See `src/environments/environment.ts` for example.

## Developing 
Use `npm run start` or `yarn run start` to start a dev build and serve the frontend on the dev server.

## Building
Use `npm run build` or `yarn run build` with optional `--prod` to build the project. The build is put to `dist` folder.

## Running
Use your favourite http server and serve the content of the `dist` folder. 

Optionally, copy the content of the `dist` folder to the backend project `dist-static` folder and use a backend server to serve the frontend.

## Available pages


### /index.html Home page
With links to the results, startlist and a live page.
