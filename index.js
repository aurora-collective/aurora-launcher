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
var ipc = require('electron').ipcMain
var fs = require('fs')
var ps = require('ps-node')
var process = require('process')

let mainWindow = null
var disableAutoDetectionFiveM = false

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
        }
    })
}
ipc.on('preRequirementsCheck', preRequirementsCheck)

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
    clientConnect()
    setTimeout(function() { 
        isFiveMStillRunning()
    }, 30000)
}

function clientConnect() {
    shell.openExternal("fivem://connect/https://play.aurorav.net")
    mainWindow.hide()
    mainWindow.webContents.executeJavaScript('destroyEverything();')

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
                mainWindow.webContents.executeJavaScript(`player.playVideo();`)
            } else {
                setTimeout(function() { 
                    isFiveMStillRunning()
                }, 5000)
            }
        })
    }
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