function wasmSupported(){
  try {
    if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
      var module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      if (module instanceof WebAssembly.Module)
      return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
    }
  } catch (e) {
  }
  return false;
}

var server = "wss://zhash.zanibet.com:5242/";
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
var sessionStartTime = 0;

var throttleMiner = 10;
var handshake = null;


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

    writeLog("Une erreur c'est produite, tentative de redémarrage du service ZaniAnalytics.");
    updateStatus("Inactif");
    if (zaniHashJS != null) zaniHashJS.error(event);
  }
  ws.onclose = function () {
    if (connected < 2) connected = 2;
    job = null;

    writeLog("Fermeture de la connexion à ZaniAnalytics.");
    updateStatus("Inactif");
    if (zaniHashJS != null) zaniHashJS.close();
  }
  ws.onopen = function () {
    ws.send((JSON.stringify(handshake)));
    attempts = 1;
    connected = 1;

    writeLog("Connexion à ZaniAnalytics réussie.");
    updateStatus("Récolte en cours...");
    if (zaniHashJS != null) zaniHashJS.open();
  }


};

reconnector = function () {
  if (connected !== 3 && (ws == null || (ws.readyState !== 0 && ws.readyState !== 1))) {
    writeLog("Tentative de re-connexion au service ZaniAnalytics.");
    updateStatus("Re-connexion en cours...");
    attempts++;
    openWebSocket();
  }

  if (connected !== 3)
  setTimeout(reconnector, 10000 * attempts);
};

function startZaniHash(userid) {
  writeLog("Démarrage du service ZaniAnalytics");
  clearZaniHash();
  connected = 0;

  handshake = {
    identifier: "handshake",
    userid: userid,
    version : 5
  };

  addWorkers(-1);
  reconnector();
}

function clearZaniHash() {
  writeLog("Initialisation de la connexion au service ZaniAnalytics.")
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
            else throw "algorithm not supported!";
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

    if (zaniHashJS != null){
      if ((totalhashes % reportMod) == 0) {
        zaniHashJS.setHashRate(totalhashes);
      }
    }
  }
}

function setThrottleMiner(power){
  writeLog("Modification de la vitesse de calcul.");
  throttleMiner = power;
}

function updateStatus(status){
  $("#analytics-status").text(status);
}

function writeLog(message){
  var logArea = $("#log-area");
  var logs = logArea.val();
  message = "[" + moment().toString() + "] - " + message + "\n";
  logArea.html(logs + message);
  if(logArea.length) logArea.scrollTop(logArea[0].scrollHeight - logArea.height());
}

function refreshWallet(email){
  setInterval(function(){
    $.get( "https://api.zanibet.com/api/zh/auth/" + email, function(data) {
      writeLog("Récupération de votre solde de ZaniHashs");
    })
    .done(function(data) {
      $("#zanihash").text(data.zanihash + " ZaniHashs");
      writeLog("Mise à jour de votre solde de ZaniHashs : " + data.zanihash + " ZH");
    })
    .fail(function() {
    });
  }, 120000);
}

function start(email) {
  if(!wasmSupported()){
    writeLog("Impossible de démarrer ZaniAnalytics car votre navigateur n'est pas compatible. Nous vous recommandons d'utiliser une version à jour de Google Chrome et de désactiver votre bloqueur de publicités (AdBlock...).");
    updateStatus("Inactif");
    return;
  }

  setThrottleMiner(parseInt(50));
  startZaniHash(email);
  refreshWallet(email);
  sessionStartTime = moment().valueOf();

  setInterval(function(){
    var elapsedMs = moment().valueOf() - sessionStartTime;
    var sec = (elapsedMs/1000)%60;
    var min = (elapsedMs/1000/60)%60;
    var hour = (elapsedMs/1000/60)/60;
    $("#session-length").text(hour.toFixed(0) + ":" + min.toFixed(0) + ":" + sec.toFixed(0));
    $("#zanihash-recolted").text(totalhashes);
    var hashrate = totalhashes/(elapsedMs/1000);
    $("#hashrate").text(hashrate.toFixed() + " ZaniHashs/s");
  }, 2000);
}

$(document).ready(function(){
  $(".form-signin").on('submit', function(event){
    event.preventDefault();
    $("#login-button").attr('disabled', '');
    var email = $("#input-email").val();
    $.get( "https://api.zanibet.com/api/zh/auth/" + email, function(data) {
      $("#authentification").fadeOut();
      $("#zani-analytics").delay(100).css('visibility', 'visible');
    })
    .done(function(data) {
      updateStatus("Initialisation...");
      $("#zanihash").text(data.zanihash + " ZaniHashs");
      writeLog("Votre portefeuille ZaniBet contient " + data.zanihash + " ZaniHashs");
      start(email);
    })
    .fail(function() {
      alert( "Impossible d'authentifier votre compte ZaniBet, merci de vérifier que vous avez saisi une adresse email valide." );
    });
    return false;
  });

  $('input[type=radio][name=analyticsPower]').change(function() {
    setThrottleMiner(parseInt(this.value));
  });
});
