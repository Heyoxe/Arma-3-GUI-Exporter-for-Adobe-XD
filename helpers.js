const APP = require("application");
const STORAGE = require('uxp').storage;
const FS = require('uxp').storage.localFileSystem;
const GUID = APP.activeDocument.guid;

class SettingsHelper {
    static async file(value = "{}") {
        const DATA = await FS.getDataFolder();
        const name = `${GUID}.json`;
        const files = await DATA.getEntries(name);
        let file;
        if (files.map(entry => entry.name).indexOf(name) === -1) {
            file = await DATA.createFile(name, { type: STORAGE.types.file });
            await file.write(value, { append: false });
        } else {
            file = await DATA.getEntry(name);
        };
        return file;      
    };

    static async getLocal(key, value = undefined) {
        const file = await this.file();
        const object = JSON.parse(await file.read());
        if ((object[key] === undefined) && (value !== undefined)) {
            await this.set(key, value);
            return value;
        } else {
            return object[key];
        };
    };

    static async setLocal(key, value) {
        const file = await this.file();
        const object = JSON.parse(await file.read());
        object[key] = value;
        return await file.write(JSON.stringify(object), { append: false });
    };

    static async getAll(value) {
        return (require("scenegraph").root.pluginData || value);
    };

    static async setAll(object) {
        require("scenegraph").root.pluginData = object;
    };
};

class StorageHelper {
    static async file(folder, file, data) {};
    static async read(file, data) {};
    static async write(file, data) {};
};

class NetworkHelper {
    static async verifyLicence(key) {
        console.log(key);
    };
};

module.exports.SettingsHelper = SettingsHelper;
module.exports.StorageHelper = StorageHelper;
module.exports.NetworkHelper = NetworkHelper;