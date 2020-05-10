/*
Project Name: Aurora Collective Launcher (aurorav.net)
Language Used: NodeJS
Developer/s: Curt (curt.sg / curtcreation.net)
All Reserve Rights Curt Creation 2020 - 2021
*/

const {app, BrowserWindow, dialog, shell, clipboard, Menu, Tray} = require("electron")
const {download} = require("electron-dl")
const {autoUpdater} = require('electron-updater')
const log = require('electron-log')
const isUserDeveloper = require('electron-is-dev')
const path = require('path')
const exec = require('child_process').exec
const httpRequest = require('http')
const httpsRequest = require('https')
const findProcess = require('find-process')
const notifier = require('node-notifier')
var ipc = require('electron').ipcMain
var fs = require('fs')
var randomString = require("randomstring")
var tcpProxy = require("node-tcp-proxy")
var udpProxy = require('udp-proxy')
var ps = require('ps-node')
var process = require('process')

var rConnected = null
var rServers = []
var rPort = 0
var localTCPServer = null
var localUDPServer = null
var ts3Connected = false
let mainWindow = null
var appTray = null
var disableAutoDetectionFiveM = false
var numberOfRetries = 0
var maxNumberOfRetries = 8

const gotTheLock = app.requestSingleInstanceLock()

const isRunning = (query, cb) => {
    let platform = process.platform;
    let cmd = '';
    switch (platform) {
        case 'win32' : cmd = `tasklist`; break;
        case 'darwin' : cmd = `ps -ax | grep ${query}`; break;
        case 'linux' : cmd = `ps -A`; break;
        default: break;
    }
    exec(cmd, (err, stdout, stderr) => {
        cb(stdout.toLowerCase().indexOf(query.toLowerCase()) > -1);
    });
}

if (!gotTheLock) {
    app.quit()
    return
} else {
    app.on('second-instance', () => {
		if (mainWindow) {
            mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
		}
	})
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
    return array
}
  

function preRequirementsCheck() {
    log.info("Checking system requirements.")
    isRunning('FiveM.exe', (status) => {
        if (status == true) {
            mainWindow.webContents.executeJavaScript(`Swal.fire({
                title: 'Play Failed',
                html: 'Please close FiveM.',
                icon: 'error'
            });`)
        } else {
            initiateConnection()
            /*isRunning('ts3client_win64.exe', (status) => {
                if (status == true) {
                    if (ts3Connected == true) {
                        initiateConnection()
                    } else {
                        connectTS3Server()
                    }
                } else {
                    isRunning('ts3client_win32.exe', (status) => {
                        if (status == true) {
                            if (ts3Connected == true) {
                                initiateConnection()
                            } else {
                                connectTS3Server()
                            }
                        } else {
                            mainWindow.webContents.executeJavaScript(`Swal.fire({
                                title: 'Team Speak 3 Required',
                                text: "To able to play Aurora Roleplay, you need Team Speak 3.",
                                icon: 'warning',
                                confirmButtonColor: '#3085d6',
                                showCancelButton: true,
                                cancelButtonText: "Install",
                                confirmButtonText: 'Launch Team Speak',
                                allowOutsideClick: false,
                                }).then((result) => {
                                    if (result.value) {
                                        ipc.send('connectTS3Server');
                                    } else {
                                        Swal.fire({
                                            title: 'Downloading TS3',
                                            html: 'Hang on tight! Team Speak 3 Installation is downloading!',
                                            allowOutsideClick: false,
                                            onBeforeOpen: () => {
                                                Swal.showLoading();
                                            }
                                        });
                                        ipc.send('insatllRequirementTS3');
                                    }
                            });`)
                        }
                    })
                }
            })*/
        }
    })
}
ipc.on('preRequirementsCheck', preRequirementsCheck)

//TS3 Installation Part Helper
function checkTS3DoneInstalling (theOrigPath){
    isRunning(path.basename(theOrigPath), (status) => {
        if (status == true) {
            setTimeout(function() { checkTS3DoneInstalling(theOrigPath) }, 5000)
        } else {
            installReqTS3Plugin()
            if (fs.existsSync(theOrigPath)) {
                fs.unlink(theOrigPath, (err) => {})
            }
        }
    })
}

function installTS3(thePath) {
    setTimeout(function() {
        if (fs.existsSync(thePath)) {
            exec(thePath + " /S")
            mainWindow.webContents.executeJavaScript(`Swal.fire({
                title: 'Running TS3 Installion',
                html: 'Installing team speak 3 to your system.',
                allowOutsideClick: false,
                onBeforeOpen: () => {
                    Swal.showLoading();
                }
            });`)
            setTimeout(function() { checkTS3DoneInstalling(thePath) }, 15000)
        } else {
            mainWindow.webContents.executeJavaScript(`Swal.fire({
                title: 'Installation Failed',
                text: "Unable to install team speak 3 on your system.",
                icon: 'error'
            });`)
        }
    }, 1000)
}

