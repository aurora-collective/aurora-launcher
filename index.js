/*
Project Name: Aurora Collective Launcher (aurorav.net)
Language Used: NodeJS
Developer/s: Curt (curt.sg / curtcreation.net)
All Reserve Rights Curt Creation 2020 - 2021
*/

const {app, BrowserWindow, dialog, shell, clipboard} = require("electron")
const {download} = require("electron-dl")
const {autoUpdater} = require('electron-updater')
const log = require('electron-log')
const isUserDeveloper = require('electron-is-dev')
const path = require('path')
const exec = require('child_process').exec
const httpRequest = require('http')
const httpsRequest = require('https')
var ipc = require('electron').ipcMain
var fs = require('fs')
var randomString = require("randomstring")
var tcpProxy = require("node-tcp-proxy")
var udpProxy = require('udp-proxy')

var rConnected = null
var rServers = []
var rPort = 0
var localTCPServer = null
var localUDPServer = null
var ts3Connected = false
let mainWindow = null

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
			if (mainWindow.isVisible()) {
				if (mainWindow.isMinimized()) {
                    mainWindow.restore()
                    mainWindow.show()
                } 
				mainWindow.focus()
			}
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
    isRunning('FiveM_GTAProcess.exe', (status) => {
        if (status == true) {
            mainWindow.webContents.executeJavaScript(`Swal.fire({
                title: 'Play Failed',
                html: 'Please close FiveM.',
                icon: 'error'
            });`)
        } else {
            isRunning('ts3client_win64.exe', (status) => {
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
                                confirmButtonText: 'Launch Team Speak'
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
            })
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
            exec(thePath)
            mainWindow.webContents.executeJavaScript(`Swal.fire({
                title: 'Running TS3 Installion',
                html: 'Please install team speak 3 as promted.',
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

function connectTS3Server() {
    ts3Connected = true
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'TS3 Connecting',
        html: 'Connecting to you to Aurora Roleplay Team Speak Server.',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
    shell.openExternal("ts3server://ts.aurorav.net?port=1113&channel=Waiting Channel&password=fGaR5P8SzsbQHey2")
    setTimeout(function() { initiateConnection() }, 3000)
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
        log.log("Checking available servers..")
        shuffle(rServers)
        for(let val of rServers) {
            if (rConnected == null) {
                const req = httpRequest.request({
                    hostname: val,
                    port: rPort,
                    path: '',
                    method: 'GET',
                    timeout: 1500
                }, res => {
                    if (res.statusCode == 200) {
                        if (rConnected == null) {
                            rConnected = val
                            log.log("Found available host " + val + ":" + rPort)
                            clientStartCheckingOnline()
                            clientStartRProxy()
                        }
                    }
                })
                req.on('error', error => {
                    log.error(error)
                })
                req.end()
            }
        }
    }
}

function clientStartCheckingOnline() {
    if (rConnected != null) {
        const req = httpRequest.request({
            hostname: rConnected,
            port: rPort,
            path: '',
            method: 'GET',
            timeout: 1500
        }, res => {
            if (res.statusCode != 200) {
                rConnected = null
                clientConnect()
            } else {
                setTimeout(clientStartCheckingOnline, 1500)
            }
        })
        req.on('error', error => {
            rConnected = null
            clientConnect()
        })
        req.end()
    }
}

function isFiveMStillRunning () {
    if (rConnected != null) {
        isRunning('FiveM_GTAProcess.exe', (status) => {
            if (status != true) {
                log.log("Shutting all the local proxies servers")
                if (localTCPServer) {
                    localTCPServer.end()
                    localTCPServer = null
                }
                if (localUDPServer) {
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

function clientStartRProxy() {
    if (localTCPServer) {
        localTCPServer.end()
        localTCPServer = null
    }
    if (localUDPServer) {
        localUDPServer.close()
        localUDPServer = null
    }
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
        isRunning('FiveM_GTAProcess.exe', (status) => {
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
}
//End Connect to AuroraRP

function startBootstrapApp () {
    log.info('Bootstraping app.')
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

    mainWindow.webContents.once('dom-ready', () => {
        log.info('Bootstrap window is ready.');
        mainWindow.show()
        autoUpdater.checkForUpdatesAndNotify()
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
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Checking Updates',
        html: 'Hang on tight, checking updates!',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
})

autoUpdater.on('checking-available', info => {
    log.log("Update available.")

})

autoUpdater.on('download-progress', progressObj => {
    log.log(`Downloading update. DL: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`)
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Downloading Update',
        html: '${progressObj.bytesPerSecond} - ${progressObj.percent}%',
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
        }
    });`)
})

autoUpdater.on('error', err => {
    log.log(`Update check failed: ${err.toString()}`)
})

autoUpdater.on('checking-not-available', info => {
    log.log("Update not available.")
    mainWindow.webContents.executeJavaScript(`Swal.fire({
        title: 'Updates',
        html: 'There are not updates available.',
        icon: 'error'
    });`)
})

autoUpdater.on('update-downlaoded', info => {
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