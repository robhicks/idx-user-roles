# App to check on and set roles using the IDX V1 API

### Prerequisites
Node v.10.2x or higher
Bower

### Installation
To install, do the following:
1. Install the prerequisites
..*Node - nodejs.org
..*Bower - after Node is installed from a command prompt: npm install -g bower
..*Nodemon - after Node is installed from a command prompt: npm install -g nodemon
2. Clone the repo (git clone https://github.com/fs-eng/idx-reviewer-role.git)
3. From a command prompt in the path where you cloned the repo: npm install

### Running
1. Fire up the app, from the same path using nodemon. It will find the app.js file and run it.
2. Open a browser to localhost:3000
3. Log into beta.familysearch.org with an account that has super admin rights.
4. Grab the fssessionid from the familysearch cookie.
5. Put the fssession id in the input asking for it.
