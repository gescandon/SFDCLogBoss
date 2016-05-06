## SFDCLogBoss
Node tool for analyzing SFDC Log files

##Requirements
### Node : https://nodejs.org/
### NPM : (should be installed with Node)

##Usage: http://screencast.com/t/WPbuMIQqx
1. Clone this repo
1. Update the static.js file
1. Set var logpath = "your local directory of saved SFDC log files""
1. Initialize the dependencies from the command line: npm install
1. Start the server from command line: node static.js
1. Open your browser: localhost:8080
1. Select a log file from the picklist

##Recommended SFDC Dev Console Log Levels
1. DB: INFO
1. Callouts: NONE
1. ApexCode: DEBUG
1. Validation: NONE
1. Workflow: NONE
1. Profiling: NONE
1. Visualfore: NONE
1. System: DEBUG


