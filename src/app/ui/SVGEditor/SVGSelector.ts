import { createSVGElement, setAttributes } from './element-utils';

class SVGSelector {
    private x: number = 0;

    private y: number = 0;

    private width: number = 0;

    private height: number = 0;

    private elem: SVGRectElement;

    public scale: number;

    constructor(contentGroup: SVGGElement, scale:number) {
        this.scale = scale;
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
        this.width = Math.abs(x - this.x);
        this.height = Math.abs(y - this.y);

        setAttributes(this.elem, {
            x: Math.min(this.x, x),
            y: Math.min(this.y, y),
            width: this.width,
            height: this.height
        });
    }

    public reset(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.update(x, y);
    }

    public updateScale(scale:number) {
        this.scale = scale;
    }

    public setVisible(visible: boolean) {
        console.log(visible);

        // this.elem.setAttribute('visibility', visible ? 'visible' : 'hidden');
        this.elem.setAttribute('visibility', 'hidden');
        this.update(-1, -1);
    }
}

export default SVGSelector;