function installReqTS3Plugin() {
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Downloading TS3 Plguin',
        html: 'Hang on tight. Team Speak 3 Plugin is downloading!',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
    download(BrowserWindow.getFocusedWindow(), "https://github.com/Itokoyamato/TokoVOIP_TS3/releases/download/v1.2.5-v1.3.5/tokovoip_1_2_5.ts3_plugin", {filename: randomString.generate(6)+'.ts3_plugin'})
        .then(dl => installTS3Plguin(dl.getSavePath()))
}

function checkTS3PluginDoneInstalling(theOrigPath) {
    isRunning("package_inst.exe", (status) => {
        if (status == true) {
            setTimeout(function() { checkTS3PluginDoneInstalling(theOrigPath) }, 5000)
        } else {
            if (fs.existsSync(theOrigPath)) {
                fs.unlink(theOrigPath, (err) => {})
            }
            connectTS3Server()
        }
    })
}

function installTS3Plguin(thePath) {
    if (fs.existsSync(thePath)) {
        exec(thePath)
        mainWindow.webContents.executeJavaScript(`Swal.fire({
            title: 'Running Plugin Installion',
            html: 'Please install team speak 3 plguin as promted.',
            allowOutsideClick: false,
            onBeforeOpen: () => {
                Swal.showLoading();
            }
        });`)
        setTimeout(function() { checkTS3PluginDoneInstalling(thePath) }, 5000)
    }
}

function insatllRequirementTS3() {
    download(BrowserWindow.getFocusedWindow(), "https://files.teamspeak-services.com/releases/client/3.5.2/TeamSpeak3-Client-win64-3.5.2.exe", {filename: randomString.generate(6)+'.exe'})
        .then(dl => installTS3(dl.getSavePath()))
}
ipc.on('insatllRequirementTS3', insatllRequirementTS3)

function connectTS3Server(arch=64) {
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'TS3 Connecting',
        html: 'Connecting to you to Aurora Roleplay Team Speak Server.',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
    findProcess('name', 'ts3client_win'+arch, true)
        .then(function(list) {
            if (list.length == 0) {
                if (arch == 32) {
                    shell.openExternal("ts3server://ts.aurorav.net?port=1113&channel=Waiting Channel&password=fGaR5P8SzsbQHey2")
                    setTimeout(function() { initiateConnection() }, 3000)
                    ts3Connected = true
                } else {
                    connectTS3Server(32)
                }
            } else {
                ps.kill(list[0].pid, function(err){
                    if (err) {
                        if (!ts3Connected) {
                            log.error("Error killing pid "+list[0].pid)
                            mainWindow.webContents.executeJavaScript(`Swal.fire({
                                title: 'Error',
                                html: 'Please exit Team Speak 3.',
                                icon: 'error'
                            });`)
                        }
                    } else {
                        shell.openExternal("ts3server://ts.aurorav.net?port=1113&channel=Waiting Channel&password=fGaR5P8SzsbQHey2")
                        setTimeout(function() { initiateConnection() }, 3000)
                        ts3Connected = true
                    }
                })
            }
        })
    
}
ipc.on('connectTS3Server', connectTS3Server)
//End of TS3 Installation Part Helper

//Connect to AuroraRP
function initiateConnection() {
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Authenticating',
        html: 'Getting info from authentication servers.',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)

    httpsRequest.get('https://play.aurorav.net/api/serv.php', (resp) => {
        let data = ''

        resp.on('data', (chunk) => {
            data += chunk
        });
        resp.on('end', () => {
            rServers = JSON.parse(data).servers
            rPort = JSON.parse(data).port
            mainWindow.webContents.executeJavaScript(`Swal.fire({
                title: 'Connecting',
                html: 'Creating proxy server to your computer',
                allowOutsideClick: false,
                onBeforeOpen: () => {
                    Swal.showLoading();
                }
            });`)
            setTimeout(function() { clientConnect() }, 3000)
        })

    }).on("error", (err) => {
        log.log("Error: " + err.message)
        mainWindow.webContents.executeJavaScript(`Swal.fire({
            title: 'Auth Failed',
            html: 'Failed to get auth info from authentication server.',
            icon: 'error'
        });`)
    })
}

