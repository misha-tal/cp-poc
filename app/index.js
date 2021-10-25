const express = require('express')
const app = express();
const https = require('https');
const http = require('http');
const axios = require('axios')

app.use(express.static('public'));

const HSTS_NODE="hsts.cp-poc.tangram-lab.com"
const HSTS_NODE_URL="http://hsts.cp-poc.tangram-lab.com:9091"
const HSTS_NODE_USER="xfer_user"
const HSTS_NODE_PASSWORD="*****"

const ORCH_API_ENDPOINT="https://orch.cp-poc.tangram-lab.com/aspera/orchestrator/api"
const ORCH_USER="faspex_user"
const ORCH_PASSWORD="*****"

const FASPEX_USER="customer1";
const FASPEX_USER_PASSWORD="*****";
const FASPEX_ENDPOINT="https://faspex.cp-poc.tangram-lab.com";
let faspexAccessToken;
let axios_faspex_config={
  auth: {
    username: FASPEX_USER,
    password: FASPEX_USER_PASSWORD
  },
  responseType: 'json',
};

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

var auth = 'Basic ' + Buffer.from(HSTS_NODE_USER + ':' + HSTS_NODE_PASSWORD).toString('base64');
var options = {
  host: HSTS_NODE,
  path: '/',
  port: '9091',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': auth
  }
};

var axios_config={
  auth: {
    username: HSTS_NODE_USER,
    password: HSTS_NODE_PASSWORD
  },
  responseType: 'json',

};



let tickets=
  [
    {"id":"TIC-05435", "title":"Service alpha hanging after reboot", "shareid":19, "dropboxid":4},
    {"id":"TIC-10780", "title":"Firewall fails to block traffic", "shareid":20, "dropboxid":5},
    {"id":"TIC-16015", "title":"Stuck data does not sync between DCs", "shareid":21, "dropboxid":3}
  ];

let syncStatus=[];

app.get('/hw', (req, res) => {
  res.send('Hello World!')
});

app.get('/tickets', (req, res) => {
  res.send(tickets)
});

app.get('/ticket-files/:ticketId', (req, res) => {
  let ticketId = req.params.ticketId;
  console.log ("getting files for ticket: " + ticketId);

  let data={
    "path" : "/tickets/" + ticketId + "/incoming",
    "count" : 50,
    "sort" : "mtime_d",
    "filters" : {
      "types" : ["file"],
      "depth_min" : 3
    }
  };

  let dataStr=JSON.stringify(data);

  options.path="/files/search"
  options.headers['Content-Length']=data.length;

  axios
    .post(HSTS_NODE_URL+"/files/search", data, axios_config)
    .then(resSearchResults => {
      console.log(`statusCode: ${resSearchResults.status}`)
      //console.log(resSearchResults)
      res.json(resSearchResults.data);
    })
   .catch(error => {
     console.error(error)
    });

  console.log ("done getting files for ticket: " + ticketId);
});

app.get('/sync/:ticketId', (req, res) => {
  let ticketId = req.params.ticketId;

  if (syncStatus[ticketId])
    res.send(syncStatus[ticketId]);
  else {
    let url = ORCH_API_ENDPOINT + "/initiate/5.json?" + 
      "login=faspex_script" +"&" +
      "api_key=******" +"&" +
      "external_parameters[Ticket]=" + ticketId +"&" +
      "external_parameters[Action]=status"  +"&" +
      "work_order[name]=Sync_" + ticketId + "_status"  +"&" +
      "explicit_output_step=GetLink"  +"&" +
      "explicit_output_variable=File_list"  +"&" +
      "synchronous=true"

    axios
      .get(url)
      .then(resSyncStatus => {
        console.log(`statusCode: ${resSyncStatus.status}`)
        console.log(resSyncStatus);

        if (resSyncStatus.data && Array.isArray(resSyncStatus.data)) {
          if (resSyncStatus.data.length>0) {
            syncStatus[ticketId]={"sync":"on"};
          }
          else {
            syncStatus[ticketId]={"sync":"off"};
          }    
        }
        res.json(syncStatus[ticketId]);
      })
     .catch(error => {
       console.error(error)
      });
  }
});

