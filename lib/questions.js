'use strict';

module.exports = (app, store) => {
  const prompts = [
    {
      type: 'select',
      name: 'installer',
      message: 'What is your preferred installer?',
      choices: ['npm', { name: 'yarn', disabled: true }],
      skip() {
        return !!store.get('config.installer');
      },
      result(value) {
        store.set('config.installer', value);
        return value;
      }
    },
    {
      type: 'multiselect',
      name: 'install',
      message: 'Install missing packages',
      choices: [],
      format(...args) {
        let choices = this.choices.filter(ch => !!ch.parent && ch.enabled);
        let visible = choices.slice(0, 2);
        let line = visible.map(ch => this.styles.primary(ch.name)).join(', ');
        let diff = choices.length - 2;

        if (diff > 0) {
          line += ` and ${this.styles.strong(diff)} more` + this.symbols.ellipsis;
        }
        return line;
      },
      result() {
        let selected = this.selected;
        let res = {};
        for (let choice of selected) {
          if (choice.parent) {
            let parent = choice.parent;
            res[parent.name] = res[parent.name] || [];
            res[parent.name].push(choice.name);
          } else {
            res[choice.name] = res[choice.name] || [];
          }
        }
        return res;
      }
    },

    {
      type: 'confirm',
      name: 'unused',
      message: 'Want to remove unused packages?',
      initial: false
    }
  ];

  return prompts;
};
