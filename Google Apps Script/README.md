# Google Apps Script version

This folder is now deployable as a Google Apps Script web app. `Code.gs` provides `doGet`, server-side account storage, hashed passwords, and protected user listing.

Create HTML files in the Apps Script editor from the copied HTML files, then add the copied CSS and client code through Apps Script HTML includes. Deploy with **Deploy > New deployment > Web app**, execute as the owner, and choose the required access level.

The `.gs` files named `App.gs`, `Signin.gs`, and `Database.gs` are browser-side JavaScript copies renamed for reference; they are not server-side Apps Script modules. Do not deploy them as server logic without adapting their DOM code.

Passwords are never returned by `listUsers`.
