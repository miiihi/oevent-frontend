// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  baseUrl: 'http://localhost:7770/',
  firstStart: new Date(2018, 11, 9, 12),
  columnDefinitions: [
    [43, 44, 41, 42 ],
    [35, 36, 37, 38, 39, 40 ],
    [45, 46],
    [47, 48, 49, 50, 51]
  ]
};