function clientConnect() {
    if (rConnected == null) {
        numberOfRetries = 0
        log.log("Checking available servers..")
        shuffle(rServers)
        for(let val of rServers) {
            if (rConnected == null) {
                httpRequest.get('http://'+val+":"+rPort, (resp) => {
                    let data = ''

                    resp.on('data', (chunk) => {
                        data += chunk
                    });
                    resp.on('end', () => {
                        var fxVersion = JSON.parse(data).version
                        if (fxVersion.search("FXServer") != -1) {
                            if (rConnected == null) {
                                rConnected = val
                                log.log("Found available host " + val + ":" + rPort)
                                clientStartCheckingOnline()
                                clientStartRProxy()
                            }
                        }
                    })
                }).on("error", (err) => {
                    log.log("Host failed: "+err)
                })
            }
        }
    }
}

function clientStartCheckingOnline() {
    if (rConnected != null) {
        if (numberOfRetries <= maxNumberOfRetries) {
            var theRest = httpRequest.get('http://'+rConnected+":"+rPort, (resp) => {
                let data = ''
                resp.on('data', (chunk) => {
                    data += chunk
                })
                resp.on('end', () => {
                    var fxVersion = JSON.parse(data).version
                    if (fxVersion.search("FXServer") == -1) {
                        numberOfRetries = numberOfRetries + 1
                        setTimeout(clientStartCheckingOnline, 2000)
                    } else {
                        setTimeout(clientStartCheckingOnline, 5000)
                        numberOfRetries = 0
                    }
                })
            }).on("error", (err) => {
                numberOfRetries = numberOfRetries + 1
                setTimeout(clientStartCheckingOnline, 2000)
            })
            theRest.setTimeout(5000, function( ) {
                numberOfRetries = numberOfRetries + 1
                setTimeout(clientStartCheckingOnline, 2000)
            })
        } else {
            numberOfRetries = 0
            log.error("Timedout. Trying to reconnect method.")
            rConnected = null
            clientConnect()
        }
    }
}

ipc.on('changeDetection', function() {
    log.log("Chaning detection rule.")
    if (disableAutoDetectionFiveM) {
        disableAutoDetectionFiveM = false
        mainWindow.webContents.executeJavaScript(`Swal.fire({
            title: 'FiveM',
            html: 'Changed fivem detecting to false.'
        });`)
    } else {
        disableAutoDetectionFiveM = true
        mainWindow.webContents.executeJavaScript(`Swal.fire({
            title: 'FiveM',
            html: 'Changed fivem detecting to true.'
        });`)
    }
})

function isFiveMStillRunning () {
    if (disableAutoDetectionFiveM == false) {
        isRunning('FiveM.exe', (status) => {
            if (status != true) {
                log.log("Shutting all the local proxies servers")
                mainWindow.webContents.executeJavaScript('reEnableEverything();')
                mainWindow.show()
                if (localTCPServer) {
                    log.log("Closed local TCP Server Proxy")
                    localTCPServer.end()
                    localTCPServer = null
                }
                if (localUDPServer) {
                    log.log("Closed local UDP Server Proxy")
                    localUDPServer.close()
                    localUDPServer = null
                }
                rConnected = null
                mainWindow.webContents.executeJavaScript(`player.playVideo();`)
            } else {
                setTimeout(function() { 
                    isFiveMStillRunning()
                }, 5000)
            }
        })
    }
}

