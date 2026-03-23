export class DevPanel {
  constructor(root) {
    this.root = root;
    this.visible = false;
    this.onChange = null;
  }

  toggle() {
    this.visible = !this.visible;
    this.root.classList.toggle("hidden", !this.visible);
  }

  hide() {
    this.visible = false;
    this.root.classList.add("hidden");
  }

  render(model, tunables, onChange) {
    this.onChange = onChange;
    if (!this.visible) return;
    this.root.innerHTML = `
      <div><strong>Dev Panel</strong></div>
      <div>FPS: ${model.fps.toFixed(1)}</div>
      <div>Planet: ${model.planet} | Epoch: ${model.epoch}</div>
      <div>Alert: ${model.alert.toFixed(2)}</div>
      <div>P1 Pos: ${model.p1Pos}</div>
      <div>Entities: ${model.entities}</div>
      ${tunables
        .map(
          (item) => `
        <div class="dev-row">
          <label>${item.label}</label>
          <span>${item.value.toFixed(2)}</span>
        </div>
        <input class="dev-slider" type="range" min="${item.min}" max="${item.max}" step="${item.step}" value="${item.value}" data-key="${item.key}" />
      `
        )
        .join("")}
    `;
    for (const slider of this.root.querySelectorAll(".dev-slider")) {
      slider.addEventListener("input", () => {
        const key = slider.dataset.key;
        this.onChange?.(key, Number(slider.value));
      });
    }
  }
}
