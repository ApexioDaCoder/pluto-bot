global.startTime = Date.now();
global.Utils = require('./Utils');
global.include = function (file) {
  return require(path.resolve('src/' + file));
};
global.Config = require('./Config');

const Magma = require('./Core');
global.Command = Magma.Command;

require('./Utils/Functions/Prototypes')();
require('./Utils/Functions/Console')();
require('./Utils/Functions/Sentry')();

const path = require('path');
const chalk = require('chalk');

const fs = require('fs');
const yaml = require('yaml');
const _ = require('lodash');
const onMessage = require('./Events/Message');
const database = require('./Database');
const Canvas = require('canvas');

const client = new Magma.Client({
  disableEvents : [
    'TYPING_START',
  ],
});

const boot = async () => {
  console.bootLog(chalk.cyanBright(`--------------------[${chalk.red('Magma')}]--------------------`));
  console.bootLog(`Starting ${chalk.red('Magma')} on ${chalk.cyanBright(process.env.NODE_ENV)} environment.`);
  console.bootLog(`Made by ${chalk.blueBright('ApexioDaCoder')}!`);
  console.bootLog(chalk.yellow('Loading commands from src/Commands...'));
  const dirs = fs.readdirSync(__dirname + '/Commands');
  await Promise.all(
    dirs.map(async dir => {
      let loaded = 0,
        skipped = 0;
      const files = fs.readdirSync(path.resolve('src', 'commands', `${dir}`)).filter(file => !file.endsWith('.yml'));
      const _category = yaml.parse(fs.readFileSync(`${__dirname}/Commands/${dir}/category.yml`, 'utf8'));
      const category = {
        fancy_name  : 'General',
        thumbnail   : 'https://i.imgur.com/OfVMmTm.png',
        permission  : 'user',
        name        : 'general',
        description : 'No description provided.',
        emoji       : '<:info:750110959548498041>',
        index       : 1,
        hidden      : false,
        ..._category,
      };
      const commands = [];
      await Promise.all(
        files.map(async cmdFile => {
          const _dir = path.resolve('src', 'commands', `${dir}`, `${cmdFile}`);
          const stats = fs.lstatSync(_dir);
          const hasSubs = stats.isDirectory();
          const cmdPath =
            hasSubs ? path.resolve('src', 'commands', `${dir}`, `${cmdFile}`, 'index.js') :
            _dir;
          const ImportedCmd = require(cmdPath);
          if (!ImportedCmd.prototype) {
            skipped += 1;
            console.warn(`${chalk.cyanBright(cmdPath)} does not export anything.`);
          }
          else {
            const cmd = new ImportedCmd(client, category);
            if (cmd.enabled) {
              cmd._dir = _dir;
              cmd.hasSubs = hasSubs;
              cmd.category = category.name;
              cmd.isSub = false;
              cmd.setup();
              client.commands.set(cmd.name.toLowerCase(), cmd);
              client.aliases.set(cmd.name.toLowerCase(), cmd.name.toLowerCase());
              cmd.aliases.forEach(alias => client.aliases.set(alias.toLowerCase(), cmd.name.toLowerCase()));
              commands.push(cmd.name);
              loaded += 1;
            }
            else skipped += 1;
          }
        }),
      );
      client.categories.set(category.name || 'general', {
        ...category,
        commands,
      });
      console.bootLog(
        `Loaded ${chalk.cyanBright(loaded)} command(s) and skipped ${chalk.cyanBright(
          skipped,
        )} command(s) in ${chalk.cyanBright(category.fancy_name)}.`,
      );
    }),
  );
  console.bootLog(chalk.yellow('Finished loading commands.'));
  Canvas.registerFont(process.cwd() + '/src/Assets/Fonts/manrope-regular.ttf', {
    family : 'Manrope',
    weight : 'regular',
    style  : 'normal',
  });
  Canvas.registerFont(process.cwd() + '/src/Assets/Fonts/manrope-bold.ttf', {
    family : 'Manrope',
    weight : 'bold',
    style  : 'normal',
  });
  await database.setup();
  client.login(Config.bot.token).catch(error => console.error(error));
  client.database = database;
};

boot();

client.once('ready', async () => {
  console.bootLog(
    `Connected to ${chalk.cyanBright(client.guilds.cache.size)} servers on ${chalk.cyanBright('Discord')}.`,
  );
});

// client.on('debug', m => console.debug(m));
client.on('warn', m => console.warn(m));
client.on('error', m => console.error(m));
client.on('message', msg => onMessage(msg));
