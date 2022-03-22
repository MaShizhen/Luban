import { createSVGElement, setAttributes } from './element-utils';

class SVGSelector {
    private x: number = 0;

    private y: number = 0;

    private width: number = 0;

    private height: number = 0;

    private elem: SVGRectElement;


    constructor(contentGroup: SVGGElement) {
        this.elem = createSVGElement({
            element: 'rect',
            attr: {
                id: 'svg-selector',
                x: `${this.x}`,
                y: `${this.y}`,
                width: `${this.width}`,
                height: `${this.height}`,
                fill: 'red'
            }
        });
        contentGroup.append(this.elem);
    }

    private update(x: number, y: number) {
        if (x > this.x) {
            x = this.x;
            y = this.y;
        }
        this.width = Math.abs(x - this.x);
        this.height = Math.abs(y - this.y);
        setAttributes(this.elem, {
            x,
            y,
            width: this.width,
            height: this.height
        });
    }

    public reset(x: number, y: number) {
        this.y = x;
        this.y = y;
        this.width = 0;
        this.height = 0;
        this.update(0, 0);
    }
}

export default SVGSelector;
