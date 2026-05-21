/**
 * Click Spark — Web Component
 * Original: https://github.com/hexagoncircle/click-spark
 * Adapted for Shopify themes (no-module, IIFE safe)
 */
(function () {
  if (customElements.get('click-spark')) return;

  class ClickSpark extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this.shadowRoot.innerHTML = this._createSpark();
      this.svg = this.shadowRoot.querySelector('svg');
      this._parent = this.parentNode;
      this._parent.addEventListener('click', this);
    }

    disconnectedCallback() {
      this._parent.removeEventListener('click', this);
      delete this._parent;
    }

    handleEvent(e) {
      this._setPosition(e);
      this._animate();
    }

    _animate() {
      const sparks = [...this.svg.children];
      const size = parseInt(sparks[0].getAttribute('y1'));
      const offset = size / 2 + 'px';

      const keyframes = (i) => {
        const deg = `calc(${i} * (360deg / ${sparks.length}))`;
        return [
          {
            strokeDashoffset: size * 3,
            transform: `rotate(${deg}) translateY(${offset})`,
          },
          {
            strokeDashoffset: size,
            transform: `rotate(${deg}) translateY(0)`,
          },
        ];
      };

      const options = {
        duration: 660,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      };

      sparks.forEach((spark, i) => spark.animate(keyframes(i), options));
    }

    _setPosition(e) {
      this.style.left = e.pageX - this.clientWidth / 2 + 'px';
      this.style.top = e.pageY - this.clientHeight / 2 + 'px';
    }

    _createSpark() {
      const count = parseInt(this.getAttribute('spark-count') || '8');
      const size = parseInt(this.getAttribute('spark-size') || '30');
      const color = this.getAttribute('spark-color') || 'var(--click-spark-color, currentcolor)';
      const lines = Array.from(
        { length: count },
        () =>
          `<line x1="50" y1="30" x2="50" y2="4" stroke-dasharray="30" stroke-dashoffset="30" style="transform-origin:center"/>`
      ).join('');

      return `
        <style>
          :host {
            position: absolute;
            pointer-events: none;
            z-index: 99999;
          }
        </style>
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none"
          stroke-linecap="round" stroke-linejoin="round" stroke-width="4"
          stroke="${color}" transform="rotate(-20)">
          ${lines}
        </svg>`;
    }
  }

  customElements.define('click-spark', ClickSpark);
})();