function clientStartRProxy(bypassDetection=false) {
    if (localTCPServer) {
        log.log("Closed local TCP Server Proxy")
        localTCPServer.end()
        localTCPServer = null
    }
    if (localUDPServer) {
        log.log("Closed local UDP Server Proxy")
        localUDPServer.close()
        localUDPServer = null
    }
    findProcess('port', rPort)
    .then(function(list) {
        if (!list.length || bypassDetection == true) {
            log.log("Created local proxy server for " + rConnected + ":" + rPort)
            localTCPServer = tcpProxy.createProxy(rPort, rConnected, rPort)
            localUDPServer = udpProxy.createServer({
                address: rConnected,
                port: rPort,
                localport: rPort,
                timeOutTime: 10000
            })
            localUDPServer.on('listening', function (details) {
                log.log('DNS - IPv4 to IPv4 proxy }>=<{')
                log.log('udp-proxy-server ready on ' + details.server.family + '  ' + details.server.address + ':' + details.server.port)
                log.log('traffic is forwarded to ' + details.target.family + '  ' + details.target.address + ':' + details.target.port)
                mainWindow.webContents.executeJavaScript(`player.pauseVideo();`)
                isRunning('FiveM.exe', (status) => {
                    if (status != true) {
                        setTimeout(function() { 
                            isFiveMStillRunning()
                        }, 30000)
                        shell.openExternal("fivem://connect/localhost:"+rPort)
                        mainWindow.webContents.executeJavaScript(`Swal.fire({
                            title: 'Connected',
                            html: 'You are now connected to AuroraRP!',
                            icon: 'success'
                        });`)
                        mainWindow.hide()
                        mainWindow.webContents.executeJavaScript('destroyEverything();')
                        notifier.notify("AuroraRP Launcher is hidden at the apptray.")
                    }
                })
            })

            localUDPServer.on('proxyClose', function (peer) {
                log.log('disconnecting socket from ' + peer.address);
            });
            
            localUDPServer.on('proxyError', function (err) {
                log.log('ProxyError! ' + err);
            });
            
            localUDPServer.on('error', function (err) {
                log.log('Error! ' + err);
            });
        } else {
            if (process.pid == list[0].pid) {
                log.error("TCP & UDP local proxy server did not shutdown cleanly. Retrying method")
                clientStartRProxy(true)
            } else {
                log.error("Bind port "+rPort+" couldn't open. It's using by: "+list[0].name)
                mainWindow.webContents.executeJavaScript('reEnableEverything();')
                mainWindow.show()
                mainWindow.webContents.executeJavaScript(`Swal.fire({
                    title: 'Port Unusable',
                    html: 'Cannot open port ${rPort}.Its being used by ${list[0].name}',
                    icon: 'error'
                });`)
            }
        }
    })
}
//End Connect to AuroraRP

function startBootstrapApp () {
    log.info('Bootstraping app with process id ' + process.pid)
    if (isUserDeveloper) {
        log.info('App is running in development')
    } else {
        log.info('App is running in production')
    }

    mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		titleBarStyle: 'hiddenInset',
		icon: path.join(__dirname, 'assets/img/logo.png'),
		show: false,
		frame: false,
		devTools: false,
		webPreferences: {
            nodeIntegration: true
		}
    })
    
    mainWindow.webContents.on("devtools-opened", () => { 
        if (!isUserDeveloper) {
            mainWindow.webContents.closeDevTools();
        }
    })

    mainWindow.webContents.on('new-window', function(e, url){
        log.info('Prevented to open other links, opening it on external.');
        e.preventDefault()
        shell.openExternal(url)
    })

    mainWindow.webContents.on("closed", () => { 
        app.quit()
    })

    mainWindow.loadFile('assets/gui/launcher.html', {userAgent: 'Aurora Launcher'})

    /*appTray = new Tray('icon.ico')
    appTray.setToolTip("AuroraRP")
    const contextMenu = Menu.buildFromTemplate([
        { label: 'AuroraRP v'+ app.getVersion() },
        { type: 'separator' },
        { label: 'Discord', click() { shell.openExternal('https://discord.aurorav.net/'); } },
        { type: 'separator' },
        { label: 'Quit AuroraRP', click() { app.quit() } },
      ])
    appTray.setContextMenu(contextMenu)*/
    mainWindow.webContents.once('dom-ready', () => {
        log.info('Bootstrap window is ready.')
        mainWindow.show()
        autoUpdater.checkForUpdates()
        //appTray.on('click', () => {
            //mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
        //})
    })
}

ipc.on('checkUpdate', function() {
    log.log("Triggering auto update tool")
    autoUpdater.checkForUpdatesAndNotify()
})

app.on('open-url', function (event, data) {
	event.preventDefault()
    mainWindow.focus()
})

app.on('window-all-closed', () => {
    if (process. platform !== 'darwin') {
        mainWindow.close()
        app.quit()
    }
})

log.info('Code Encoded.')
app.on('ready', startBootstrapApp)
app.setAsDefaultProtocolClient('aurora')

autoUpdater.on('checking-for-update', () => {
    log.log("Checking for updates.")
})

autoUpdater.on('update-available', info => {
    log.log("Update available.")
})

autoUpdater.on('download-progress', progressObj => {
    log.log(`Downloading update. DL: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`)
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Downloading Update',
        html: 'Speed: ${progressObj.bytesPerSecond} - ${~~progressObj.percent}% [${progressObj.transferred}/${progressObj.total}',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
})

autoUpdater.on('error', err => {
    log.log(`Update check failed: ${err.toString()}`)
})

autoUpdater.on('update-not-available', info => {
    log.log("Update not available.")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Updates',
        html: 'There are no available updates.',
        icon: 'error'
    });`)
})

autoUpdater.on('update-downloaded', info => {
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'App Restarting',
        html: 'Hang on tight, restarting the app for update!',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
    autoUpdater.quitAndInstall();
})