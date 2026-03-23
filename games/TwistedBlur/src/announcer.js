export class AnnouncerSystem {
  constructor() {
    this.messages = [];
  }

  reset() {
    this.messages.length = 0;
  }

  push(text, options = {}) {
    const priority = options.priority ?? 1;
    const duration = options.duration ?? 2.1;
    this.messages.push({
      id: `${performance.now()}-${Math.random()}`,
      text,
      priority,
      duration,
      life: duration,
      color: options.color ?? "#f4f8ff",
      accent: options.accent ?? "#2ef0ff",
      subtext: options.subtext ?? "",
    });
    this.messages.sort((a, b) => b.priority - a.priority || a.life - b.life);
    if (this.messages.length > 5) {
      this.messages.length = 5;
    }
  }

  update(dt) {
    this.messages = this.messages.filter((message) => {
      message.life -= dt;
      return message.life > 0;
    });
  }

  getPrimary() {
    return this.messages[0] ?? null;
  }

  getSecondary() {
    return this.messages.slice(1, 3);
  }
}
