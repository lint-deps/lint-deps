'use strict';

module.exports = (app, store) => {
  return [
    {
      type: 'select',
      name: 'installer',
      message: 'What is your preferred installer?',
      choices: ['npm', { name: 'yarn', disabled: true }],
      default: 'npm',
      skip() {
        return store.get('config.installer') == null;
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
      footer: '\n',
      format(...args) {
        const choices = this.choices.filter(ch => Boolean(ch.parent) && ch.enabled);
        const visible = choices.slice(0, 2);
        let line = visible.map(ch => this.styles.primary(ch.name)).join(', ');
        const diff = choices.length - 2;

        if (diff > 0) {
          line += ` and ${this.styles.strong(diff)} more` + this.symbols.ellipsis;
        }
        return line;
      },
      result() {
        const selected = this.selected;
        const res = {};
        for (const choice of selected) {
          if (choice.parent) {
            const parent = choice.parent;
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
      type: 'multiselect',
      name: 'unused',
      footer: '\n',
      message: 'You have unused packages, want to remove them?',
      result(value) {
        this.clear();
        return value;
      }
    }
  ];
};
