# Test server for local development

Due to our use of the FileSystem APIs, the application can't be [ran locally from file://](https://developer.mozilla.org/en-US/docs/DOM/File_APIs/Filesystem/Basic_Concepts_About_the_Filesystem_API#file).

Running `node server.js` in here will launch a web server on `http://localhost:8080` serving up the game in the root, as well as a local content server running on `http://localhost:9000`.