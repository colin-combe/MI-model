MI-model
========

reads the MI-JSON generated by JAMI 

##Input data

The 'MI-JSON' data format consumed is generated by the JAMI framework.
See: https://github.com/MICommunity/psimi

JAMI is capable of converting between various MI data formats, it can convert the PSI-MI XML standard into the MI-JSON format.

JAMI was originally developed by Marine Dumousseau, who also largely determined the structure of the MI-JSON format.
 
##Build Process

Bower must installed globally: $ npm install -g bower

1. Clone the repository.
2. $ cd /MI-model
3. $ npm install
4. $ bower install
5. $ npm start

This starts a grunt task to watch the /src folder for changes. When a file changes (is saved), grunt will browserify the folder and save the compiled version in /build.

To build the minified version in /build, run:

1. $ grunt package
