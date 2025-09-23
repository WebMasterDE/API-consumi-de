import fs from 'fs';

module.exports = function (app: any) {
    fs.readdirSync(__dirname).forEach(function (file: any) {
        if (file.match("index.*")) return;
        const name = file.substr(0, file.indexOf('.'));
        require('./' + name)(app);
    });
}