app.post('/sync/:ticketId', (req, res) => {
  let ticketId = req.params.ticketId;

  if (syncStatus[ticketId] && syncStatus[ticketId].sync=="on") {
    res.send({"sync":"on","info":"was on already"});
  }
  else {
    let url = ORCH_API_ENDPOINT + "/initiate/5.json?" + 
      "login=faspex_script" +"&" +
      "api_key=*****" +"&" +
      "external_parameters[Ticket]=" + ticketId +"&" +
      "external_parameters[Action]=switchOn"  +"&" +
      "work_order[name]=Sync_" + ticketId + "_switchOn"  +"&" +
      "explicit_output_step=CreateLink"  +"&" +
      "explicit_output_variable=stdio"  +"&" +
      "synchronous=true"

    axios
      .get(url)
      .then(resSyncStatus => {
        console.log(`statusCode: ${resSyncStatus.status}`)
        console.log(resSyncStatus);

        
        if ("OK" == resSyncStatus.data || "EXISTS" == resSyncStatus.data) {
          syncStatus[ticketId]={"sync":"on"};
        }
        else {
          syncStatus[ticketId]={"sync":"off"};
        }    
        
        res.json(syncStatus[ticketId]);
      })
     .catch(error => {
       console.error(error)
      });
  }

  
});

app.delete('/sync/:ticketId', (req, res) => {
  let ticketId = req.params.ticketId;

  if (syncStatus[ticketId] && syncStatus[ticketId].sync=="off") {
    res.send({"sync":"off","info":"was off already"});
  }
  else {
    let url = ORCH_API_ENDPOINT + "/initiate/5.json?" + 
      "login=faspex_script" +"&" +
      "api_key=*****" +"&" +
      "external_parameters[Ticket]=" + ticketId +"&" +
      "external_parameters[Action]=switchOff"  +"&" +
      "work_order[name]=Sync_" + ticketId + "_switchOff"  +"&" +
      "explicit_output_step=RemoveLink"  +"&" +
      "explicit_output_variable=stdio"  +"&" +
      "synchronous=true"

    axios
      .get(url)
      .then(resSyncStatus => {
        console.log(`statusCode: ${resSyncStatus.status}`)
        console.log(resSyncStatus);

        
        if ("OK" == resSyncStatus.data) {
          syncStatus[ticketId]={"sync":"off"};
        } 
        
        res.json(syncStatus[ticketId]);
      })
     .catch(error => {
       console.error(error)
      });
  }
});

/*
Generate package and transfer spec for package upload
*/
app.get('/transferSpec/:ticketId', (req, res) => {
  let ticketId = req.params.ticketId;

  let data = {};

  axios
    .post(FASPEX_ENDPOINT + "/aspera/faspex/auth/oauth2/token?grant_type=password", data, axios_faspex_config)
    .then(resAccess => {
      console.log(`Getting bearer: ${resAccess.status}`);
      faspexAccessToken = resAccess.data.access_token;

      // generate package
      let packageData = {
          "recipients": ["*" + ticketId], 
          "senders": [FASPEX_USER], 
          "title": "API package uploading"
      };

      let packageHeaders = {
          "Authorization": 'Bearer ' + faspexAccessToken,
          "Accept": "application/json",
          "Content-type": "application/json"
      }

      axios
        .post(FASPEX_ENDPOINT + "/aspera/faspex/api/users/me/packages", packageData, {headers: packageHeaders})
        .then(resPackage => {
            console.log(`Getting package: ${resPackage.status}`);
            let packageId = resPackage.data.id;
            let transferSpecHeaders = {
                "Authorization": 'Bearer ' + faspexAccessToken,
                "Accept": "application/json",
                "Content-type": "application/json"
            }

            axios
              .post(FASPEX_ENDPOINT + "/aspera/faspex/api/users/me/packages/" + packageId + "/transfer_specs", {"direction": "send"}, {headers: transferSpecHeaders})
              .then(resTransferSpec => {
                  console.log(`Getting package: ${resTransferSpec.status}`);
                  res.json(resTransferSpec.data);
              })
              .catch(error => {
                 console.error(error)
              });

        })
        .catch(error => {
           console.error(error)
        });

      
    })
   .catch(error => {
     console.error(error)
    });

});



app.listen(3000, () => {
  console.log('Mockup listening on port 3000!')
});



const getJSON = function (options) {
    console.log('rest::getJSON');
    let reqHandler = +options.port === 9092 ? https : http;

    return new Promise((resolve, reject) => {
        let req = reqHandler.request(options, (res) => {
            let output = '';
            console.log('rest::', options.host + ':' + res.statusCode);
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                output += chunk;
            });

            res.on('end', () => {
                try {
                    let obj = JSON.parse(output);
                    // console.log('rest::', obj);
                    resolve({
                        statusCode: res.statusCode,
                        data: obj
                    });
                }
                catch (err) {
                    console.error('rest::end', err);
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            console.error('rest::request', err);
            reject(err);
        });

        req.end();
    });
};