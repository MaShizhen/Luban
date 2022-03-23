import { createSVGElement, setAttributes } from './element-utils';

const ThemeColor = '#1890ff';

type TBbox = {
    x: number,
    y: number,
    width: number,
    height: number
}

class SVGSelector {
    private x: number = 0;

    private y: number = 0;

    private width: number = 0;

    private height: number = 0;

    private elem: SVGRectElement;

    public scale: number;

    private onlyContainSelect: boolean;

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
                fill: ThemeColor,
                'fill-opacity': 0.2,
                stroke: ThemeColor,
            }
        });
        contentGroup.append(this.elem);
    }

    private update(x: number, y: number) {
        this.onlyContainSelect = x < this.x;

        this.width = Math.abs(x - this.x);
        this.height = Math.abs(y - this.y);

        setAttributes(this.elem, {
            x: Math.min(this.x, x),
            y: Math.min(this.y, y),
            width: this.width,
            height: this.height
        });
    }

    public reset(x, y) {
        this.elem.setAttribute('visibility', 'visible');

        this.x = x;
        this.y = y;
        this.update(x, y);
    }

    public updateScale(scale:number) {
        this.scale = scale;
    }

    public setVisible(visible: boolean) {
        let selectorBbox = null as TBbox;
        const current = this.elem.getAttribute('visibility');

        if (!visible && current === 'visible') {
            if (this.x !== 0) {
                const x = Number(this.elem.getAttribute('x'));
                const y = Number(this.elem.getAttribute('y'));
                const width = Number(this.elem.getAttribute('width'));
                const height = Number(this.elem.getAttribute('height'));
                if (width !== 0 && height !== 0) {
                    selectorBbox = {
                        x, y, width, height
                    };
                }
            }
        }
        this.elem.setAttribute('visibility', visible ? 'visible' : 'hidden');
        const onlyContainSelect = this.onlyContainSelect;
        if (!visible) {
            this.update(-1, -1);
        }
        return {
            selectorBbox,
            onlyContainSelect
        };
    }
}

export default SVGSelector;
